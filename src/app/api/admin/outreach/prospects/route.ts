import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 50;

const VALID_STATUSES = new Set([
  'new', 'queued', 'sent', 'opened', 'clicked', 'replied', 'unsubscribed', 'bounced', 'suppressed', 'follow_up_due',
]);

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const campaign = url.searchParams.get('campaign') || null;
  const status = url.searchParams.get('status') || null;
  const search = url.searchParams.get('q') || null;
  const city = url.searchParams.get('city') || null;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const statusClause = status && VALID_STATUSES.has(status) ? sql`AND p.status = ${status}` : sql``;
    const campaignClause = campaign ? sql`AND p.campaign_id = ${campaign}::uuid` : sql``;
    const cityClause = city ? sql`AND LOWER(p.city) = LOWER(${city})` : sql``;
    const searchClause = search
      ? sql`AND (LOWER(p.name) LIKE ${'%' + search.toLowerCase() + '%'} OR LOWER(p.email) LIKE ${'%' + search.toLowerCase() + '%'} OR LOWER(p.website) LIKE ${'%' + search.toLowerCase() + '%'})`
      : sql``;

    const rows = await sql`
      SELECT
        p.id, p.name, p.email, p.website, p.city, p.status,
        p.last_contact_at, p.replied_at, p.unsubscribed_at, p.bounced_at,
        p.draft_archetype, p.draft_subject,
        p.campaign_id,
        c.location AS campaign_location, c.niche AS campaign_niche,
        (SELECT COUNT(*)::int FROM outreach_sends s WHERE s.prospect_id = p.id) AS sends_count,
        (SELECT COUNT(*)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
           WHERE s.prospect_id = p.id AND e.event_type='open' AND e.open_type='real') AS opens_real,
        (SELECT COUNT(*)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
           WHERE s.prospect_id = p.id AND e.event_type='click') AS clicks,
        (SELECT COUNT(*)::int FROM outreach_events e JOIN outreach_sends s ON s.id=e.send_id
           WHERE s.prospect_id = p.id AND e.event_type='reply') AS replies
      FROM outreach_prospects p
      LEFT JOIN outreach_campaigns c ON c.id = p.campaign_id
      WHERE 1=1
        ${statusClause}
        ${campaignClause}
        ${cityClause}
        ${searchClause}
      ORDER BY
        CASE p.status
          WHEN 'replied' THEN 0
          WHEN 'clicked' THEN 1
          WHEN 'opened' THEN 2
          WHEN 'sent' THEN 3
          WHEN 'new' THEN 4
          ELSE 5
        END,
        p.updated_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const [{ total }] = await sql<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total
      FROM outreach_prospects p
      WHERE 1=1 ${statusClause} ${campaignClause} ${cityClause} ${searchClause}
    `;

    return NextResponse.json({
      prospects: rows,
      page,
      page_size: PAGE_SIZE,
      total,
      total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (err) {
    console.error('prospects list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
