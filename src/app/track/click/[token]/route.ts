import sql from '@/lib/db';
import { getSendByTrackingToken } from '@/lib/outreach/db';
import { hashIp, getClientIpFromRequest } from '@/lib/outreach/bot-detection';
import { clickSig, OUTREACH_SITE_URL } from '@/lib/outreach/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isSafeRedirectTarget(url: string): boolean {
  // Only allow http/https. Block mailto, javascript, data, file, etc.
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSameOrigin(target: string): boolean {
  try {
    return new URL(target).host === new URL(OUTREACH_SITE_URL).host;
  } catch {
    return false;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get('to');
  const sig = url.searchParams.get('sig');

  if (!target || !isSafeRedirectTarget(target)) {
    return new Response('Missing or invalid target', { status: 400 });
  }

  // SECURITY (audit F37): refuse to act as an open redirect. An external target must carry a
  // valid HMAC sig (only our own emails generate one); same-origin targets are always allowed so
  // legacy links keep working. This kills `/track/click/<x>?to=https://evil.com` phishing.
  if (!isSameOrigin(target) && (!sig || sig !== clickSig(token, target))) {
    return new Response('Invalid or unsigned target', { status: 400 });
  }

  // Validate token shape but don't fail redirect if token is unknown —
  // we always want the user to land on the correct page.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return Response.redirect(target, 302);
  }

  try {
    const send = await getSendByTrackingToken(token);
    if (send) {
      const ua = request.headers.get('user-agent');
      const ip = getClientIpFromRequest(request);
      const ipHash = hashIp(ip);

      await sql`
        INSERT INTO outreach_events (send_id, event_type, url, user_agent, ip_address, ip_hash)
        VALUES (${send.id}, 'click', ${target}, ${ua}, ${ip}, ${ipHash})
      `;
      await sql`
        UPDATE outreach_sends
        SET click_count = click_count + 1,
            first_click_at = COALESCE(first_click_at, now())
        WHERE id = ${send.id}
      `;
      await sql`
        UPDATE outreach_prospects
        SET status = CASE WHEN status IN ('sent','opened','queued','new') THEN 'clicked' ELSE status END,
            updated_at = now()
        WHERE id = ${send.prospect_id}
      `;
    }
  } catch (err) {
    console.error('[track/click] error:', err);
    // Never fail the redirect — always bounce the user through.
  }

  return Response.redirect(target, 302);
}
