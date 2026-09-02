import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { logSecurityEvent, type SecurityEvent } from '@/lib/security/audit-log';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { wafLogSecret } from '@/lib/security/keys';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// COST (Neon): WAF verdicts are bot noise arriving 24/7, so persisting them kept the database
// awake permanently. The proxy no longer calls this endpoint unless WAF_AUDIT=1 (see src/proxy.ts);
// this guard is the second half of that switch, so a stray/forged call can't reopen the leak.
const WAF_AUDIT = process.env.WAF_AUDIT === '1';

// Internal sink for the Edge WAF (src/proxy.ts). The Edge runtime can't reach Postgres, so the
// proxy fires verdicts here. Authenticated by a shared secret header so an attacker can't forge
// security events; rate-limited as a backstop if the secret ever leaks. Not for public/browser use.
export async function POST(request: Request) {
  // AUDIT 2026-08-12 (P2): wafLogSecret() no longer falls back to AUTH_SECRET, so it can be null.
  // Null means the feature is unconfigured — fail CLOSED rather than comparing against an empty
  // string, which any caller sending an empty header would match.
  const expected = wafLogSecret();
  const secret = request.headers.get('x-waf-secret') || '';
  if (!expected || !timingSafeCompare(secret, expected)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: {
    action?: string; rule?: string; detail?: string;
    ip?: string; path?: string; method?: string; userAgent?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const ip = (body.ip || '').slice(0, 64) || null;
  // Backstop rate limit per source IP so a leaked secret can't flood the audit log. Deliberately the
  // IN-MEMORY limiter: the durable one wrote a Postgres row on every single bot probe, which is the
  // exact cost this endpoint is being fixed for. The secret gate above is the real protection here.
  if (ip && !rateLimit(`waf-event:ip:${ip}`, { max: 240, windowSeconds: 3600 }).allowed) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const rule = (body.rule || 'unknown').slice(0, 64);
  const action = body.action === 'block' || body.action === 'shadow' ? body.action : 'shadow';
  const event: SecurityEvent =
    action === 'shadow' ? 'waf_shadow' : rule === 'honeypot' ? 'honeypot_hit' : 'waf_block';

  // Audit off (the default): record it where it's free. Netlify function logs keep the forensic
  // trail — attacker IP, rule, path — without a single Neon write or a row that lives forever.
  if (!WAF_AUDIT) {
    console.warn(
      `[WAF] ${action} rule=${rule} ip=${ip ?? 'unknown'} path=${(body.path || '').slice(0, 300)} ua=${(body.userAgent || '').slice(0, 120)}`
    );
    return NextResponse.json({ ok: true, persisted: false });
  }

  await logSecurityEvent({
    event,
    ip: ip || undefined,
    userAgent: (body.userAgent || '').slice(0, 300) || undefined,
    severity: action === 'block' ? 'warn' : 'info',
    details: {
      rule,
      detail: (body.detail || '').slice(0, 200),
      path: (body.path || '').slice(0, 300),
      method: (body.method || '').slice(0, 10),
    },
  });

  // Durable IP-reputation record (best-effort) — surfaced in the Security Command Center.
  if (ip && action === 'block') {
    try {
      const [rep] = await sql`
        INSERT INTO ip_reputation (ip, offense_count, last_rule, first_seen, last_seen)
        VALUES (${ip}, 1, ${rule}, now(), now())
        ON CONFLICT (ip) DO UPDATE SET
          offense_count = ip_reputation.offense_count + 1,
          last_rule = EXCLUDED.last_rule,
          last_seen = now()
        RETURNING offense_count
      `;
      // OPT-IN auto-escalation (default OFF). Only a clearly-dedicated attacker (high offense
      // count) gets a SHORT, time-boxed block — so a legit visitor sharing a NAT/CGNAT IP can
      // never be auto-blocked. Founders block confirmed IPs manually via scripts/security/respond.mjs.
      if (process.env.WAF_AUTOBLOCK === '1' && rep && Number(rep.offense_count) >= 25) {
        await sql`
          UPDATE ip_reputation SET blocked_until = now() + interval '6 hours'
          WHERE ip = ${ip} AND (blocked_until IS NULL OR blocked_until < now())
        `;
      }
    } catch { /* table may not exist until migration 051 — ignore */ }
  }

  return NextResponse.json({ ok: true });
}
