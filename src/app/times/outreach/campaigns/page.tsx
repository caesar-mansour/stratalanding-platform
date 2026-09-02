import sql from '@/lib/db';
import CampaignsView, { type CampaignRow } from './CampaignsView';

export const dynamic = 'force-dynamic';

export default async function OutreachCampaignsPage() {
  const rows = await sql<CampaignRow[]>`
    SELECT
      c.id, c.location, c.niche, c.platform, c.status, c.notes,
      c.extracted_at, c.created_at, c.updated_at, c.first_sent_at,
      COALESCE((SELECT COUNT(*)::int FROM outreach_prospects WHERE campaign_id=c.id), c.leads_extracted) AS leads,
      COALESCE((SELECT COUNT(*)::int FROM outreach_sends WHERE campaign_id=c.id), c.emails_sent) AS sends,
      COALESCE((SELECT COUNT(DISTINCT s.id)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
                WHERE e.event_type='open' AND e.open_type='real' AND s.campaign_id=c.id), 0) AS opens_real,
      COALESCE((SELECT COUNT(DISTINCT s.id)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
                WHERE e.event_type='reply' AND s.campaign_id=c.id), c.replies) AS replies,
      COALESCE((SELECT COUNT(DISTINCT s.id)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
                WHERE e.event_type='bounce' AND s.campaign_id=c.id), 0) AS bounces
    FROM outreach_campaigns c
    ORDER BY
      CASE c.status WHEN 'sending' THEN 0 WHEN 'extracted' THEN 1 WHEN 'follow_up' THEN 2
                    WHEN 'sent' THEN 3 WHEN 'completed' THEN 4 END,
      c.created_at DESC
  `;
  return <CampaignsView campaigns={rows} />;
}
