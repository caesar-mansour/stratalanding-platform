import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getRoomPayload } from '@/lib/outreach/room-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Decision Room payload — one call, everything the morning ritual needs.
 * Logic lives in `lib/outreach/room-data.ts` so the page itself can SSR
 * with the same payload on first paint.
 */
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const payload = await getRoomPayload();
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[room] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
