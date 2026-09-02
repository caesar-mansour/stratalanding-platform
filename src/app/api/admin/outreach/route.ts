import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Merge the stored campaign rows with live-computed counters from
    // outreach_sends + outreach_events. Falls back cleanly if the newer
    // tables don't exist yet (pre-migration).
    const campaigns = await sql`
      SELECT
        c.*,
        COALESCE(p_agg.leads_count, c.leads_extracted) AS leads_extracted_live,
        COALESCE(s_agg.sends_count, c.emails_sent)     AS emails_sent_live,
        COALESCE(r_agg.reply_count, c.replies)         AS replies_live,
        COALESCE(s_agg.first_sent_at, c.first_sent_at) AS first_sent_at_live
      FROM outreach_campaigns c
      LEFT JOIN (
        SELECT campaign_id, COUNT(*)::int AS leads_count
        FROM outreach_prospects
        WHERE campaign_id IS NOT NULL
        GROUP BY campaign_id
      ) p_agg ON p_agg.campaign_id = c.id
      LEFT JOIN (
        SELECT campaign_id, COUNT(*)::int AS sends_count, MIN(sent_at) AS first_sent_at
        FROM outreach_sends
        WHERE campaign_id IS NOT NULL
        GROUP BY campaign_id
      ) s_agg ON s_agg.campaign_id = c.id
      LEFT JOIN (
        SELECT s.campaign_id, COUNT(DISTINCT s.id)::int AS reply_count
        FROM outreach_events e JOIN outreach_sends s ON s.id = e.send_id
        WHERE e.event_type = 'reply' AND s.campaign_id IS NOT NULL
        GROUP BY s.campaign_id
      ) r_agg ON r_agg.campaign_id = c.id
      ORDER BY
        CASE c.status
          WHEN 'sending' THEN 0
          WHEN 'extracted' THEN 1
          WHEN 'follow_up' THEN 2
          WHEN 'sent' THEN 3
          WHEN 'completed' THEN 4
        END,
        c.created_at DESC
    `;
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Outreach GET error:', error);
    const errMsg = String(error);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      return NextResponse.json({ campaigns: [], needsMigration: true });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { location, niche, platform, leads_extracted, notes } = body;

    if (!location || !niche) {
      return NextResponse.json({ error: 'Location and niche are required' }, { status: 400 });
    }

    const [campaign] = await sql`
      INSERT INTO outreach_campaigns (location, niche, platform, leads_extracted, notes)
      VALUES (${location}, ${niche}, ${platform || 'email'}, ${leads_extracted || 0}, ${notes || null})
      RETURNING *
    `;

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Outreach POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const allowedFields = ['location', 'niche', 'platform', 'leads_extracted', 'emails_sent', 'replies', 'booked_calls', 'closed_deals', 'status', 'notes', 'first_sent_at'];
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(key);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Build dynamic update using postgres.js
    const [campaign] = await sql`
      UPDATE outreach_campaigns SET
        ${sql(updates, ...setClauses)},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Outreach PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    await sql`DELETE FROM outreach_campaigns WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Outreach DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
