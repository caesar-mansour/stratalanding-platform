import { NextRequest, NextResponse } from 'next/server';
import { revertLastRevisionRound, getRevisionStatus } from '@/lib/ai-chat';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

const REVISION_MARKER = '\u{1F4CB} Revision Round';

// POST — Revert or give a revision round for a project
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, action } = await request.json();

    if (!projectId || !action) {
      return NextResponse.json({ error: 'projectId and action required' }, { status: 400 });
    }

    if (action !== 'revert' && action !== 'give') {
      return NextResponse.json({ error: 'action must be "revert" or "give"' }, { status: 400 });
    }

    // Get project to determine package type
    const [project] = await sql`
      SELECT id, package FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (action === 'revert') {
      const reverted = await revertLastRevisionRound(projectId);
      if (!reverted) {
        return NextResponse.json({ error: 'No revision round to revert' }, { status: 404 });
      }
    } else {
      // Give — insert a new revision round marker
      const currentStatus = await getRevisionStatus(projectId, project.package);
      const roundNumber = currentStatus.used + 1;

      await sql`
        INSERT INTO revision_messages (project_id, sender_type, message)
        VALUES (${projectId}, 'client', ${`${REVISION_MARKER} ${roundNumber} Granted\nManually added by admin.`})
      `;
    }

    // Return updated revision count
    const updatedStatus = await getRevisionStatus(projectId, project.package);

    logAudit({ action: `revision.${action}`, entityType: 'project', entityId: projectId, details: { action, used: updatedStatus.used, limit: updatedStatus.limit } });

    return NextResponse.json({
      success: true,
      used: updatedStatus.used,
      limit: updatedStatus.limit,
      hasRevisionsLeft: updatedStatus.hasRevisionsLeft,
    });
  } catch (error) {
    console.error('Admin revisions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
