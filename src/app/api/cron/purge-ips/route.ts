import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { timingSafeCompare } from '@/lib/security/sanitize';

// SECURITY (audit F72): automated data-retention. Nulls analytics IPs older than 30 days (privacy)
// and prunes elapsed durable rate-limit windows (housekeeping for migration 047). Gated by
// CRON_SECRET, timing-safe, fail-closed — same pattern as the other cron endpoints.
// Schedule this in Netlify (e.g. daily) with: Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const events = await sql`
      UPDATE strata_events SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < ${thirtyDaysAgo}
    `;
    const sessions = await sql`
      UPDATE strata_sessions SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < ${thirtyDaysAgo}
    `;
    // Prune expired rate-limit windows (best-effort; table may not exist until migration 047 runs).
    let rateLimits = 0;
    try {
      const rl = await sql`DELETE FROM rate_limit_counters WHERE expires_at < now()`;
      rateLimits = rl.count;
    } catch { /* table not present yet — ignore */ }

    return NextResponse.json({
      ok: true,
      purged: { events: events.count, sessions: sessions.count, rateLimits },
    });
  } catch (error) {
    console.error('[cron/purge-ips] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
