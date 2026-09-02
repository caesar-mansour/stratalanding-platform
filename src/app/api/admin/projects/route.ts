import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import type { ProjectStatus } from '@/lib/types';
import { sendStatusChangeEmail } from '@/lib/email';
import { logAudit } from '@/lib/audit';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - List all projects with client info, or get single project
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;
    const search = (searchParams.get('search') || '').replace(/[%_\\]/g, '\\$&');
    const status = searchParams.get('status') || '';

    if (projectId) {
      // Single project with full details
      const [project] = await sql`
        SELECT p.*,
          row_to_json(c.*) as client,
          (SELECT row_to_json(bs.*) FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as brief,
          (SELECT COUNT(*) FROM revision_messages rm WHERE rm.project_id = p.id)::int as message_count,
          (SELECT COUNT(*) FROM payments pay WHERE pay.project_id = p.id)::int as payment_count,
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id)::int as task_count
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE p.id = ${projectId}
        LIMIT 1
      `;

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({ project });
    }

    // List projects with pagination and optional filters
    let projects;
    let total;

    if (search) {
      projects = await sql`
        SELECT p.id, p.status, p.package, p.created_at, p.admin_notes,
          c.name as client_name, c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE (c.name ILIKE ${'%' + search + '%'} OR c.email ILIKE ${'%' + search + '%'}
          OR EXISTS (SELECT 1 FROM brief_submissions bs WHERE bs.project_id = p.id AND bs.company_name ILIKE ${'%' + search + '%'}))
        ${status ? sql`AND p.status = ${status}` : sql``}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`
        SELECT COUNT(*) FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE (c.name ILIKE ${'%' + search + '%'} OR c.email ILIKE ${'%' + search + '%'}
          OR EXISTS (SELECT 1 FROM brief_submissions bs WHERE bs.project_id = p.id AND bs.company_name ILIKE ${'%' + search + '%'}))
        ${status ? sql`AND p.status = ${status}` : sql``}
      `;
      total = parseInt(count);
    } else if (status) {
      projects = await sql`
        SELECT p.id, p.status, p.package, p.created_at, p.admin_notes,
          c.name as client_name, c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE p.status = ${status}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM projects WHERE status = ${status}`;
      total = parseInt(count);
    } else {
      projects = await sql`
        SELECT p.id, p.status, p.package, p.created_at, p.admin_notes,
          c.name as client_name, c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM projects`;
      total = parseInt(count);
    }

    return NextResponse.json({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Admin projects GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, ...updates } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses: ProjectStatus[] = [
      'new',
      'proposal_sent',
      'deposit_paid',
      'in_production',
      'ready_for_final_payment',
      'paid_in_full',
      'launched',
      'not_interested',
    ];

    if (updates.status && !validStatuses.includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate URLs if provided
    if (updates.deposit_payment_url && !isValidUrl(updates.deposit_payment_url)) {
      return NextResponse.json({ error: 'Invalid deposit payment URL' }, { status: 400 });
    }

    if (updates.final_payment_url && !isValidUrl(updates.final_payment_url)) {
      return NextResponse.json({ error: 'Invalid final payment URL' }, { status: 400 });
    }

    if (updates.preview_url && !isValidUrl(updates.preview_url)) {
      return NextResponse.json({ error: 'Invalid preview URL' }, { status: 400 });
    }

    // Get current project status before updating (to detect status changes)
    const [currentProject] = await sql`
      SELECT p.status, p.preview_url, p.final_payment_url, p.package, c.name as client_name, c.email as client_email,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;

    // Auto-set launched_at when status changes to 'launched'
    if (updates.status === 'launched' && currentProject?.status !== 'launched') {
      updates.launched_at = new Date().toISOString();
    }

    // SECURITY (audit F45): block mass-assignment of immutable/ownership columns.
    const BLOCKED = new Set(['id', 'client_id', 'site_id', 'created_at']);
    const cols = Object.keys(updates).filter((k) => !BLOCKED.has(k));
    if (cols.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    await sql`
      UPDATE projects
      SET ${sql(updates, cols)}
      WHERE id = ${projectId}
    `;

    // Send email notification if status changed
    if (updates.status && currentProject && updates.status !== currentProject.status) {
      sendStatusChangeEmail({
        clientName: currentProject.client_name || 'there',
        clientEmail: currentProject.client_email,
        companyName: currentProject.company_name || 'your project',
        newStatus: updates.status,
        previewUrl: updates.preview_url || currentProject.preview_url,
        finalPaymentUrl: updates.final_payment_url || currentProject.final_payment_url,
        packageType: currentProject.package || undefined,
      }).catch(err => console.error('Status email failed (non-blocking):', err));
    }

    // Audit log
    logAudit({
      action: 'project.update',
      entityType: 'project',
      entityId: projectId,
      details: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const deleteAccount = searchParams.get('deleteAccount') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get client info before deleting the project
    const [project] = await sql`SELECT client_id FROM projects WHERE id = ${projectId}`;
    const clientId = project?.client_id;

    // AUDIT 2026-08-12 (P1 F-01): refuse to delete a project that has financial records.
    // `payments.project_id` was ON DELETE CASCADE and this route relied on it, so deleting a
    // project silently destroyed every payment row — captured amount, PayPal capture id, currency,
    // timestamp. That is the only proof money was received: needed for accounting, for tax, and to
    // defend a PayPal dispute, which can be filed up to 180 days later. Migration 057 changes the
    // constraint to RESTRICT; this check turns the resulting DB error into a clear explanation.
    const [{ count: paymentCount }] = await sql`
      SELECT COUNT(*)::int AS count FROM payments WHERE project_id = ${projectId}
    `;
    if (paymentCount > 0) {
      return NextResponse.json(
        {
          error: `This project has ${paymentCount} payment record(s) and cannot be deleted. Financial records must be preserved for accounting and PayPal dispute defence. Archive the project instead.`,
          paymentCount,
        },
        { status: 409 },
      );
    }

    // Delete related records that don't have ON DELETE CASCADE
    await sql`DELETE FROM proposals WHERE project_id = ${projectId}`;
    await sql`DELETE FROM scheduled_proposals WHERE project_id = ${projectId}`;

    // Now delete the project (brief_submissions, uploads, messages cascade automatically).
    // Payments/refunds do NOT cascade any more — the guard above guarantees there are none.
    await sql`DELETE FROM projects WHERE id = ${projectId}`;

    logAudit({ action: 'project.delete', entityType: 'project', entityId: projectId });

    // If deleteAccount requested, clean up client and auth_users if no other projects remain
    if (deleteAccount && clientId) {
      const [remaining] = await sql`SELECT COUNT(*)::int as count FROM projects WHERE client_id = ${clientId}`;
      if (remaining.count === 0) {
        // Get client email to find auth_user
        const [client] = await sql`SELECT email FROM clients WHERE id = ${clientId}`;

        // Delete client record (projects already gone)
        await sql`DELETE FROM clients WHERE id = ${clientId}`;

        // Delete auth_user (sessions, verifications, mfa, password resets cascade automatically)
        if (client?.email) {
          await sql`DELETE FROM auth_users WHERE email = ${client.email}`;
          logAudit({ action: 'account.delete', entityType: 'auth_user', details: { email: client.email, reason: 'admin_project_delete' } });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isValidUrl(string: string): boolean {
  if (!string) return true; // Empty is valid (clearing the field)
  try {
    const u = new URL(string);
    // SECURITY (audit F82): only http/https — block javascript:/data:/etc., which would
    // become stored XSS when these URLs are rendered as <a href> in client emails.
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
