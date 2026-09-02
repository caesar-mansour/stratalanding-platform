import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

// GET — full engagement timeline for one preview link (admin only). Powers the details
// drawer in the Phone Leads dashboard: every open / scroll / view-site / dwell / leave.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const events = await sql`
      SELECT kind, surface, scroll_pct, seconds, stage, label, created_at
      FROM preview_events
      WHERE link_id = ${id}
      ORDER BY created_at ASC
      LIMIT 1000
    `;
    return NextResponse.json({ events });
  } catch (error) {
    console.error('preview-links events GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
