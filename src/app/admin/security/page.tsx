import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import SecurityDashboard, { type SecurityData } from './SecurityDashboard';
import { verifyAuditChain } from '@/lib/security/audit-log';
import { requireAdminPage } from '@/lib/admin-page-guard';

export const dynamic = 'force-dynamic';

// Security Command Center — admin-only (token-gated + noindex), invisible to visitors.
export default async function SecurityPage() {
  await requireAdminPage();
  const empty: SecurityData = {
    integrity: { ok: true, checked: 0 },
    counts: { blocked24h: 0, shadow24h: 0, loginFail24h: 0, lockouts24h: 0, honeypot24h: 0 },
    byType: [],
    trend: [],
    topIps: [],
    feed: [],
    rateLimits: { active: 0 },
    generatedAt: new Date().toISOString(),
  };

  const data: SecurityData = { ...empty };

  try {
    data.integrity = await verifyAuditChain(2000);
  } catch { /* keep default */ }

  try {
    const counts = await sql`
      SELECT
        count(*) FILTER (WHERE event_type IN ('waf_block','honeypot_hit')) AS blocked24h,
        count(*) FILTER (WHERE event_type = 'honeypot_hit')                AS honeypot24h,
        count(*) FILTER (WHERE event_type = 'waf_shadow')                  AS shadow24h,
        count(*) FILTER (WHERE event_type = 'login_failure')               AS loginfail24h,
        count(*) FILTER (WHERE event_type = 'account_lockout')             AS lockouts24h
      FROM security_audit_log
      WHERE created_at > now() - interval '24 hours'
    `;
    const c = counts[0] || {};
    data.counts = {
      blocked24h: Number(c.blocked24h || 0),
      honeypot24h: Number(c.honeypot24h || 0),
      shadow24h: Number(c.shadow24h || 0),
      loginFail24h: Number(c.loginfail24h || 0),
      lockouts24h: Number(c.lockouts24h || 0),
    };
  } catch { /* table missing — keep zeros */ }

  try {
    const byType = await sql`
      SELECT COALESCE((details::jsonb)->>'rule', event_type) AS rule, count(*)::int AS count
      FROM security_audit_log
      WHERE event_type IN ('waf_block','honeypot_hit','waf_shadow')
        AND created_at > now() - interval '7 days'
      GROUP BY 1 ORDER BY count DESC LIMIT 10
    `;
    data.byType = byType.map((r) => ({ rule: String(r.rule || 'unknown'), count: Number(r.count) }));
  } catch { /* keep empty */ }

  try {
    const trend = await sql`
      SELECT date_trunc('hour', created_at) AS hour,
        count(*) FILTER (WHERE event_type IN ('waf_block','honeypot_hit'))::int AS blocked,
        count(*) FILTER (WHERE event_type = 'login_failure')::int AS login_fail
      FROM security_audit_log
      WHERE created_at > now() - interval '24 hours'
      GROUP BY 1 ORDER BY 1
    `;
    data.trend = trend.map((r) => ({
      hour: r.hour instanceof Date ? r.hour.toISOString() : String(r.hour),
      blocked: Number(r.blocked),
      loginFail: Number(r.login_fail),
    }));
  } catch { /* keep empty */ }

  try {
    const topIps = await sql`
      SELECT ip, offense_count, last_rule, last_seen
      FROM ip_reputation
      ORDER BY offense_count DESC, last_seen DESC
      LIMIT 12
    `;
    data.topIps = topIps.map((r) => ({
      ip: String(r.ip),
      offense_count: Number(r.offense_count),
      last_rule: String(r.last_rule || ''),
      last_seen: r.last_seen instanceof Date ? r.last_seen.toISOString() : String(r.last_seen),
    }));
  } catch { /* table missing — keep empty */ }

  try {
    const feed = await sql`
      SELECT id, event_type, ip_address, severity, created_at,
        (details::jsonb)->>'rule'   AS rule,
        (details::jsonb)->>'detail' AS detail,
        (details::jsonb)->>'path'   AS path
      FROM security_audit_log
      WHERE event_type IN ('waf_block','honeypot_hit','waf_shadow','login_failure','account_lockout','rate_limit_exceeded','admin_login')
      ORDER BY created_at DESC
      LIMIT 60
    `;
    data.feed = feed.map((r) => ({
      id: String(r.id),
      event_type: String(r.event_type),
      ip_address: r.ip_address ? String(r.ip_address) : null,
      severity: String(r.severity || 'info'),
      rule: r.rule ? String(r.rule) : null,
      detail: r.detail ? String(r.detail) : null,
      path: r.path ? String(r.path) : null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  } catch { /* keep empty */ }

  try {
    const rl = await sql`SELECT count(*)::int AS active FROM rate_limit_counters WHERE expires_at > now()`;
    data.rateLimits = { active: Number(rl[0]?.active || 0) };
  } catch { /* table missing — keep zero */ }

  data.generatedAt = new Date().toISOString();

  return (
    <AdminContent
      title="Security Command Center"
      description="Live defense telemetry — blocked attacks, threats, and tamper-evident audit integrity. Backend-only; visitors never see this."
    >
      <SecurityDashboard data={data} />
    </AdminContent>
  );
}
