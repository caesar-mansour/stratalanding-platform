import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { ProjectStatus } from '@/lib/types';
import { verifyAdmin } from '@/lib/admin-auth';

// POST - Bulk operations
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, ids, status, priority } = await request.json();

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Action and IDs array required' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Max 100 items per bulk operation' }, { status: 400 });
    }

    // Validate all IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!ids.every((id: unknown) => typeof id === 'string' && uuidRegex.test(id))) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    switch (action) {
      case 'update_project_status': {
        const validStatuses: ProjectStatus[] = [
          'new', 'proposal_sent', 'deposit_paid', 'in_production',
          'ready_for_final_payment', 'paid_in_full', 'launched', 'not_interested',
        ];
        if (!status || !validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
        }
        await sql`UPDATE projects SET status = ${status} WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.project_status', entityType: 'project', details: { ids, status } });
        break;
      }

      case 'update_task_status': {
        const validStatuses = ['pending', 'in_progress', 'completed'];
        if (!status || !validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
        }
        await sql`UPDATE tasks SET status = ${status} WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.task_status', entityType: 'task', details: { ids, status } });
        break;
      }

      case 'update_task_priority': {
        const validPriorities = ['low', 'normal', 'high'];
        if (!priority || !validPriorities.includes(priority)) {
          return NextResponse.json({ error: 'Valid priority required' }, { status: 400 });
        }
        await sql`UPDATE tasks SET priority = ${priority} WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.task_priority', entityType: 'task', details: { ids, priority } });
        break;
      }

      case 'update_mistake_status': {
        const validStatuses = ['open', 'investigating', 'fixed', 'dismissed'];
        if (!status || !validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
        }
        await sql`UPDATE mistakes SET status = ${status} WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.mistake_status', entityType: 'mistake', details: { ids, status } });
        break;
      }

      case 'delete_tasks': {
        await sql`DELETE FROM tasks WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.delete_tasks', entityType: 'task', details: { ids } });
        break;
      }

      case 'delete_mistakes': {
        await sql`DELETE FROM mistakes WHERE id = ANY(${ids})`;
        logAudit({ action: 'bulk.delete_mistakes', entityType: 'mistake', details: { ids } });
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
