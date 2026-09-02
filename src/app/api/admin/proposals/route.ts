import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendProposalToClient } from '@/lib/email';
import { packagePricing, type PackageType } from '@/lib/types';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';
import { PROPOSAL_UUID_RE } from '@/lib/proposal-payment';

// GET - List all proposals with pagination and filtering
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    let proposals;
    let total;

    if (status) {
      proposals = await sql`
        SELECT p.*, pr.id as linked_project_id, pr.status as project_status
        FROM proposals p
        LEFT JOIN projects pr ON pr.id = p.project_id
        WHERE p.status = ${status}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM proposals WHERE status = ${status}`;
      total = parseInt(count);
    } else {
      proposals = await sql`
        SELECT p.*, pr.id as linked_project_id, pr.status as project_status
        FROM proposals p
        LEFT JOIN projects pr ON pr.id = p.project_id
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM proposals`;
      total = parseInt(count);
    }

    return NextResponse.json({
      proposals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin proposals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new proposal
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      client_name,
      client_email,
      company_name,
      package: packageType,
      custom_price_cents,
      notes,
      proposal_sections,
      valid_days,
      deposit_payment_url,
      project_id,
    } = body;

    // Validate required fields
    if (!client_name || !client_email || !company_name || !packageType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ── GATE 8 (2026-08-12): manual proposals were created with project_id NULL ──────────────
    // Both create-payment and capture-payment refuse to act on a proposal with no linked project
    // ("No project linked to this proposal", HTTP 400) — verified against the deployed preview.
    // This endpoint never accepted the field and the form never sent one, so every hand-built
    // proposal was unpayable. proposal-generator.ts and cron/send-proposals already set it.
    //
    // The link is resolved here, server-side, and never trusted from the UI alone.
    const normalizedEmail = String(client_email).toLowerCase();
    // A deposit can only still be collected on a project that has not yet paid one. Anything at
    // 'deposit_paid' or beyond is deliberately excluded so a new proposal cannot be attached to an
    // already-paid engagement.
    const ELIGIBLE_STATUSES = ['new', 'proposal_sent'];
    let resolvedProjectId: string;

    if (project_id) {
      if (!PROPOSAL_UUID_RE.test(String(project_id))) {
        return NextResponse.json({ error: 'project_id is not a valid identifier' }, { status: 400 });
      }
      const [owned] = await sql<{ id: string; email: string; status: string }[]>`
        SELECT p.id, c.email, p.status
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        WHERE p.id = ${project_id}
        LIMIT 1
      `;
      if (!owned) {
        return NextResponse.json({ error: 'Project not found' }, { status: 400 });
      }
      // Never let an admin attach one client's project to another client's proposal.
      if (String(owned.email).toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: 'That project belongs to a different client' },
          { status: 403 }
        );
      }
      resolvedProjectId = owned.id;
    } else {
      // Fallback: resolve from client identity, but ONLY when the answer is unambiguous.
      // Deliberately not `ORDER BY ... LIMIT 1` — silently picking one of several projects would
      // attach a deposit to the wrong engagement, which is exactly the class of bug this fixes.
      const candidates = await sql<{ id: string }[]>`
        SELECT p.id
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        WHERE lower(c.email) = ${normalizedEmail}
          AND p.status = ANY(${ELIGIBLE_STATUSES})
      `;
      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'No eligible project found for this client. Create the project first, or pass project_id.' },
          { status: 400 }
        );
      }
      if (candidates.length > 1) {
        return NextResponse.json(
          {
            error: 'This client has more than one eligible project — choose one explicitly.',
            candidates: candidates.map((c) => c.id),
          },
          { status: 409 }
        );
      }
      resolvedProjectId = candidates[0].id;
    }

    // Calculate valid_until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (valid_days || 7));

    const sectionsJson = proposal_sections ? JSON.stringify(proposal_sections) : null;

    const [proposal] = await sql`
      INSERT INTO proposals (
        client_name, client_email, company_name, package,
        custom_price_cents, notes, proposal_sections, valid_until, deposit_payment_url, status,
        project_id
      ) VALUES (
        ${client_name}, ${client_email}, ${company_name}, ${packageType},
        ${custom_price_cents || null}, ${notes || null}, ${sectionsJson}::jsonb, ${validUntil.toISOString()},
        ${deposit_payment_url || null}, 'sent',
        ${resolvedProjectId}
      ) RETURNING *
    `;

    // Mirrors cron/send-proposals: capture-payment only advances a project whose status is
    // 'proposal_sent', so a manual proposal must move the project out of 'new' the same way the
    // automated path does. Guarded on 'new' so it can never regress a further-along project.
    await sql`
      UPDATE projects SET status = 'proposal_sent'
      WHERE id = ${resolvedProjectId} AND status = 'new'
    `;

    if (!proposal) {
      console.error('Failed to create proposal');
      return NextResponse.json(
        { error: 'Failed to create proposal' },
        { status: 500 }
      );
    }

    // Find client by email and update their project status to "proposal_sent"
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${client_email} LIMIT 1
    `;

    if (client) {
      // Update all projects for this client with status "new" to "proposal_sent"
      await sql`
        UPDATE projects SET status = 'proposal_sent'
        WHERE client_id = ${client.id} AND status = 'new'
      `;

      console.log('Updated project status to proposal_sent'); // audit F65: no PII in logs
    }

    // Calculate pricing for email
    const totalPrice = custom_price_cents
      ? custom_price_cents / 100
      : packagePricing[packageType as PackageType] / 100;
    const depositAmount = totalPrice / 2;

    // Send email to client
    const emailResult = await sendProposalToClient({
      clientName: client_name,
      clientEmail: client_email,
      companyName: company_name,
      packageType,
      totalPrice,
      depositAmount,
      proposalId: proposal.id,
      validUntil: validUntil.toISOString(),
      notes,
      depositPaymentUrl: deposit_payment_url,
    });

    if (emailResult.success) {
      console.log('Proposal email sent successfully'); // audit F65: no PII in logs
    } else {
      console.log('Proposal email failed:', emailResult.error);
    }

    logAudit({ action: 'proposal.create', entityType: 'proposal', entityId: proposal.id, details: { client_email, packageType, company_name } });

    return NextResponse.json({ proposal, emailSent: emailResult.success }, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update proposal
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { proposalId, ...updates } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    // SECURITY (audit F45): block mass-assignment of immutable/ownership columns.
    const BLOCKED = new Set(['id', 'project_id', 'client_email', 'created_at', 'accepted_at', 'viewed_at']);
    const cols = Object.keys(updates).filter((k) => !BLOCKED.has(k));
    if (cols.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const [proposal] = await sql`
      UPDATE proposals
      SET ${sql(updates, cols)}
      WHERE id = ${proposalId}
      RETURNING *
    `;

    if (!proposal) {
      console.error('Failed to update proposal');
      return NextResponse.json(
        { error: 'Failed to update proposal' },
        { status: 500 }
      );
    }

    logAudit({ action: 'proposal.update', entityType: 'proposal', entityId: proposalId, details: updates });

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete proposal
export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('id');

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    // First, get the proposal to find the client email
    const [proposal] = await sql`
      SELECT client_email FROM proposals WHERE id = ${proposalId} LIMIT 1
    `;

    await sql`DELETE FROM proposals WHERE id = ${proposalId}`;

    logAudit({ action: 'proposal.delete', entityType: 'proposal', entityId: proposalId });

    // If we found the proposal, update the project status back to "new"
    if (proposal?.client_email) {
      // Find client by email
      const [client] = await sql`
        SELECT id FROM clients WHERE email = ${proposal.client_email} LIMIT 1
      `;

      if (client) {
        // Check if there are any other proposals for this client
        const otherProposals = await sql`
          SELECT id FROM proposals WHERE client_email = ${proposal.client_email} LIMIT 1
        `;

        // Only revert status if no other proposals exist for this client
        if (!otherProposals || otherProposals.length === 0) {
          await sql`
            UPDATE projects SET status = 'new'
            WHERE client_id = ${client.id} AND status = 'proposal_sent'
          `;

          console.log('Reverted project status to new'); // audit F65: no PII in logs
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
