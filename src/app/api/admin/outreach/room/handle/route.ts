import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Mark one or more events as handled.
 * Body: { event_ids: string[] } — array of outreach_events.id to mark.
 * Event disappears from the Decision Room once handled.
 * Still visible in Inbox + Prospect drawer (history is preserved).
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids: unknown = body?.event_ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'event_ids required' }, { status: 400 });
    }
    const valid = ids.filter((x): x is string => typeof x === 'string');
    if (valid.length === 0) {
      return NextResponse.json({ error: 'no valid ids' }, { status: 400 });
    }
    const res = await sql`
      UPDATE outreach_events
      SET handled_at = now(), handled_by = 'admin'
      WHERE id = ANY(${valid}::uuid[])
        AND handled_at IS NULL
      RETURNING id
    `;
    return NextResponse.json({ ok: true, handled: res.length });
  } catch (err) {
    console.error('[room/handle] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Unhandle — puts the item back in the Decision Room. Useful for "oops" recovery.
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.event_ids) ? body.event_ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    if (ids.length === 0) return NextResponse.json({ error: 'event_ids required' }, { status: 400 });
    const res = await sql`
      UPDATE outreach_events
      SET handled_at = NULL, handled_by = NULL
      WHERE id = ANY(${ids}::uuid[])
      RETURNING id
    `;
    return NextResponse.json({ ok: true, unhandled: res.length });
  } catch (err) {
    console.error('[room/handle DELETE] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
