import sql from '@/lib/db';
import { getSystemSetting } from '@/lib/outreach/db';
import SettingsView from './SettingsView';

export const dynamic = 'force-dynamic';

export default async function OutreachSettingsPage() {
  const [inboxes, domains, paused] = await Promise.all([
    sql<Array<{
      id: string; label: string; email: string; display_name: string; type: string;
      daily_cap: number; min_spacing_seconds: number; max_spacing_seconds: number;
      active: boolean; paused: boolean; sent_today: number; warmup_start_date: string | null;
      warmup_daily_cap: number | null; notes: string | null;
    }>>`SELECT * FROM outreach_inboxes ORDER BY label`,
    sql<Array<{ domain: string; daily_cap: number; hard_ceiling: number; sent_today: number; is_transactional: boolean; notes: string | null }>>`
      SELECT domain, daily_cap, hard_ceiling, sent_today, is_transactional, notes FROM outreach_domain_limits ORDER BY domain
    `,
    getSystemSetting<boolean>('outreach_paused'),
  ]);
  return <SettingsView inboxes={inboxes} domains={domains} paused={paused === true} />;
}
