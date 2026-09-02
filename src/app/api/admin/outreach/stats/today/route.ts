import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getTodayStats, getActiveInboxes } from '@/lib/outreach/db';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InboxCapacity {
  label: string;
  email: string;
  sent_today: number;
  daily_cap: number;
  remaining: number;
  paused: boolean;
  last_sent_at: string | null;
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [stats, inboxes, paused, domainLimits] = await Promise.all([
      getTodayStats(),
      getActiveInboxes(),
      sql<Array<{ value: unknown }>>`SELECT value FROM system_settings WHERE key='outreach_paused'`,
      sql<Array<{ domain: string; sent_today: number; daily_cap: number; hard_ceiling: number; is_transactional: boolean; sent_today_date: string | null }>>`
        SELECT domain, sent_today, daily_cap, hard_ceiling, is_transactional, sent_today_date
        FROM outreach_domain_limits ORDER BY domain
      `,
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const capacities: InboxCapacity[] = inboxes.map((i) => {
      const isFresh = i.sent_today_date === today;
      const sent = isFresh ? i.sent_today : 0;
      return {
        label: i.label,
        email: i.email,
        sent_today: sent,
        daily_cap: i.daily_cap,
        remaining: Math.max(0, i.daily_cap - sent),
        paused: i.paused,
        last_sent_at: i.last_sent_at,
      };
    });

    const domains = domainLimits.map((d) => {
      const isFresh = d.sent_today_date === today;
      const sent = isFresh ? d.sent_today : 0;
      return {
        domain: d.domain,
        sent_today: sent,
        daily_cap: d.daily_cap,
        hard_ceiling: d.hard_ceiling,
        is_transactional: d.is_transactional,
      };
    });

    return NextResponse.json({
      stats,
      inboxes: capacities,
      domains,
      outreach_paused: paused[0]?.value === true,
    });
  } catch (err) {
    console.error('stats/today error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
