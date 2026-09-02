import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import type { PackageType } from '@/lib/types';
import { withProtection } from '@/lib/security/with-protection';

// SECURITY (audit L-proposals-auth): guarded only by the unguessable proposal UUID (+ a non-secret
// email match for unauthenticated callers) with NO rate limit — add a per-IP durable cap + the
// CSRF/Origin guard so a leaked proposal link can't be replayed to forge acceptances at volume.
export const POST = withProtection(postHandler, { name: 'proposal-accept', rateLimit: { max: 10, windowSeconds: 3600 } });

// POST - Accept proposal and create client/project
async function postHandler(
  request: Request,
  ctx: { params?: Promise<Record<string, string>> }
) {
  const proposalId = (await ctx.params)?.id ?? '';

  try {
    // Get proposal
    const [proposal] = await sql`
      SELECT * FROM proposals WHERE id = ${proposalId} LIMIT 1
    `;

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (proposal.status === 'accepted') {
      return NextResponse.json(
        { error: 'Proposal already accepted' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(proposal.valid_until) < new Date()) {
      return NextResponse.json(
        { error: 'Proposal has expired' },
        { status: 400 }
      );
    }

    // === OWNERSHIP CHECK ===
    // Verify the requester is the intended recipient:
    // 1. Authenticated user with matching email, OR
    // 2. Email provided in request body matches proposal
    let verified = false;

    // Try JWT auth first
    try {
      const { user } = await getServerUser();
      if (user?.email?.toLowerCase() === proposal.client_email.toLowerCase()) {
        verified = true;
      }
    } catch {
      // Not logged in — fall through to email check
    }

    // If not authenticated, require email in body
    if (!verified) {
      let body: { email?: string } = {};
      try {
        body = await request.json();
      } catch {
        // No body provided
      }

      if (!body.email) {
        return NextResponse.json(
          { error: 'Authentication required. Please provide your email to accept this proposal.' },
          { status: 401 }
        );
      }

      if (body.email.toLowerCase() !== proposal.client_email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email does not match the proposal recipient' },
          { status: 403 }
        );
      }

      verified = true;
    }

    // If proposal is already linked to a project (automated flow from brief submission),
    // just mark it as accepted without creating duplicate records
    if (proposal.project_id) {
      await sql`
        UPDATE proposals
        SET status = 'accepted', accepted_at = ${new Date().toISOString()}
        WHERE id = ${proposalId}
      `;

      return NextResponse.json({
        success: true,
        projectId: proposal.project_id,
        message: 'Proposal accepted successfully',
      });
    }

    // Manual flow fallback: create client and project for proposals created outside the brief flow
    let clientId: string;

    // Check if client already exists
    const [existingClient] = await sql`
      SELECT id FROM clients WHERE email = ${proposal.client_email} LIMIT 1
    `;

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create new client
      const [newClient] = await sql`
        INSERT INTO clients (email, name)
        VALUES (${proposal.client_email}, ${proposal.client_name})
        RETURNING *
      `;

      if (!newClient) {
        console.error('Failed to create client');
        return NextResponse.json(
          { error: 'Failed to create client' },
          { status: 500 }
        );
      }

      clientId = newClient.id;
    }

    // Create project
    const siteId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const [project] = await sql`
      INSERT INTO projects (client_id, package, timeline, status, deposit_payment_url, site_id)
      VALUES (
        ${clientId},
        ${proposal.package as PackageType},
        'this_month',
        'proposal_sent',
        ${proposal.deposit_payment_url},
        ${siteId}
      )
      RETURNING *
    `;

    if (!project) {
      console.error('Failed to create project');
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // Create brief submission with company name
    await sql`
      INSERT INTO brief_submissions (project_id, company_name, industry, primary_goal, audience)
      VALUES (
        ${project.id},
        ${proposal.company_name},
        'To be determined',
        'To be determined',
        'To be determined'
      )
    `;

    // Update proposal as accepted
    await sql`
      UPDATE proposals
      SET status = 'accepted', accepted_at = ${new Date().toISOString()}, project_id = ${project.id}
      WHERE id = ${proposalId}
    `;

    return NextResponse.json({
      success: true,
      projectId: project.id,
      clientId,
      message: 'Proposal accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting proposal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
