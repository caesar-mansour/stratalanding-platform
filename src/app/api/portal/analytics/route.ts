import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth-server';
import sql from '@/lib/db';
import type { StrataEvent, StrataSession } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // SECURITY (audit H1): getServerUser validates the session row (revocation), expiry, and the
    // authoritative AAL — enforcing MFA step-up on this data route, not just the page middleware.
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;

    // Get client's project and site_id
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${email} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id, site_id FROM projects
      WHERE client_id = ${client.id} AND site_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!project || !project.site_id) {
      return NextResponse.json({ events: [], sessions: [], liveVisitors: 0 });
    }

    const siteId = project.site_id as string;

    // Parse date range
    const range = request.nextUrl.searchParams.get('range') || '7d';
    const now = new Date();

    let startDate: Date;
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startISO = startDate.toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [eventsResult, sessionsResult, liveResult] = await Promise.all([
      sql`
        SELECT * FROM strata_events
        WHERE site_id = ${siteId} AND created_at >= ${startISO}
        ORDER BY created_at ASC
      `,
      sql`
        SELECT * FROM strata_sessions
        WHERE site_id = ${siteId} AND started_at >= ${startISO}
        ORDER BY started_at ASC
      `,
      sql`
        SELECT COUNT(*)::int as count FROM strata_sessions
        WHERE site_id = ${siteId} AND last_seen_at >= ${fiveMinAgo}
      `,
    ]);

    // Serialize Date objects to ISO strings for JSON response
    const toStr = (v: unknown) => v instanceof Date ? v.toISOString() : String(v);

    // SECURITY (audit F54): never return raw visitor IPs to the client — that ships
    // third-party PII (every visitor's IP) to the site owner. Keep city/country/geo for
    // the dashboard, drop the raw address.
    const stripPrivate = (row: Record<string, unknown>) => {
      const r = { ...row };
      delete r.ip_address;
      return r;
    };

    const events = eventsResult.map(e => ({
      ...stripPrivate(e as Record<string, unknown>),
      created_at: toStr(e.created_at),
    }));

    const sessions = sessionsResult.map(s => ({
      ...stripPrivate(s as Record<string, unknown>),
      started_at: toStr(s.started_at),
      last_seen_at: toStr(s.last_seen_at),
      created_at: toStr(s.created_at),
    }));

    return NextResponse.json({
      events,
      sessions,
      liveVisitors: liveResult[0]?.count || 0,
    });
  } catch (error) {
    console.error('[Portal Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
