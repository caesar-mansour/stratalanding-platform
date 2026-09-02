import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';

// GET — Fetch all tasks with project + client info
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await sql`
      SELECT t.*,
        p.package as project_package,
        p.status as project_status,
        c.name as client_name,
        c.email as client_email,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
      FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      INNER JOIN clients c ON c.id = p.client_id
      ORDER BY
        CASE t.status
          WHEN 'pending' THEN 0
          WHEN 'in_progress' THEN 1
          WHEN 'completed' THEN 2
        END,
        CASE t.priority
          WHEN 'high' THEN 0
          WHEN 'normal' THEN 1
          WHEN 'low' THEN 2
        END,
        t.created_at DESC
    `;
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Admin tasks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Create a new task manually
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, title, description, priority } = await request.json();

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Project ID and title required' }, { status: 400 });
    }

    if (title.length > 500) {
      return NextResponse.json({ error: 'Title too long (max 500 chars)' }, { status: 400 });
    }

    const [task] = await sql`
      INSERT INTO tasks (project_id, title, description, priority, source, status)
      VALUES (${projectId}, ${title}, ${description || ''}, ${priority || 'normal'}, 'admin', 'pending')
      RETURNING *
    `;

    logAudit({ action: 'task.create', entityType: 'task', entityId: task.id, details: { projectId, title, priority: priority || 'normal' } });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Admin tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update task status or priority
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, ...updates } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Validate status
    if (updates.status && !['pending', 'in_progress', 'completed'].includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate priority
    if (updates.priority && !['low', 'normal', 'high'].includes(updates.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // SECURITY (audit F45): block mass-assignment of immutable/ownership columns.
    const BLOCKED = new Set(['id', 'project_id', 'created_at']);
    const cols = Object.keys(updates).filter((k) => !BLOCKED.has(k));
    if (cols.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    await sql`
      UPDATE tasks
      SET ${sql(updates, cols)}
      WHERE id = ${taskId}
    `;

    logAudit({ action: 'task.update', entityType: 'task', entityId: taskId, details: updates });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin tasks PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Delete a task
export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    await sql`DELETE FROM tasks WHERE id = ${taskId}`;

    logAudit({ action: 'task.delete', entityType: 'task', entityId: taskId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin tasks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
