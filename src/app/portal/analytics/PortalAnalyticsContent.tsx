'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { StrataEvent, StrataSession } from '@/lib/types';
import {
  GradientText,
  NumberTicker,
  Reveal,
  RevealGroup,
  RevealItem,
  MeterBar,
  AreaChart,
  Donut,
  LiveDot,
} from '@/app/portal/components/portal-ui';

interface Props {
  siteId: string;
}

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

/** Donut segment colors — brand palette only (bright cyan → cyan → navy). */
const DEVICE_COLORS = ['#22D3EE', '#0891B2', '#1A3A5A', '#0E7490'];

type DateRange = 'today' | '7d' | '30d';

export default function PortalAnalyticsContent({ siteId }: Props) {
  const [events, setEvents] = useState<StrataEvent[]>([]);
  const [sessions, setSessions] = useState<StrataSession[]>([]);
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [range, setRange] = useState<DateRange>('7d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (r: DateRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/analytics?range=${r}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setSessions(data.sessions || []);
        setLiveVisitors(data.liveVisitors || 0);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  // Metrics
  const metrics = useMemo(() => {
    const uniqueVisitors = sessions.length;
    const totalPageviews = events.filter((e) => e.event_type === 'pageview').length;
    const bounceSessions = sessions.filter((s) => s.is_bounce).length;
    const bounceRate = uniqueVisitors > 0 ? ((bounceSessions / uniqueVisitors) * 100).toFixed(1) : '0.0';
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = uniqueVisitors > 0 ? Math.round(totalDuration / uniqueVisitors) : 0;
    return { uniqueVisitors, totalPageviews, bounceRate, avgDuration };
  }, [events, sessions]);

  // Daily visitors chart
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, Set<string>>();
    for (const s of sessions) {
      const day = new Date(s.started_at).toISOString().split('T')[0];
      if (!dayMap.has(day)) dayMap.set(day, new Set());
      dayMap.get(day)!.add(s.id);
    }
    return Array.from(dayMap.entries())
      .map(([date, ids]) => ({ date, visitors: ids.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  // Top referrers
  const topReferrers = useMemo(() => {
    const refMap = new Map<string, number>();
    for (const s of sessions) {
      let source = 'Direct';
      if (s.referrer) {
        try { source = new URL(s.referrer).hostname; } catch { source = s.referrer; }
      }
      refMap.set(source, (refMap.get(source) || 0) + 1);
    }
    const total = sessions.length || 1;
    return Array.from(refMap.entries())
      .map(([referrer, count]) => ({ referrer, count, pct: ((count / total) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [sessions]);

  // Devices
  const devices = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) { const d = s.device_type || 'unknown'; m.set(d, (m.get(d) || 0) + 1); }
    const total = sessions.length || 1;
    return Array.from(m.entries())
      .map(([device, count]) => ({ device: device.charAt(0).toUpperCase() + device.slice(1), count, pct: ((count / total) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  // Countries
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) { const c = s.country || 'Unknown'; m.set(c, (m.get(c) || 0) + 1); }
    const total = sessions.length || 1;
    return Array.from(m.entries())
      .map(([country, count]) => ({ country, count, pct: ((count / total) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [sessions]);

  const formatDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const rangeLabel = (r: DateRange) =>
    r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days';

  if (loading && events.length === 0) {
    return (
      <div className={`py-16 text-center ${GLASS}`}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-base font-semibold mb-1"><GradientText>Loading analytics</GradientText></h3>
        <p className="text-sm text-text-muted">Pulling the latest visitor data for your page.</p>
      </div>
    );
  }

  const hasData = events.length > 0 || sessions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header + Range Selector */}
      <Reveal className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold"><GradientText>Your Analytics</GradientText></h2>
          {liveVisitors > 0 && (
            <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
              <LiveDot />
              <span><NumberTicker value={liveVisitors} /> active now</span>
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-white/60 border border-white/60 backdrop-blur-md rounded-lg p-1">
          {(['today', '7d', '30d'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 ${
                range === r
                  ? 'bg-[var(--color-accent)] text-white shadow-[0_4px_14px_-4px_rgba(8,145,178,0.45)]'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {rangeLabel(r)}
            </button>
          ))}
        </div>
      </Reveal>

      {!hasData ? (
        <div className={`py-12 px-6 text-center ${GLASS}`}>
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 14l4-4 4 4 5-6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1"><GradientText>No data yet</GradientText></h3>
          <p className="text-sm text-text-muted">
            Analytics will appear here once visitors start landing on your page.
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <RevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Visitors', value: metrics.uniqueVisitors },
              { label: 'Pageviews', value: metrics.totalPageviews },
              { label: 'Bounce Rate', value: parseFloat(metrics.bounceRate), suffix: '%', decimals: 1 },
              { label: 'Avg. Duration', value: metrics.avgDuration, format: true },
            ].map((stat) => (
              <RevealItem key={stat.label}>
                <motion.div
                  className={`${GLASS} p-4 h-full border-transparent hover:border-[#22D3EE]/40 transition-colors duration-200`}
                  whileHover={{ y: -3, boxShadow: '0 18px 50px -12px rgba(8,145,178,0.28)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <p className="text-xs text-text-muted mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary tabular-nums">
                    {stat.format ? (
                      formatDuration(stat.value)
                    ) : (
                      <NumberTicker value={stat.value} decimals={stat.decimals ?? 0} suffix={stat.suffix ?? ''} />
                    )}
                  </p>
                </motion.div>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* Visitors Over Time */}
          <Reveal delay={0.1} className={`${GLASS} p-6`}>
            <h3 className="text-sm font-medium text-text-primary mb-4">Visitors Over Time</h3>
            {dailyData.length > 0 ? (
              <AreaChart
                data={dailyData.map((d) => ({ x: d.date, y: d.visitors }))}
                height={160}
                formatX={(x) =>
                  new Date(String(x) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
                formatY={(y) => `${Math.round(y)} visitors`}
              />
            ) : (
              <p className="text-sm text-text-muted text-center py-8">No visitor data for this period</p>
            )}
          </Reveal>

          {/* Referrers + Devices */}
          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={0.15} className={`${GLASS} p-6`}>
              <h3 className="text-sm font-medium text-text-primary mb-4">Top Referrers</h3>
              {topReferrers.length > 0 ? (
                <div className="space-y-3">
                  {topReferrers.map((r) => (
                    <div key={r.referrer} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary truncate">{r.referrer}</span>
                          <span className="text-xs text-text-muted ml-2">{r.count} ({r.pct}%)</span>
                        </div>
                        <MeterBar percentage={parseFloat(r.pct)} height={6} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">No referrer data</p>
              )}
            </Reveal>

            <Reveal delay={0.2} className={`${GLASS} p-6`}>
              <h3 className="text-sm font-medium text-text-primary mb-4">Devices</h3>
              {devices.length > 0 ? (
                <div className="flex items-center gap-6">
                  <Donut
                    className="shrink-0"
                    size={104}
                    stroke={13}
                    segments={devices.map((d, i) => ({
                      value: d.count,
                      color: DEVICE_COLORS[i % DEVICE_COLORS.length],
                      label: d.device,
                    }))}
                    center={
                      <div className="text-center leading-tight">
                        <div className="text-lg font-bold text-text-primary tabular-nums">
                          <NumberTicker value={metrics.uniqueVisitors} />
                        </div>
                        <div className="text-[10px] text-text-muted">visitors</div>
                      </div>
                    }
                  />
                  <div className="flex-1 space-y-3">
                    {devices.map((d, i) => (
                      <div key={d.device} className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                          aria-hidden
                        />
                        <span className="text-base" aria-hidden>
                          {d.device === 'Desktop' ? '🖥' : d.device === 'Mobile' ? '📱' : d.device === 'Tablet' ? '📋' : '❓'}
                        </span>
                        <span className="text-sm text-text-primary">{d.device}</span>
                        <span className="ml-auto text-xs text-text-muted tabular-nums">{d.count} ({d.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">No device data</p>
              )}
            </Reveal>
          </div>

          {/* Countries */}
          <Reveal delay={0.25} className={`${GLASS} p-6`}>
            <h3 className="text-sm font-medium text-text-primary mb-4">Countries</h3>
            {countries.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                {countries.map((c) => (
                  <div key={c.country} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm text-text-primary">{c.country}</span>
                    <span className="text-xs text-text-muted">{c.count} ({c.pct}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">No country data yet</p>
            )}
          </Reveal>
        </>
      )}
    </div>
  );
}
