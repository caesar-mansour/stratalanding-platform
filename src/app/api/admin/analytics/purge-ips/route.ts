import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const eventsResult = await sql`
      UPDATE strata_events SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < ${thirtyDaysAgo}
    `;

    const sessionsResult = await sql`
      UPDATE strata_sessions SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < ${thirtyDaysAgo}
    `;

    return NextResponse.json({
      success: true,
      purged: {
        events: eventsResult.count,
        sessions: sessionsResult.count,
      },
    });
  } catch (error) {
    console.error('[Analytics] IP purge error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
