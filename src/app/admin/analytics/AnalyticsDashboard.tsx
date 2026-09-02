'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { StrataEvent, StrataSession } from '@/lib/types';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import worldAtlas from '@/data/countries-110m.json';
import {
  SpotlightCard,
  NumberTicker,
  AreaChart,
  MeterBar,
  Sparkline,
  Pressable,
  LiveDot,
} from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';

const VisitorMap = dynamic(() => import('./VisitorMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl bg-background border border-border animate-pulse"
      style={{ height: 540 }}
    >
      <div className="text-center">
        <div className="text-3xl mb-3 opacity-30">🗺️</div>
        <div className="text-text-muted text-sm">Loading visitor map…</div>
      </div>
    </div>
  ),
});

const preloadedGeo = feature(worldAtlas as unknown as Topology, (worldAtlas as unknown as Topology).objects.countries as GeometryCollection) as FeatureCollection;

// ISO 3166-1 numeric → ISO 3166-1 alpha-2 mapping for world-atlas
const NUMERIC_TO_ISO2: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','016':'AS','020':'AD','024':'AO','028':'AG','031':'AZ',
  '032':'AR','036':'AU','040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','056':'BE',
  '064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN',
  '100':'BG','104':'MM','108':'BI','116':'KH','120':'CM','124':'CA','140':'CF','144':'LK',
  '148':'TD','152':'CL','156':'CN','170':'CO','174':'KM','178':'CG','180':'CD','188':'CR',
  '191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ','208':'DK','214':'DO','218':'EC',
  '222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE','242':'FJ','246':'FI','250':'FR',
  '262':'DJ','266':'GA','268':'GE','270':'GM','275':'PS','276':'DE','288':'GH','296':'KI',
  '300':'GR','320':'GT','324':'GN','328':'GY','332':'HT','340':'HN','344':'HK','348':'HU',
  '352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT',
  '384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','408':'KP','410':'KR',
  '414':'KW','417':'KG','418':'LA','422':'LB','426':'LS','428':'LV','430':'LR','434':'LY',
  '440':'LT','442':'LU','450':'MG','454':'MW','458':'MY','462':'MV','466':'ML','470':'MT',
  '478':'MR','480':'MU','484':'MX','496':'MN','498':'MD','504':'MA','508':'MZ','512':'OM',
  '516':'NA','520':'NR','524':'NP','528':'NL','540':'NC','548':'VU','554':'NZ','558':'NI',
  '562':'NE','566':'NG','578':'NO','586':'PK','591':'PA','598':'PG','600':'PY','604':'PE',
  '608':'PH','616':'PL','620':'PT','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW',
  '682':'SA','686':'SN','688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','706':'SO',
  '710':'ZA','716':'ZW','724':'ES','728':'SS','729':'SD','740':'SR','752':'SE','756':'CH',
  '760':'SY','762':'TJ','764':'TH','768':'TG','780':'TT','784':'AE','788':'TN','792':'TR',
  '795':'TM','800':'UG','804':'UA','818':'EG','826':'GB','834':'TZ','840':'US','854':'BF',
  '858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
  '-99':'CY','010':'AQ',
};

interface AnalyticsDashboardProps {
  events: StrataEvent[];
  sessions: StrataSession[];
  liveVisitors: number;
  currentRange: string;
}

// ============================================
// COUNTRY NAME → ISO CODE MAP (for world map coloring)
// ============================================

const COUNTRY_TO_ISO: Record<string, string> = {
  'United States': 'US', 'United States of America': 'US',
  'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
  'Germany': 'DE', 'France': 'FR', 'Japan': 'JP', 'Brazil': 'BR', 'India': 'IN',
  'Netherlands': 'NL', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
  'Spain': 'ES', 'Italy': 'IT', 'Portugal': 'PT', 'Mexico': 'MX', 'Argentina': 'AR',
  'South Korea': 'KR', 'China': 'CN', 'Singapore': 'SG', 'Hong Kong': 'HK',
  'New Zealand': 'NZ', 'Ireland': 'IE', 'Switzerland': 'CH', 'Austria': 'AT',
  'Belgium': 'BE', 'Poland': 'PL', 'Czech Republic': 'CZ', 'Israel': 'IL',
  'UAE': 'AE', 'Saudi Arabia': 'SA', 'South Africa': 'ZA', 'Nigeria': 'NG',
  'Egypt': 'EG', 'Kenya': 'KE', 'Philippines': 'PH', 'Thailand': 'TH',
  'Indonesia': 'ID', 'Malaysia': 'MY', 'Vietnam': 'VN', 'Taiwan': 'TW',
  'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Romania': 'RO',
  'Ukraine': 'UA', 'Turkey': 'TR', 'Pakistan': 'PK', 'Bangladesh': 'BD',
  'Russia': 'RU', 'Greece': 'GR', 'Hungary': 'HU', 'Slovakia': 'SK',
  'Croatia': 'HR', 'Serbia': 'RS', 'Bulgaria': 'BG', 'Lithuania': 'LT',
  'Latvia': 'LV', 'Estonia': 'EE', 'Iceland': 'IS', 'Luxembourg': 'LU',
};

// ============================================
// WORLD MAP SVG COMPONENT
// ============================================

interface GeoFeature extends Feature<Geometry> {
  id?: string;
  properties: { name?: string };
}

function WorldMap({ countryData }: { countryData: Map<string, number> }) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const geoData = preloadedGeo;
  const maxCount = Math.max(...Array.from(countryData.values()), 1);
  const totalSessions = Array.from(countryData.values()).reduce((a, b) => a + b, 0) || 1;

  const projection = useMemo(() => {
    return geoNaturalEarth1().scale(150).translate([400, 220]);
  }, []);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  function getColor(iso: string): string {
    const count = countryData.get(iso) || 0;
    if (count === 0) return '#E5E7EB';
    const intensity = Math.min(count / maxCount, 1);
    const r = Math.round(154 - 124 * intensity);
    const g = Math.round(188 - 130 * intensity);
    const b = Math.round(216 - 121 * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (!geoData) {
    return null;
  }

  return (
    <div className="relative" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox="0 0 800 450" className="w-full h-auto" style={{ maxHeight: 450 }}>
        <rect width="800" height="450" fill="#F8FAFC" rx="8" />
        {(geoData.features as GeoFeature[]).map((geo, i) => {
          const numericId = geo.id || '';
          const iso = NUMERIC_TO_ISO2[numericId] || '';
          const count = countryData.get(iso) || 0;
          const d = pathGenerator(geo) || '';
          const name = geo.properties?.name || iso || 'Unknown';

          return (
            <path
              key={`${numericId}-${i}`}
              d={d}
              fill={getColor(iso)}
              stroke="#CBD5E1"
              strokeWidth={0.4}
              className="transition-colors duration-150 cursor-pointer"
              onMouseEnter={(evt) => setTooltip({ name, count, x: evt.clientX, y: evt.clientY })}
              onMouseMove={(evt) => setTooltip((prev) => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
              style={{ opacity: 0.9 }}
              onMouseOver={(evt) => (evt.currentTarget.style.opacity = '1')}
              onMouseOut={(evt) => (evt.currentTarget.style.opacity = '0.9')}
            />
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          <span className="font-medium">{tooltip.name}</span>
          <span className="ml-2 text-gray-300">
            {tooltip.count} visitors ({((tooltip.count / totalSessions) * 100).toFixed(1)}%)
          </span>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-1 text-xs text-text-muted">
        <span>Fewer</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-5 h-3 rounded-sm"
              style={{
                backgroundColor: `rgb(${Math.round(154 - 124 * intensity)}, ${Math.round(188 - 130 * intensity)}, ${Math.round(216 - 121 * intensity)})`,
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function AnalyticsDashboard({
  events,
  sessions,
  liveVisitors,
  currentRange,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // ============================================
  // IP PURGE HANDLER
  // ============================================

  const handlePurgeIPs = useCallback(async () => {
    if (!(await confirmDialog({ title: 'Purge old IP addresses?', message: 'Removes all IP addresses older than 30 days. This cannot be undone.', confirmLabel: 'Purge', tone: 'danger' })).confirmed) return;
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch('/api/admin/analytics/purge-ips', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const msg = `Purged ${data.purged.events} events + ${data.purged.sessions} sessions`;
        setPurgeResult(msg);
        toast.success('IPs purged', msg);
      } else {
        setPurgeResult('Error: ' + (data.error || 'Unknown'));
        toast.error('Purge failed', data.error || 'Unknown error');
      }
    } catch {
      setPurgeResult('Network error');
      toast.error('Network error', 'Could not reach the purge endpoint');
    } finally {
      setPurging(false);
    }
  }, []);

  // ============================================
  // COMPUTED METRICS
  // ============================================

  const metrics = useMemo(() => {
    const uniqueVisitors = sessions.length;
    const totalPageviews = events.filter((e) => e.event_type === 'pageview').length;
    const formSubmissions = events.filter(
      (e) => e.event_type === 'brief_submit' || e.event_type === 'quote_submit'
    ).length;
    const conversionRate =
      uniqueVisitors > 0 ? ((formSubmissions / uniqueVisitors) * 100).toFixed(1) : '0.0';
    const bounceSessions = sessions.filter((s) => s.is_bounce).length;
    const bounceRate =
      uniqueVisitors > 0 ? ((bounceSessions / uniqueVisitors) * 100).toFixed(1) : '0.0';

    return { uniqueVisitors, totalPageviews, formSubmissions, conversionRate, bounceRate };
  }, [events, sessions]);

  // ============================================
  // TOP PAGES
  // ============================================

  const topPages = useMemo(() => {
    const pageviews = events.filter((e) => e.event_type === 'pageview');
    const pageMap = new Map<string, { views: number; sessions: Set<string> }>();

    for (const e of pageviews) {
      const existing = pageMap.get(e.url);
      if (existing) {
        existing.views++;
        existing.sessions.add(e.session_id);
      } else {
        pageMap.set(e.url, { views: 1, sessions: new Set([e.session_id]) });
      }
    }

    return Array.from(pageMap.entries())
      .map(([url, data]) => ({
        url,
        views: data.views,
        visitors: data.sessions.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [events]);

  // ============================================
  // TRAFFIC SOURCES (unified referrer + UTM)
  // ============================================

  // Map hostnames/utm_source to a recognized platform
  const PLATFORM_MAP: Record<string, { name: string; color: string }> = {
    // Instagram
    'instagram.com': { name: 'Instagram', color: '#E1306C' },
    'l.instagram.com': { name: 'Instagram', color: '#E1306C' },
    'www.instagram.com': { name: 'Instagram', color: '#E1306C' },
    'instagram': { name: 'Instagram', color: '#E1306C' },
    'ig': { name: 'Instagram', color: '#E1306C' },
    // X / Twitter
    'twitter.com': { name: 'X (Twitter)', color: '#000000' },
    'x.com': { name: 'X (Twitter)', color: '#000000' },
    't.co': { name: 'X (Twitter)', color: '#000000' },
    'mobile.twitter.com': { name: 'X (Twitter)', color: '#000000' },
    'twitter': { name: 'X (Twitter)', color: '#000000' },
    'x': { name: 'X (Twitter)', color: '#000000' },
    // Google
    'google.com': { name: 'Google', color: '#4285F4' },
    'www.google.com': { name: 'Google', color: '#4285F4' },
    'google': { name: 'Google', color: '#4285F4' },
    // Facebook
    'facebook.com': { name: 'Facebook', color: '#1877F2' },
    'www.facebook.com': { name: 'Facebook', color: '#1877F2' },
    'l.facebook.com': { name: 'Facebook', color: '#1877F2' },
    'lm.facebook.com': { name: 'Facebook', color: '#1877F2' },
    'm.facebook.com': { name: 'Facebook', color: '#1877F2' },
    'facebook': { name: 'Facebook', color: '#1877F2' },
    'fb': { name: 'Facebook', color: '#1877F2' },
    // LinkedIn
    'linkedin.com': { name: 'LinkedIn', color: '#0A66C2' },
    'www.linkedin.com': { name: 'LinkedIn', color: '#0A66C2' },
    'lnkd.in': { name: 'LinkedIn', color: '#0A66C2' },
    'linkedin': { name: 'LinkedIn', color: '#0A66C2' },
    // YouTube
    'youtube.com': { name: 'YouTube', color: '#FF0000' },
    'www.youtube.com': { name: 'YouTube', color: '#FF0000' },
    'youtu.be': { name: 'YouTube', color: '#FF0000' },
    'youtube': { name: 'YouTube', color: '#FF0000' },
    // TikTok
    'tiktok.com': { name: 'TikTok', color: '#010101' },
    'www.tiktok.com': { name: 'TikTok', color: '#010101' },
    'tiktok': { name: 'TikTok', color: '#010101' },
    // Reddit
    'reddit.com': { name: 'Reddit', color: '#FF4500' },
    'www.reddit.com': { name: 'Reddit', color: '#FF4500' },
    'old.reddit.com': { name: 'Reddit', color: '#FF4500' },
    'reddit': { name: 'Reddit', color: '#FF4500' },
    // Bing
    'bing.com': { name: 'Bing', color: '#008373' },
    'www.bing.com': { name: 'Bing', color: '#008373' },
    'bing': { name: 'Bing', color: '#008373' },
  };

  const PLATFORM_ICONS: Record<string, React.ReactElement> = {
    'Instagram': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    'X (Twitter)': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    'Google': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
    'Facebook': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    'LinkedIn': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    'YouTube': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    'TikTok': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    'Reddit': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"/></svg>,
    'Bing': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3v16.5l4.5 2.5 8-4.5-3.5-2-4.5 2.5V8l-4.5-2V3z"/></svg>,
    'Direct': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  };

  function resolveSource(referrer: string | null, utmSource: string | null): string {
    // UTM source takes priority (explicit tagging)
    if (utmSource) {
      const key = utmSource.toLowerCase();
      const match = PLATFORM_MAP[key];
      if (match) return match.name;
      return utmSource;
    }
    // Parse referrer hostname
    if (referrer) {
      try {
        const hostname = new URL(referrer).hostname;
        // Check exact match first
        const exact = PLATFORM_MAP[hostname];
        if (exact) return exact.name;
        // Check if hostname contains a known platform domain
        for (const [domain, info] of Object.entries(PLATFORM_MAP)) {
          if (domain.includes('.') && hostname.endsWith(domain)) return info.name;
        }
        // Return cleaned hostname for unknown referrers
        return hostname.replace(/^www\./, '');
      } catch {
        return referrer;
      }
    }
    return 'Direct';
  }

  function getSourceColor(name: string): string {
    for (const info of Object.values(PLATFORM_MAP)) {
      if (info.name === name) return info.color;
    }
    return '#6B7280'; // gray for unknown
  }

  const trafficSources = useMemo(() => {
    const sourceMap = new Map<string, number>();

    for (const s of sessions) {
      const source = resolveSource(s.referrer, s.utm_source);
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    const total = sessions.length || 1;
    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage: ((count / total) * 100).toFixed(1),
        color: getSourceColor(source),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [sessions]);

  // ============================================
  // COUNTRIES (with city drill-down)
  // ============================================

  const topCountries = useMemo(() => {
    const countryMap = new Map<string, { count: number; cities: Map<string, number> }>();

    for (const s of sessions) {
      const c = s.country || 'Unknown';
      const city = s.city || 'Unknown';
      const existing = countryMap.get(c);
      if (existing) {
        existing.count++;
        existing.cities.set(city, (existing.cities.get(city) || 0) + 1);
      } else {
        countryMap.set(c, { count: 1, cities: new Map([[city, 1]]) });
      }
    }

    const total = sessions.length || 1;
    return Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        count: data.count,
        percentage: ((data.count / total) * 100).toFixed(1),
        cities: Array.from(data.cities.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [sessions]);

  // Country ISO code map for world map
  const countryISOData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of topCountries) {
      const iso = COUNTRY_TO_ISO[c.country];
      if (iso) map.set(iso, c.count);
    }
    return map;
  }, [topCountries]);

  // ============================================
  // TOP CITIES
  // ============================================

  const topCities = useMemo(() => {
    const cityMap = new Map<string, { count: number; country: string }>();

    for (const s of sessions) {
      const city = s.city || 'Unknown';
      const country = s.country || 'Unknown';
      const key = `${city}|${country}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        cityMap.set(key, { count: 1, country });
      }
    }

    const total = sessions.length || 1;
    return Array.from(cityMap.entries())
      .map(([key, data]) => ({
        city: key.split('|')[0],
        country: data.country,
        count: data.count,
        percentage: ((data.count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [sessions]);

  // ============================================
  // BROWSERS
  // ============================================

  const browsers = useMemo(() => {
    const browserMap = new Map<string, number>();

    for (const s of sessions) {
      const b = s.browser || 'Unknown';
      browserMap.set(b, (browserMap.get(b) || 0) + 1);
    }

    const total = sessions.length || 1;
    return Array.from(browserMap.entries())
      .map(([browser, count]) => ({
        browser,
        count,
        percentage: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  // ============================================
  // AVERAGE SESSION DURATION
  // ============================================

  const avgSessionDuration = useMemo(() => {
    const nonBounceSessions = sessions.filter((s) => !s.is_bounce && s.duration_seconds > 0);
    if (nonBounceSessions.length === 0) return 0;
    const total = nonBounceSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    return Math.round(total / nonBounceSessions.length);
  }, [sessions]);

  // ============================================
  // EVENT BREAKDOWN
  // ============================================

  const eventBreakdown = useMemo(() => {
    const eventMap = new Map<string, number>();

    for (const e of events) {
      eventMap.set(e.event_type, (eventMap.get(e.event_type) || 0) + 1);
    }

    return Array.from(eventMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // ============================================
  // RECENT EVENTS (last 20)
  // ============================================

  const recentEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);
  }, [events]);

  // ============================================
  // DEVICE BREAKDOWN
  // ============================================

  const devices = useMemo(() => {
    const deviceMap = new Map<string, number>();

    for (const s of sessions) {
      const type = s.device_type || 'Unknown';
      deviceMap.set(type, (deviceMap.get(type) || 0) + 1);
    }

    const total = sessions.length || 1;
    return Array.from(deviceMap.entries())
      .map(([device, count]) => ({
        device: device.charAt(0).toUpperCase() + device.slice(1),
        count,
        percentage: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  // ============================================
  // CTA PERFORMANCE
  // ============================================

  const ctaPerformance = useMemo(() => {
    const ctaEvents = events.filter((e) => e.event_type === 'cta_click');
    const ctaMap = new Map<string, number>();

    for (const e of ctaEvents) {
      const props = e.props as Record<string, string>;
      const key = `${props.cta_location || 'unknown'} (${props.cta_variant || '-'})`;
      ctaMap.set(key, (ctaMap.get(key) || 0) + 1);
    }

    return Array.from(ctaMap.entries())
      .map(([cta, clicks]) => ({ cta, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [events]);

  // ============================================
  // CONVERSION FUNNEL
  // ============================================

  const funnel = useMemo(() => {
    const totalVisitors = sessions.length;
    const planSelects = new Set(
      events.filter((e) => e.event_type === 'plan_select').map((e) => e.session_id)
    ).size;
    const formViews = new Set(
      events
        .filter((e) => e.event_type === 'brief_view' || e.event_type === 'quote_view')
        .map((e) => e.session_id)
    ).size;
    const formSubmits = new Set(
      events
        .filter((e) => e.event_type === 'brief_submit' || e.event_type === 'quote_submit')
        .map((e) => e.session_id)
    ).size;

    return [
      { label: 'Visitors', count: totalVisitors, percentage: 100 },
      {
        label: 'Plan Selected',
        count: planSelects,
        percentage: totalVisitors > 0 ? Math.round((planSelects / totalVisitors) * 100) : 0,
      },
      {
        label: 'Form Viewed',
        count: formViews,
        percentage: totalVisitors > 0 ? Math.round((formViews / totalVisitors) * 100) : 0,
      },
      {
        label: 'Form Submitted',
        count: formSubmits,
        percentage: totalVisitors > 0 ? Math.round((formSubmits / totalVisitors) * 100) : 0,
      },
    ];
  }, [events, sessions]);

  // ============================================
  // DAILY VISITORS CHART
  // ============================================

  const dailyVisitors = useMemo(() => {
    const dayMap = new Map<string, Set<string>>();

    for (const s of sessions) {
      const day = s.started_at.substring(0, 10);
      const existing = dayMap.get(day);
      if (existing) {
        existing.add(s.id);
      } else {
        dayMap.set(day, new Set([s.id]));
      }
    }

    return Array.from(dayMap.entries())
      .map(([date, ids]) => ({ date, count: ids.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  // ============================================
  // VISITOR LOG (sessions with details)
  // ============================================

  const visitorLog = useMemo(() => {
    return [...sessions]
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, 50);
  }, [sessions]);

  // Group events by session for drill-down
  const eventsBySession = useMemo(() => {
    const map = new Map<string, StrataEvent[]>();
    for (const e of events) {
      const existing = map.get(e.session_id);
      if (existing) {
        existing.push(e);
      } else {
        map.set(e.session_id, [e]);
      }
    }
    return map;
  }, [events]);

  // ============================================
  // RANGE SELECTOR
  // ============================================

  const ranges = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  function handleRangeChange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Range Selector + Live Counter + Purge Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white rounded-lg border border-border p-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRangeChange(r.value)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                currentRange === r.value
                  ? 'bg-[#3A6A8A] text-white font-medium'
                  : 'text-text-muted hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {liveVisitors > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5"
            >
              <LiveDot color="#22c55e" size={9} />
              <span className="text-sm font-medium text-green-700">
                {liveVisitors} live {liveVisitors === 1 ? 'visitor' : 'visitors'}
              </span>
            </motion.div>
          )}

          <Pressable
            onClick={handlePurgeIPs}
            disabled={purging}
            ariaLabel="Purge old IP addresses"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {purging ? 'Purging...' : 'Purge Old IPs'}
          </Pressable>
          {purgeResult && (
            <span className="text-xs text-text-muted">{purgeResult}</span>
          )}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Unique Visitors',
            value: metrics.uniqueVisitors,
            decimals: 0,
            sparkline: dailyVisitors.map((d) => d.count),
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-700',
            glow: 'rgba(59,130,246,0.16)',
            spark: '#3b82f6',
          },
          {
            label: 'Pageviews',
            value: metrics.totalPageviews,
            decimals: 0,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ),
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-700',
            glow: 'rgba(34,197,94,0.16)',
          },
          {
            label: 'Conversion Rate',
            value: parseFloat(metrics.conversionRate),
            suffix: '%',
            decimals: 1,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ),
            color: 'bg-yellow-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-700',
            glow: 'rgba(234,179,8,0.16)',
          },
          {
            label: 'Bounce Rate',
            value: parseFloat(metrics.bounceRate),
            suffix: '%',
            decimals: 1,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            ),
            color: 'bg-red-500',
            bgColor: 'bg-red-50',
            textColor: 'text-red-700',
            glow: 'rgba(239,68,68,0.16)',
          },
          {
            label: 'Avg. Duration',
            value: avgSessionDuration,
            suffix: 's',
            decimals: 0,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-700',
            glow: 'rgba(168,85,247,0.16)',
          },
        ].map((stat, index) => (
          <SpotlightCard
            key={stat.label}
            glowColor={stat.glow}
            className={`${stat.bgColor} p-5`}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>
                    <NumberTicker
                      value={stat.value}
                      decimals={stat.decimals}
                      suffix={stat.suffix || ''}
                      duration={1.4}
                    />
                  </p>
                </div>
                <motion.div
                  className={`${stat.color} text-white p-2 rounded-lg shrink-0`}
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {stat.icon}
                </motion.div>
              </div>
              {stat.sparkline && stat.sparkline.length > 1 && (
                <div className="mt-3">
                  <Sparkline data={stat.sparkline} color={stat.spark} height={28} />
                </div>
              )}
            </motion.div>
          </SpotlightCard>
        ))}
      </div>

      {/* Visitors Chart */}
      {dailyVisitors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Visitors Over Time
          </h3>
          <AreaChart
            data={dailyVisitors.map((day, i) => ({ x: i, y: day.count }))}
            height={180}
            color="#0891B2"
            formatY={(v) => `${Math.round(v)}`}
            formatX={(x) => dailyVisitors[Math.round(Number(x))]?.date || ''}
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-text-muted">
              {dailyVisitors[0]?.date || ''}
            </span>
            <span className="text-xs text-text-muted">
              {dailyVisitors[dailyVisitors.length - 1]?.date || ''}
            </span>
          </div>
        </motion.div>
      )}

      {/* Conversion Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Conversion Funnel
        </h3>
        <div className="space-y-3">
          {funnel.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <span className="w-32 text-sm text-text-muted">{step.label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${step.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#3A6A8A] to-[#9ABCD8]"
                />
              </div>
              <span className="w-24 text-sm font-medium text-text-primary text-right">
                {step.count} ({step.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Two-column layout: Top Pages + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Top Pages</h3>
          {topPages.length === 0 ? (
            <p className="text-text-muted text-sm">No pageview data yet.</p>
          ) : (
            <div className="space-y-2">
              {topPages.map((page, i) => (
                <div
                  key={page.url}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-text-muted w-5">{i + 1}</span>
                    <span className="text-sm text-text-primary truncate">
                      {page.url || '/'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium text-text-primary">
                      {page.views}
                    </span>
                    <span className="text-xs text-text-muted w-16 text-right">
                      {page.visitors} visitors
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Referrers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Traffic Sources</h3>
          {trafficSources.length === 0 ? (
            <p className="text-text-muted text-sm">No traffic data yet.</p>
          ) : (
            <div className="space-y-1">
              {trafficSources.map((src, i) => {
                const maxCount = trafficSources[0]?.count || 1;
                const barWidth = ((src.count / maxCount) * 100).toFixed(1);
                return (
                  <div
                    key={src.source}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="shrink-0" style={{ color: src.color }}>
                      {PLATFORM_ICONS[src.source] || (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {src.source}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-semibold text-text-primary">
                            {src.count}
                          </span>
                          <span className="text-xs text-text-muted w-12 text-right">
                            {src.percentage}%
                          </span>
                        </div>
                      </div>
                      <MeterBar
                        percentage={parseFloat(barWidth)}
                        color={src.color}
                        height={6}
                        delay={i * 0.04}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Two-column: Device Breakdown + CTA Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Devices</h3>
          {devices.length === 0 ? (
            <p className="text-text-muted text-sm">No device data yet.</p>
          ) : (
            <div className="space-y-3">
              {devices.map((d, i) => {
                const colors: Record<string, string> = {
                  Desktop: '#3b82f6',
                  Mobile: '#22c55e',
                  Tablet: '#eab308',
                };
                return (
                  <div key={d.device}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary">{d.device}</span>
                      <span className="text-text-muted">
                        {d.count} ({d.percentage}%)
                      </span>
                    </div>
                    <MeterBar
                      percentage={parseFloat(d.percentage)}
                      color={colors[d.device] || '#64748b'}
                      height={12}
                      delay={i * 0.06}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* CTA Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            CTA Performance
          </h3>
          {ctaPerformance.length === 0 ? (
            <p className="text-text-muted text-sm">No CTA click data yet.</p>
          ) : (
            <div className="space-y-2">
              {ctaPerformance.map((cta, i) => (
                <div
                  key={cta.cta}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-text-muted w-5">{i + 1}</span>
                    <span className="text-sm text-text-primary truncate">{cta.cta}</span>
                  </div>
                  <span className="text-sm font-medium text-text-primary shrink-0">
                    {cta.clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* World Map — Interactive Leaflet with city markers */}
      <SpotlightCard className="p-6" spotlight={false}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68 }}
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Visitor Map
          </h3>
          {sessions.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl bg-background border border-border" style={{ height: 280 }}>
              <div className="text-center">
                <div className="text-3xl mb-3 opacity-40">🗺️</div>
                <div className="text-text-muted text-sm">No geo data yet</div>
                <div className="text-text-muted/70 text-xs mt-1">Visitor locations appear here as traffic arrives</div>
              </div>
            </div>
          ) : (
            <VisitorMap sessions={sessions} />
          )}
        </motion.div>
      </SpotlightCard>

      {/* Countries (with city drill-down) + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Countries</h3>
          {topCountries.length === 0 ? (
            <p className="text-text-muted text-sm">No country data yet.</p>
          ) : (
            <div className="space-y-1">
              {topCountries.map((c, i) => (
                <div key={c.country}>
                  <div
                    className="flex items-center justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors"
                    onClick={() => setExpandedCountry(expandedCountry === c.country ? null : c.country)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-text-muted w-5">{i + 1}</span>
                      <span className="text-sm text-text-primary truncate">
                        {c.country}
                      </span>
                      {c.cities.length > 1 && (
                        <svg
                          className={`w-3.5 h-3.5 text-text-muted transition-transform ${expandedCountry === c.country ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20">
                        <MeterBar
                          percentage={parseFloat(c.percentage)}
                          color="#0891B2"
                          height={8}
                          delay={i * 0.03}
                        />
                      </div>
                      <span className="text-sm font-medium text-text-primary w-8 text-right">
                        {c.count}
                      </span>
                      <span className="text-xs text-text-muted w-12 text-right">
                        {c.percentage}%
                      </span>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedCountry === c.country && c.cities.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-10 py-1 space-y-1">
                          {c.cities.map((city) => (
                            <div key={city.city} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-text-muted">{city.city}</span>
                              <span className="text-text-primary font-medium">{city.count}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Cities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Top Cities</h3>
          {topCities.length === 0 ? (
            <p className="text-text-muted text-sm">No city data yet.</p>
          ) : (
            <div className="space-y-2">
              {topCities.map((c, i) => (
                <div
                  key={`${c.city}-${c.country}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-text-muted w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <span className="text-sm text-text-primary truncate block">
                        {c.city}
                      </span>
                      <span className="text-xs text-text-muted">{c.country}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-16">
                      <MeterBar
                        percentage={parseFloat(c.percentage)}
                        color="#10b981"
                        height={8}
                        delay={i * 0.03}
                      />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8 text-right">
                      {c.count}
                    </span>
                    <span className="text-xs text-text-muted w-12 text-right">
                      {c.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Browsers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Browsers</h3>
          {browsers.length === 0 ? (
            <p className="text-text-muted text-sm">No browser data yet.</p>
          ) : (
            <div className="space-y-3">
              {browsers.map((b, i) => {
                const colors: Record<string, string> = {
                  Chrome: '#3b82f6',
                  Firefox: '#f97316',
                  Safari: '#0ea5e9',
                  Edge: '#14b8a6',
                  Opera: '#ef4444',
                };
                return (
                  <div key={b.browser}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary">{b.browser}</span>
                      <span className="text-text-muted">
                        {b.count} ({b.percentage}%)
                      </span>
                    </div>
                    <MeterBar
                      percentage={parseFloat(b.percentage)}
                      color={colors[b.browser] || '#64748b'}
                      height={12}
                      delay={i * 0.05}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* OS Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.77 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Operating Systems</h3>
          {sessions.length === 0 ? (
            <p className="text-text-muted text-sm">No OS data yet.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const osMap = new Map<string, number>();
                for (const s of sessions) {
                  const os = s.os || 'Unknown';
                  osMap.set(os, (osMap.get(os) || 0) + 1);
                }
                const total = sessions.length || 1;
                const osData = Array.from(osMap.entries())
                  .map(([os, count]) => ({ os, count, percentage: ((count / total) * 100).toFixed(1) }))
                  .sort((a, b) => b.count - a.count);
                const colors: Record<string, string> = {
                  Windows: '#3b82f6',
                  macOS: '#475569',
                  Linux: '#f59e0b',
                  Android: '#22c55e',
                  iOS: '#0ea5e9',
                };
                return osData.map((o, i) => (
                  <div key={o.os}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary">{o.os}</span>
                      <span className="text-text-muted">{o.count} ({o.percentage}%)</span>
                    </div>
                    <MeterBar
                      percentage={parseFloat(o.percentage)}
                      color={colors[o.os] || '#64748b'}
                      height={12}
                      delay={i * 0.05}
                    />
                  </div>
                ));
              })()}
            </div>
          )}
        </motion.div>
      </div>

      {/* Event Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Event Breakdown
          </h3>
          {eventBreakdown.length === 0 ? (
            <p className="text-text-muted text-sm">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {eventBreakdown.map((ev) => {
                const maxCount = eventBreakdown[0]?.count || 1;
                const width = ((ev.count / maxCount) * 100).toFixed(1);
                return (
                  <div key={ev.type} className="flex items-center gap-3">
                    <span className="text-sm text-text-primary w-28 truncate font-mono">
                      {ev.type}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-gradient-to-r from-[#3A6A8A]/70 to-[#9ABCD8]/70 rounded flex items-center justify-end pr-2"
                      >
                        {parseFloat(width) > 20 && (
                          <span className="text-xs text-white font-medium">{ev.count}</span>
                        )}
                      </motion.div>
                    </div>
                    {parseFloat(width) <= 20 && (
                      <span className="text-xs text-text-muted w-8">{ev.count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Recent Activity
          </h3>
          {recentEvents.length === 0 ? (
            <p className="text-text-muted text-sm">No recent events.</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {recentEvents.map((ev) => {
                const time = new Date(ev.created_at);
                const timeStr = time.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const typeColors: Record<string, string> = {
                  pageview: 'bg-blue-100 text-blue-700',
                  cta_click: 'bg-green-100 text-green-700',
                  brief_submit: 'bg-emerald-100 text-emerald-700',
                  quote_submit: 'bg-emerald-100 text-emerald-700',
                  form_start: 'bg-yellow-100 text-yellow-700',
                  plan_select: 'bg-purple-100 text-purple-700',
                  demo_view: 'bg-sky-100 text-sky-700',
                  scroll_depth: 'bg-gray-100 text-gray-600',
                  time_on_page: 'bg-gray-100 text-gray-600',
                };
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-text-muted w-14 shrink-0">
                      {timeStr}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        typeColors[ev.event_type] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ev.event_type}
                    </span>
                    <span className="text-xs text-text-muted truncate">
                      {ev.url}
                      {ev.country && (
                        <span className="ml-1 opacity-70">({ev.city ? `${ev.city}, ` : ''}{ev.country})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Visitor Log — Detailed Session Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.95 }}
        className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]"
      >
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Visitor Log
          <span className="text-sm font-normal text-text-muted ml-2">
            (Last {visitorLog.length} sessions)
          </span>
        </h3>
        {visitorLog.length === 0 ? (
          <p className="text-text-muted text-sm">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Source</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">IP</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Location</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Entry Page</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Device</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Browser / OS</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Pages</th>
                  <th className="pb-2 pr-3 text-xs font-medium text-text-muted">Duration</th>
                  <th className="pb-2 text-xs font-medium text-text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                {visitorLog.map((session) => {
                  const sessionEvents = eventsBySession.get(session.id) || [];
                  const isExpanded = expandedSession === session.id;
                  const startTime = new Date(session.started_at);
                  const timeStr = startTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  }) + ' ' + startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <React.Fragment key={session.id}>
                      <tr
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      >
                        <td className="py-2 pr-3">
                          {(() => {
                            const src = resolveSource(session.referrer, session.utm_source);
                            const color = getSourceColor(src);
                            return (
                              <div className="flex items-center gap-1.5">
                                <span style={{ color }} className="shrink-0">
                                  {PLATFORM_ICONS[src] ? React.cloneElement(PLATFORM_ICONS[src], { className: 'w-3.5 h-3.5' } as Record<string, string>) : null}
                                </span>
                                <span className="text-xs font-medium text-text-primary truncate max-w-[80px]">
                                  {src}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="font-mono text-xs text-text-primary">
                            {session.ip_address || '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="text-xs">
                            {session.city && <span className="text-text-primary">{session.city}</span>}
                            {session.city && session.country && <span className="text-text-muted">, </span>}
                            <span className="text-text-muted">{session.country || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs text-text-primary truncate block max-w-[120px]">
                            {session.entry_page}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            session.device_type === 'mobile' ? 'bg-green-50 text-green-700' :
                            session.device_type === 'tablet' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {session.device_type || session.device_model || '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs text-text-muted">
                            {session.browser || '—'} / {session.os || '—'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs font-medium text-text-primary">
                            {session.pageview_count}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs text-text-muted">
                            {formatDuration(session.duration_seconds)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="text-xs text-text-muted whitespace-nowrap">
                            {timeStr}
                          </span>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && sessionEvents.length > 0 && (
                          <tr>
                            <td colSpan={9}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-gray-50 px-4 py-2 rounded-lg mb-1">
                                  <p className="text-xs font-medium text-text-muted mb-1.5">
                                    Session Events ({sessionEvents.length})
                                  </p>
                                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                    {sessionEvents
                                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                                      .map((ev) => {
                                        const t = new Date(ev.created_at);
                                        return (
                                          <div key={ev.id} className="flex items-center gap-2 text-xs py-0.5">
                                            <span className="text-text-muted w-12">
                                              {t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            <span className="font-mono text-text-primary">{ev.event_type}</span>
                                            <span className="text-text-muted truncate">{ev.url}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Empty state */}
      {events.length === 0 && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-12 shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)] text-center"
        >
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No analytics data yet
          </h3>
          <p className="text-text-muted max-w-md mx-auto">
            StrataMetrics is active and tracking. Data will appear here once visitors start arriving.
            Make sure you&apos;ve run the database-setup.sql migration.
          </p>
        </motion.div>
      )}
    </div>
  );
}
