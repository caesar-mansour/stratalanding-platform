import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getDashboardPayload } from '@/lib/outreach/dashboard-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Full dashboard payload — drives the live-polling refresh on the Today page.
 * Logic in `lib/outreach/dashboard-data.ts` so SSR and the client poll share
 * the exact same shape.
 */
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const payload = await getDashboardPayload();
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[dashboard] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
