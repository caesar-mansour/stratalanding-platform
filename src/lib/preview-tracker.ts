/**
 * Browser-only engagement tracker for phone-lead preview links.
 *
 * Fire-and-forget beacons to /api/preview/track. It records scroll depth (25/50/75/100
 * milestones), active dwell time (accrued only while the tab is visible), and tab
 * hide/return, plus any discrete events the caller sends (open, view_site, stage). Dwell
 * seconds are cumulative — the server keeps the max — so a mid-session heartbeat and the
 * final pagehide flush are both safe and idempotent.
 *
 * Used by the gate page (surface 'gate'); the spec website runs an equivalent inline
 * script (surface 'site') since it lives in a separate deployment.
 */

export type Surface = 'gate' | 'site';

export interface TrackEvent {
  kind: 'open' | 'view_site' | 'site_open' | 'scroll' | 'dwell' | 'stage' | 'hide' | 'return' | 'click';
  scroll_pct?: number;
  seconds?: number;
  stage?: string;
  label?: string;
}

export interface Tracker {
  track: (e: TrackEvent) => void;
  stop: () => void;
}

const NOOP: Tracker = { track: () => {}, stop: () => {} };
const HEARTBEAT_MS = 15_000;
const SCROLL_THROTTLE_MS = 400;
const MILESTONES = [25, 50, 75, 100];

export function initPreviewTracker(opts: { vid: string; surface: Surface; endpoint?: string }): Tracker {
  if (typeof window === 'undefined' || !opts.vid) return NOOP;

  const endpoint = opts.endpoint || '/api/preview/track';
  const { vid, surface } = opts;

  let maxScroll = 0;
  const milestonesSent = new Set<number>();
  let active = 0;                 // accrued active (visible) seconds
  let since = Date.now();         // start of the current visible span
  let visible = !document.hidden;
  let stopped = false;

  function send(events: TrackEvent[]) {
    if (!events.length) return;
    const payload = JSON.stringify({ vid, events });
    try {
      const blob = new Blob([payload], { type: 'text/plain' });
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, blob)) return;
    } catch { /* fall through to fetch */ }
    try {
      fetch(endpoint, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'text/plain' } })
        .catch(() => {});
    } catch { /* ignore — tracking is best-effort */ }
  }

  const track = (e: TrackEvent) => send([{ ...e, surface } as TrackEvent & { surface: Surface }]);

  function scrollPct(): number {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 4) return 0; // page fits on screen — nothing to scroll
    return Math.max(0, Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100)));
  }

  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  function onScroll() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      const pct = scrollPct();
      if (pct > maxScroll) maxScroll = pct;
      for (const m of MILESTONES) {
        if (pct >= m && !milestonesSent.has(m)) {
          milestonesSent.add(m);
          track({ kind: 'scroll', scroll_pct: m });
        }
      }
    }, SCROLL_THROTTLE_MS);
  }

  function accrue() {
    if (visible) {
      active += Math.round((Date.now() - since) / 1000);
      since = Date.now();
    }
  }
  function flushDwell() {
    accrue();
    if (active > 0) track({ kind: 'dwell', seconds: active });
  }

  function onVisibility() {
    if (document.hidden) {
      accrue();
      visible = false;
      track({ kind: 'hide' });
      flushDwell();
    } else {
      visible = true;
      since = Date.now();
      track({ kind: 'return' });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flushDwell);
  const heartbeat = setInterval(flushDwell, HEARTBEAT_MS);

  // Record whatever the initial scroll position already is (e.g. content that fits).
  onScroll();

  return {
    track,
    stop() {
      if (stopped) return;
      stopped = true;
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushDwell);
      clearInterval(heartbeat);
      if (scrollTimer) clearTimeout(scrollTimer);
      flushDwell();
    },
  };
}

/**
 * Append the tracking id to a spec-site URL so the site can beacon which lead is viewing.
 * `returnUrl` (the gate URL, secret token included) rides in the FRAGMENT — fragments are
 * never sent to the spec-site server, its logs, or Referer headers — so the site's
 * "I love it" bar can route the prospect straight back to the gate's decision point.
 */
export function withSiteTracking(url: string, vid: string, returnUrl?: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('sv', vid);
    if (returnUrl) u.hash = 'rt=' + encodeURIComponent(returnUrl);
    return u.toString();
  } catch {
    return url;
  }
}
