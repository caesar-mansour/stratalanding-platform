import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';
import { withProtection } from '@/lib/security/with-protection';

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { code, url } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sanitizedCode = code.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20).toUpperCase();
    if (!sanitizedCode) return NextResponse.json({ ok: false }, { status: 400 });

    // Look up affiliate (track clicks for pending + active, not rejected/paused)
    const [affiliate] = await sql`
      SELECT id FROM affiliates WHERE referral_code = ${sanitizedCode} AND status IN ('active', 'pending') LIMIT 1
    `;

    if (!affiliate) {
      // Don't reveal whether code exists — just return ok
      return NextResponse.json({ ok: true });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const safeUrl = typeof url === 'string' ? url.slice(0, 2048) : '';

    await sql`
      INSERT INTO referral_clicks (affiliate_id, url, ip_address, user_agent)
      VALUES (${affiliate.id}, ${safeUrl}, ${ip}, ${userAgent})
    `;

    await sql`
      UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = ${affiliate.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Referral click tracking error:', error);
    // Never fail visibly — tracking is non-critical
    return NextResponse.json({ ok: true });
  }
}

// Public, unauthenticated DB-write beacon (audit F34): cap per-IP to stop DB flooding.
// csrf disabled — it's a fire-and-forget tracking beacon that may be sent from demo origins.
export const POST = withProtection(handler, {
  name: 'ref',
  rateLimit: { max: 40, windowSeconds: 3600 },
  csrf: false,
});
