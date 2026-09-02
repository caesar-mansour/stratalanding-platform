import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

// GET — Fetch all mistakes with project + client info
export async function GET() {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mistakes = await sql`
      SELECT m.*,
             p.package,
             p.status as project_status,
             c.name as client_name,
             c.email as client_email,
             bs.company_name
      FROM mistakes m
      LEFT JOIN projects p ON p.id = m.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      ORDER BY
        CASE m.status
          WHEN 'open' THEN 0
          WHEN 'investigating' THEN 1
          WHEN 'fixed' THEN 2
          WHEN 'dismissed' THEN 3
        END,
        m.created_at DESC
    `;

    return NextResponse.json({ mistakes: mistakes || [] });
  } catch (error) {
    console.error('Admin mistakes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create a new mistake manually
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, description } = await request.json();

    if (!projectId || !description) {
      return NextResponse.json({ error: 'Project ID and description required' }, { status: 400 });
    }

    if (description.length > 5000) {
      return NextResponse.json({ error: 'Description too long (max 5,000 chars)' }, { status: 400 });
    }

    const [mistake] = await sql`
      INSERT INTO mistakes (project_id, description, source, status)
      VALUES (${projectId}, ${description}, 'admin', 'open')
      RETURNING *
    `;

    logAudit({ action: 'mistake.create', entityType: 'mistake', entityId: mistake.id, details: { projectId, description } });

    return NextResponse.json({ mistake }, { status: 201 });
  } catch (error) {
    console.error('Admin mistakes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update mistake status
export async function PATCH(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mistakeId, status } = await request.json();

    if (!mistakeId || !status) {
      return NextResponse.json({ error: 'mistakeId and status required' }, { status: 400 });
    }

    const validStatuses = ['open', 'investigating', 'fixed', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE mistakes SET status = ${status}, updated_at = NOW()
      WHERE id = ${mistakeId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: 'Mistake not found' }, { status: 404 });
    }

    logAudit({ action: 'mistake.update', entityType: 'mistake', entityId: mistakeId, details: { status } });

    return NextResponse.json({ mistake: updated });
  } catch (error) {
    console.error('Admin mistakes PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Delete a mistake
export async function DELETE(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mistakeId = searchParams.get('mistakeId');

    if (!mistakeId) {
      return NextResponse.json({ error: 'mistakeId required' }, { status: 400 });
    }

    await sql`DELETE FROM mistakes WHERE id = ${mistakeId}`;

    logAudit({ action: 'mistake.delete', entityType: 'mistake', entityId: mistakeId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin mistakes DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
