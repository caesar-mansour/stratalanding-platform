import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import AnalyticsDashboard from './AnalyticsDashboard';
import type { StrataEvent, StrataSession } from '@/lib/types';
import { requireAdminPage } from '@/lib/admin-page-guard';

interface Props {
  searchParams: Promise<{ range?: string }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { range = '7d' } = await searchParams;

  const now = new Date();

  // Calculate date range
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
    case 'all':
      startDate = new Date(2024, 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const startISO = startDate.toISOString();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  // Fetch data with raw SQL
  let events: StrataEvent[] = [];
  let sessions: StrataSession[] = [];
  let liveVisitors = 0;

  try {
    const eventsResult = await sql`
      SELECT * FROM strata_events
      WHERE site_id = 'stratalanding' AND created_at >= ${startISO}
      ORDER BY created_at ASC
    `;
    // postgres.js returns Date objects for timestamps — serialize to ISO strings for client
    events = eventsResult.map(e => ({
      ...e,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : String(e.created_at),
    })) as unknown as StrataEvent[];

    const sessionsResult = await sql`
      SELECT * FROM strata_sessions
      WHERE site_id = 'stratalanding' AND started_at >= ${startISO}
      ORDER BY started_at ASC
    `;
    sessions = sessionsResult.map(s => ({
      ...s,
      started_at: s.started_at instanceof Date ? s.started_at.toISOString() : String(s.started_at),
      last_seen_at: s.last_seen_at instanceof Date ? s.last_seen_at.toISOString() : String(s.last_seen_at),
      created_at: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
    })) as unknown as StrataSession[];

    const liveResult = await sql`
      SELECT COUNT(*)::int as count FROM strata_sessions
      WHERE site_id = 'stratalanding' AND last_seen_at >= ${fiveMinAgo}
    `;
    liveVisitors = liveResult[0]?.count || 0;
  } catch (error) {
    console.error('[StrataMetrics] Query error:', error);
  }

  return (
    <AdminContent
      title="StrataMetrics"
      description="First-party analytics — your data, your system, zero third parties."
    >
      <AnalyticsDashboard
        events={events}
        sessions={sessions}
        liveVisitors={liveVisitors}
        currentRange={range}
      />
    </AdminContent>
  );
}
