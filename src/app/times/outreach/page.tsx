import DashboardView from './DashboardView';
import { getDashboardPayload } from '@/lib/outreach/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function OutreachDashboardPage() {
  const payload = await getDashboardPayload();
  return (
    <DashboardView
      stats={payload.stats}
      inboxes={payload.inboxes}
      domains={payload.domains}
      outreachPaused={payload.outreachPaused}
      signals={payload.signals}
      totals={payload.totals}
      recentSends={payload.recentSends}
    />
  );
}
