import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';
import type { MilestoneType } from '@/lib/types';

const ALL_MILESTONES: { type: MilestoneType; requires_approval: boolean }[] = [
  { type: 'brief_received', requires_approval: false },
  { type: 'research_complete', requires_approval: false },
  { type: 'wireframe_sent', requires_approval: false },
  { type: 'wireframe_approved', requires_approval: true },
  { type: 'build_complete', requires_approval: false },
  { type: 'final_review_sent', requires_approval: false },
  { type: 'final_review_approved', requires_approval: true },
  { type: 'launched', requires_approval: false },
];

// GET - Get milestones for a project
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const milestones = await sql`
      SELECT * FROM project_milestones
      WHERE project_id = ${projectId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Admin milestones GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Initialize milestones for a project or complete a specific milestone
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, action } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (action === 'initialize') {
      // Create all milestones for the project
      const existing = await sql`
        SELECT id FROM project_milestones WHERE project_id = ${projectId} LIMIT 1
      `;

      if (existing.length > 0) {
        return NextResponse.json({ error: 'Milestones already initialized' }, { status: 400 });
      }

      for (const m of ALL_MILESTONES) {
        await sql`
          INSERT INTO project_milestones (project_id, milestone_type, requires_approval)
          VALUES (${projectId}, ${m.type}, ${m.requires_approval})
        `;
      }

      const milestones = await sql`
        SELECT * FROM project_milestones
        WHERE project_id = ${projectId}
        ORDER BY created_at ASC
      `;

      logAudit({ action: 'milestones.initialize', entityType: 'project', entityId: projectId });
      return NextResponse.json({ milestones }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin milestones POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a milestone (mark complete, add notes, etc.)
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { milestoneId, status, notes } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const cols = Object.keys(updates);
    const [milestone] = await sql`
      UPDATE project_milestones
      SET ${sql(updates, cols)}
      WHERE id = ${milestoneId}
      RETURNING *
    `;

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    logAudit({ action: 'milestone.update', entityType: 'milestone', entityId: milestoneId, details: updates });
    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('Admin milestones PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
