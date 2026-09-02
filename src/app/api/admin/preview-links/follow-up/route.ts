import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { sendPreviewLinkFollowupEmail } from '@/lib/auth/emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PREVIEW_LINK_TTL_DAYS = 45;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST — founder clicks "Follow up" on a lead. Picks the segment from engagement
// (opened vs never-opened), ISSUES A FRESH working link by rotating the token on the SAME
// row (so all engagement stays on one id/vid; the old emailed link stops working), sends
// the segment-appropriate email, and records the follow-up on success.
export async function POST(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'A valid link id is required' }, { status: 400 });
    }

    const [link] = await sql`
      SELECT id, practice_name, contact_email, first_opened_at
      FROM preview_links WHERE id = ${id} LIMIT 1
    `;
    if (!link) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    if (!link.contact_email) {
      return NextResponse.json({ error: 'This lead has no email on file — send them a link first.' }, { status: 400 });
    }

    const opened = !!link.first_opened_at;

    // Rotate the token on this row → a fresh, deliverable URL without ever storing a raw token.
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + PREVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    await sql`
      UPDATE preview_links SET token_hash = ${tokenHash}, expires_at = ${expiresAt.toISOString()}
      WHERE id = ${id}
    `;
    const url = `${SITE_URL}/preview/${token}`;

    const result = await sendPreviewLinkFollowupEmail(
      link.contact_email as string,
      link.practice_name as string,
      url,
      opened,
    );

    // The transport RETURNS {success:false} on failure instead of throwing. On failure the
    // token is already rotated, so hand back the fresh URL for the founder to send manually.
    if (!result || result.success === false) {
      return NextResponse.json({
        success: true, emailed: false, url,
        emailError: (result && result.error) || 'Link refreshed but the email failed to send — copy the link and send it manually.',
      });
    }

    const [updated] = await sql`
      UPDATE preview_links
      SET followed_up_at = now(), followup_count = followup_count + 1
      WHERE id = ${id}
      RETURNING followup_count, followed_up_at
    `;

    return NextResponse.json({
      success: true, emailed: true,
      segment: opened ? 'opened' : 'unopened',
      followupCount: updated?.followup_count ?? null,
      followedUpAt: updated?.followed_up_at ?? null,
    });
  } catch (error) {
    console.error('preview-links follow-up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
