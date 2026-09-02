import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

// GET - List all banned emails
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await sql`
      SELECT * FROM banned_emails ORDER BY created_at DESC
    `;

    return NextResponse.json({ emails: data });
  } catch (error) {
    console.error('Admin banned emails error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Ban an email and delete client record
export async function POST(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, reason } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already banned
    const [existing] = await sql`
      SELECT id FROM banned_emails WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (existing) {
      return NextResponse.json({ error: 'Email already banned' }, { status: 400 });
    }

    // Find the client record
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (client) {
      // Get all projects for this client
      const projects = await sql`
        SELECT id FROM projects WHERE client_id = ${client.id}
      `;

      const projectIds = projects.map((p: Record<string, unknown>) => p.id as string);

      if (projectIds.length > 0) {
        // Delete related data in correct order (respecting foreign keys)
        // 1. Delete payments
        await sql`
          DELETE FROM payments WHERE project_id = ANY(${projectIds})
        `;

        // 2. Delete brief submissions
        await sql`
          DELETE FROM brief_submissions WHERE project_id = ANY(${projectIds})
        `;

        // 3. Delete project uploads
        await sql`
          DELETE FROM project_uploads WHERE project_id = ANY(${projectIds})
        `;

        // 4. Update proposals to remove project reference
        await sql`
          UPDATE proposals SET project_id = NULL WHERE project_id = ANY(${projectIds})
        `;

        // 5. Delete projects
        await sql`
          DELETE FROM projects WHERE client_id = ${client.id}
        `;
      }

      // 6. Delete the client
      await sql`
        DELETE FROM clients WHERE id = ${client.id}
      `;
    }

    // Add to banned emails list
    try {
      await sql`
        INSERT INTO banned_emails (email, reason)
        VALUES (${normalizedEmail}, ${reason || 'Banned by admin'})
      `;
    } catch (insertError) {
      console.error('Failed to ban email:', insertError);
      return NextResponse.json({ error: 'Failed to ban email' }, { status: 500 });
    }

    logAudit({ action: 'email.ban', entityType: 'banned_email', details: { email: normalizedEmail, reason: reason || 'Banned by admin', clientDeleted: !!client } });

    return NextResponse.json({ success: true, clientDeleted: !!client });
  } catch (error) {
    console.error('Admin ban error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unban an email
export async function DELETE(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await sql`
      DELETE FROM banned_emails WHERE email = ${email.toLowerCase()}
    `;

    logAudit({ action: 'email.unban', entityType: 'banned_email', details: { email: email.toLowerCase() } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin unban error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
