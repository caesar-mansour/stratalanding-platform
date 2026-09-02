import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

// PATCH - Update admin notes for a project
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, notes } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
    }

    if (notes.length > 10000) {
      return NextResponse.json({ error: 'Notes too long (max 10,000 chars)' }, { status: 400 });
    }

    await sql`
      UPDATE projects SET admin_notes = ${notes}
      WHERE id = ${projectId}
    `;

    logAudit({ action: 'notes.update', entityType: 'project', entityId: projectId, details: { notesLength: notes.length } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
