import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

// GET - Export client data (GDPR compliance)
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientEmail = searchParams.get('email');

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email required' }, { status: 400 });
    }

    // Fetch all client data
    const [client] = await sql`SELECT * FROM clients WHERE email = ${clientEmail} LIMIT 1`;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const projects = await sql`
      SELECT p.*, bs.company_name, bs.industry, bs.primary_goal, bs.audience, bs.notes as brief_notes
      FROM projects p
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      WHERE p.client_id = ${client.id}
      ORDER BY p.created_at DESC
    `;

    const projectIds = projects.map((p) => p.id as string);

    let payments: Record<string, unknown>[] = [];
    let messages: Record<string, unknown>[] = [];
    let uploads: Record<string, unknown>[] = [];
    let proposals: Record<string, unknown>[] = [];

    if (projectIds.length > 0) {
      payments = [...await sql`SELECT * FROM payments WHERE project_id = ANY(${projectIds}) ORDER BY created_at DESC`];
      messages = [...await sql`SELECT id, project_id, sender_type, message, created_at FROM revision_messages WHERE project_id = ANY(${projectIds}) ORDER BY created_at ASC`];
      uploads = [...await sql`SELECT id, project_id, file_name, file_type, file_size, category, created_at FROM project_uploads WHERE project_id = ANY(${projectIds}) ORDER BY created_at DESC`];
      proposals = [...await sql`SELECT * FROM proposals WHERE client_email = ${clientEmail} ORDER BY created_at DESC`];
    }

    // Auth user data
    const [authUser] = await sql`SELECT id, email, name, email_verified, mfa_enabled, created_at FROM auth_users WHERE email = ${clientEmail} LIMIT 1`;

    const exportData = {
      exportedAt: new Date().toISOString(),
      client: { id: client.id, email: client.email, name: client.name, created_at: client.created_at },
      authAccount: authUser || null,
      projects: projects.map((p) => ({
        id: p.id,
        package: p.package,
        status: p.status,
        timeline: p.timeline,
        created_at: p.created_at,
        company_name: p.company_name,
        industry: p.industry,
        primary_goal: p.primary_goal,
        audience: p.audience,
        brief_notes: p.brief_notes,
      })),
      payments,
      messages,
      uploads,
      proposals: proposals.map((p) => ({
        id: p.id,
        package: p.package,
        status: p.status,
        notes: p.notes,
        valid_until: p.valid_until,
        created_at: p.created_at,
        accepted_at: p.accepted_at,
      })),
    };

    logAudit({ action: 'export.client_data', entityType: 'client', entityId: client.id, details: { email: clientEmail } });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="client-data-${clientEmail.replace('@', '_at_')}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting client data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
