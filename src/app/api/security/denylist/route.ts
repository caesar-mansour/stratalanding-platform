import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { wafLogSecret } from '@/lib/security/keys';

export const runtime = 'nodejs';

// Returns the small set of currently-blocked IPs for the Edge proxy to enforce (audit: best
// infrastructure). Internal only — gated by the same shared secret as the event logger, so it
// can't be enumerated by an attacker. The proxy caches the result for ~30s; this is cheap and
// fail-open (a legit visitor is never on this list).
export async function GET(request: Request) {
  // AUDIT 2026-08-12 (P2): wafLogSecret() no longer falls back to AUTH_SECRET, so it can be null.
  // Null means the feature is unconfigured — fail CLOSED rather than comparing against an empty
  // string, which any caller sending an empty header would match.
  const expected = wafLogSecret();
  const secret = request.headers.get('x-waf-secret') || '';
  if (!expected || !timingSafeCompare(secret, expected)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const rows = await sql`
      SELECT ip FROM ip_reputation
      WHERE blocked_until IS NOT NULL AND blocked_until > now()
      ORDER BY blocked_until DESC
      LIMIT 5000
    `;
    return NextResponse.json(
      { ips: rows.map((r) => String(r.ip)) },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch {
    // Table may not exist yet — fail open with an empty list.
    return NextResponse.json({ ips: [] }, { headers: { 'cache-control': 'no-store' } });
  }
}
