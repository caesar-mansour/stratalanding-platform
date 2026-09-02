'use client';

import { motion } from 'framer-motion';
import { SpotlightCard, NumberTicker, AreaChart, LiveDot } from '@/app/admin/_components/motion';

export interface SecurityData {
  integrity: { ok: boolean; checked: number; brokenAtId?: string; reason?: string };
  counts: { blocked24h: number; shadow24h: number; loginFail24h: number; lockouts24h: number; honeypot24h: number };
  byType: { rule: string; count: number }[];
  trend: { hour: string; blocked: number; loginFail: number }[];
  topIps: { ip: string; offense_count: number; last_rule: string; last_seen: string }[];
  feed: {
    id: string; event_type: string; ip_address: string | null; severity: string;
    rule: string | null; detail: string | null; path: string | null; created_at: string;
  }[];
  rateLimits: { active: number };
  generatedAt: string;
}

const RULE_LABELS: Record<string, string> = {
  honeypot: 'Honeypot trap',
  probe_path: 'Vuln-scanner probe',
  traversal: 'Path traversal',
  scanner_ua: 'Scanner tool',
  sqli: 'SQL-injection probe',
  xss: 'XSS probe',
};

const EVENT_COLOR: Record<string, string> = {
  honeypot_hit: '#F43F5E',
  waf_block: '#FB7185',
  account_lockout: '#F43F5E',
  waf_shadow: '#FBBF24',
  login_failure: '#FB923C',
  rate_limit_exceeded: '#FBBF24',
  admin_login: '#22D3EE',
};

const EVENT_LABEL: Record<string, string> = {
  honeypot_hit: 'HONEYPOT',
  waf_block: 'WAF BLOCK',
  waf_shadow: 'SHADOW',
  login_failure: 'LOGIN FAIL',
  account_lockout: 'LOCKOUT',
  rate_limit_exceeded: 'RATE LIMIT',
  admin_login: 'ADMIN LOGIN',
};

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function build24h(trend: SecurityData['trend']) {
  const map = new Map(trend.map((t) => [new Date(t.hour).toISOString().slice(0, 13), t]));
  const out: { label: string; blocked: number; loginFail: number }[] = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 3600 * 1000);
    const t = map.get(d.toISOString().slice(0, 13));
    out.push({ label: String(d.getHours()).padStart(2, '0'), blocked: t?.blocked || 0, loginFail: t?.loginFail || 0 });
  }
  return out;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'cyan' | 'slate' }) {
  const tones = {
    red: 'text-rose-600',
    amber: 'text-amber-600',
    cyan: 'text-accent',
    slate: 'text-[#1A3A5A]',
  };
  const glows = { red: '#F43F5E', amber: '#FBBF24', cyan: '#0891B2', slate: '#1A3A5A' };
  return (
    <SpotlightCard glowColor={glows[tone]} className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1A3A5A]/45">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${tones[tone]}`}>
        <NumberTicker value={value} />
      </p>
      <p className="text-[11px] text-[#1A3A5A]/40 mt-0.5">last 24h</p>
    </SpotlightCard>
  );
}

export default function SecurityDashboard({ data }: { data: SecurityData }) {
  const trend = build24h(data.trend);
  const trendMax = Math.max(1, ...trend.map((t) => Math.max(t.blocked, t.loginFail)));
  const typeMax = Math.max(1, ...data.byType.map((t) => t.count));
  const areaData = trend.map((t, i) => ({ x: i, y: t.blocked + t.loginFail }));
  const hasThreatActivity = trend.some((t) => t.blocked + t.loginFail > 0);

  return (
    <div className="space-y-6">
      {/* Audit-log integrity badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
          data.integrity.ok
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-rose-50 border-rose-200'
        }`}
      >
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${data.integrity.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {data.integrity.ok ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          )}
        </span>
        <div>
          <p className={`text-sm font-semibold ${data.integrity.ok ? 'text-emerald-800' : 'text-rose-800'}`}>
            {data.integrity.ok
              ? `Audit log intact — hash chain verified across ${data.integrity.checked.toLocaleString()} events`
              : `⚠ Audit log TAMPERED — chain breaks at event ${data.integrity.brokenAtId} (${data.integrity.reason})`}
          </p>
          <p className={`text-xs ${data.integrity.ok ? 'text-emerald-700/70' : 'text-rose-700/70'}`}>
            Every security event is SHA-256 hash-chained. A deleted or edited row breaks this verification.
          </p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Attacks blocked" value={data.counts.blocked24h} tone="red" />
        <StatCard label="Honeypot hits" value={data.counts.honeypot24h} tone="red" />
        <StatCard label="Shadow matches" value={data.counts.shadow24h} tone="amber" />
        <StatCard label="Login failures" value={data.counts.loginFail24h} tone="amber" />
        <StatCard label="Account lockouts" value={data.counts.lockouts24h} tone="red" />
        <StatCard label="Active throttles" value={data.rateLimits.active} tone="cyan" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 24h trend */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1A3A5A]">Threat activity — last 24h</h3>
            <div className="flex items-center gap-3 text-[11px] text-[#1A3A5A]/55">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />Blocked</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />Login fails</span>
            </div>
          </div>
          {hasThreatActivity && (
            <div className="mb-3 -mx-1">
              <AreaChart
                data={areaData}
                height={72}
                color="#0891B2"
                showTooltip={false}
                formatX={(x) => `${trend[Math.round(Number(x))]?.label ?? ''}:00`}
                formatY={(y) => `${y} events`}
              />
            </div>
          )}
          <div className="flex items-end gap-[3px] h-32">
            {trend.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-[2px] h-full group relative">
                <div className="w-full flex items-end justify-center gap-[1px] h-full">
                  <div className="w-1/2 bg-rose-400/90 rounded-t" style={{ height: `${(t.blocked / trendMax) * 100}%` }} />
                  <div className="w-1/2 bg-amber-400/90 rounded-t" style={{ height: `${(t.loginFail / trendMax) * 100}%` }} />
                </div>
                {i % 4 === 0 && <span className="text-[9px] text-[#1A3A5A]/35 tabular-nums">{t.label}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Threats by type */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]">
          <h3 className="text-sm font-bold text-[#1A3A5A] mb-4">Attacks by type — last 7d</h3>
          {data.byType.length === 0 ? (
            <p className="text-sm text-[#1A3A5A]/40 py-8 text-center">No attacks recorded yet. The WAF is armed and watching.</p>
          ) : (
            <div className="space-y-3">
              {data.byType.map((t) => (
                <div key={t.rule}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A3A5A]">{RULE_LABELS[t.rule] || t.rule}</span>
                    <span className="tabular-nums text-[#1A3A5A]/55">{t.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#9ABCD8]/15 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0891B2] to-rose-400" style={{ width: `${(t.count / typeMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top offenders + Live feed */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top offender IPs */}
        <div className="lg:col-span-2 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]">
          <h3 className="text-sm font-bold text-[#1A3A5A] mb-4">Top offender IPs</h3>
          {data.topIps.length === 0 ? (
            <p className="text-sm text-[#1A3A5A]/40 py-8 text-center">No flagged IPs.</p>
          ) : (
            <div className="space-y-1.5">
              {data.topIps.map((ip) => (
                <div key={ip.ip} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[#9ABCD8]/10">
                  <span className="font-mono text-xs text-[#1A3A5A] truncate">{ip.ip}</span>
                  <span className="text-[10px] text-[#1A3A5A]/45 shrink-0">{RULE_LABELS[ip.last_rule] || ip.last_rule}</span>
                  <span className="text-xs font-bold tabular-nums text-rose-600 shrink-0">{ip.offense_count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live threat feed — terminal style */}
        <div className="lg:col-span-3 rounded-2xl border border-[#0B1B3A] bg-[#0B1120] shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#0B1B3A]">
            <div className="flex items-center gap-2">
              <LiveDot color="#34D399" size={8} />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Live threat feed</span>
            </div>
            <span className="text-[10px] text-white/40 font-mono">{data.feed.length} events</span>
          </div>
          <div className="max-h-[380px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {data.feed.length === 0 ? (
              <p className="text-white/35 py-8 text-center">No security events captured yet.</p>
            ) : (
              data.feed.map((e) => (
                <div key={e.id} className="flex items-start gap-2 py-0.5 border-b border-white/[0.04]">
                  <span className="text-white/30 shrink-0 w-14">{timeAgo(e.created_at)}</span>
                  <span className="shrink-0 w-[78px] font-semibold" style={{ color: EVENT_COLOR[e.event_type] || '#94A3B8' }}>
                    {EVENT_LABEL[e.event_type] || e.event_type}
                  </span>
                  <span className="text-cyan-300/80 shrink-0 w-28 truncate">{e.ip_address || '—'}</span>
                  <span className="text-white/55 truncate">
                    {e.rule ? `${RULE_LABELS[e.rule] || e.rule} ` : ''}
                    {e.path || e.detail || ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#1A3A5A]/40 text-center">
        Edge WAF + honeypots block attacks before they reach the app · tamper-evident audit log · refreshed {timeAgo(data.generatedAt)}
      </p>
    </div>
  );
}
