import sql from '@/lib/db';
import { getSendByTrackingToken } from '@/lib/outreach/db';
import {
  classifyOpenRequest,
  hashIp,
  getClientIpFromRequest,
} from '@/lib/outreach/bot-detection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1×1 transparent GIF (43 bytes). Fastest pixel response.
const TRANSPARENT_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

function pixelResponse(status = 200): Response {
  return new Response(TRANSPARENT_GIF, {
    status,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  // Accept both "{uuid}.png" and "{uuid}.gif" and bare uuid.
  const token = rawToken.replace(/\.(png|gif)$/i, '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return pixelResponse(200); // don't leak whether the token is real
  }

  try {
    const send = await getSendByTrackingToken(token);
    if (!send) return pixelResponse(200);

    const ua = request.headers.get('user-agent');
    const ip = getClientIpFromRequest(request);
    const fetchDest = request.headers.get('sec-fetch-dest');
    const classification = classifyOpenRequest(ua, ip, fetchDest);

    if (classification.isBot) return pixelResponse(200);

    const ipHash = hashIp(ip);
    const openType = classification.openType;

    // Insert event. Unique index on (send_id, ip_hash) where event_type='open' prevents duplicates.
    const [event] = await sql<Array<{ id: string }>>`
      INSERT INTO outreach_events (send_id, event_type, open_type, user_agent, ip_address, ip_hash)
      VALUES (${send.id}, 'open', ${openType}, ${ua}, ${ip}, ${ipHash})
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    // Only bump send counters + prospect status on a NEW event (not dedup hit).
    if (event) {
      await sql`UPDATE outreach_sends SET open_count_raw = open_count_raw + 1 WHERE id = ${send.id}`;
      if (openType === 'real') {
        await sql`
          UPDATE outreach_sends
          SET open_count_real = open_count_real + 1,
              first_open_at = COALESCE(first_open_at, now())
          WHERE id = ${send.id}
        `;
        await sql`
          UPDATE outreach_prospects
          SET status = CASE WHEN status IN ('sent', 'queued', 'new') THEN 'opened' ELSE status END,
              updated_at = now()
          WHERE id = ${send.prospect_id}
        `;
      }
    }

    return pixelResponse(200);
  } catch (err) {
    // Never fail the pixel — returning 200 is critical for deliverability (senders watch for 4xx/5xx).
    console.error('[track/open] error:', err);
    return pixelResponse(200);
  }
}
