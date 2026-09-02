import { NextRequest, NextResponse, after } from 'next/server';
import sql from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEngagementAlert } from '@/lib/preview-alerts';

/**
 * Public engagement beacon for phone-lead preview links.
 *
 * Both the gate page (stratalanding.com/preview/<token>) and the spec website
 * (previews.example.com, opened with ?sv=<link id>) POST here to record whether the
 * lead opened the link, clicked through to the site, how far they scrolled, how long they
 * stayed and when they left. Fire-and-forget: navigator.sendBeacon sends a text/plain body
 * (CORS-safelisted → no preflight), and we never read the response, so no ACAO handshake is
 * needed. Keyed by the link's opaque id (a random UUID, NOT the secret token).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(['open', 'view_site', 'site_open', 'scroll', 'dwell', 'stage', 'hide', 'return', 'click']);
const SURFACES = new Set(['gate', 'site']);
const STAGES = new Set([
  'welcome', 'proposal', 'code', 'decline',
  'done-approved', 'done-emailed', 'done-declined', 'done-exploring', 'approved',
]);
const MAX_EVENTS = 30;
const MAX_BODY = 8000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ok = () => new NextResponse(null, { status: 204, headers: CORS });

export function OPTIONS() {
  return ok();
}

interface Norm {
  kind: string;
  surface: 'gate' | 'site';
  scroll: number | null;
  seconds: number | null;
  stage: string | null;
  label: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Cap per IP so this unauthenticated endpoint can't be flooded (in-memory, zero DB cost).
    if (!rateLimit(`preview-track:ip:${getClientIp(request)}`, { max: 900, windowSeconds: 3600 }).allowed) {
      return ok();
    }

    // sendBeacon delivers a text/plain body; read raw then parse (never trust the header).
    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY) return ok();

    let body: { vid?: unknown; events?: unknown };
    try { body = JSON.parse(raw); } catch { return ok(); }

    const vid = String(body.vid || '');
    if (!UUID_RE.test(vid)) return ok();

    const rawEvents = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
    if (rawEvents.length === 0) return ok();

    const rows: Norm[] = [];
    for (const e of rawEvents as Record<string, unknown>[]) {
      const kind = String(e?.kind || '');
      if (!KINDS.has(kind)) continue;
      const surface: 'gate' | 'site' = e?.surface === 'site' ? 'site' : 'gate';
      const scroll = kind === 'scroll' ? clampInt(e?.scroll_pct, 0, 100) : null;
      const seconds = kind === 'dwell' ? clampInt(e?.seconds, 0, 86_400) : null;
      const stage = kind === 'stage' && typeof e?.stage === 'string' && STAGES.has(e.stage) ? e.stage : null;
      const label = kind === 'click' && typeof e?.label === 'string' ? sanitizeLabel(e.label) : null;
      rows.push({ kind, surface, scroll, seconds, stage, label });
    }
    if (rows.length === 0) return ok();

    // Confirm the link exists before writing — silently drop otherwise (no info leak / no orphans).
    const [link] = await sql`SELECT id FROM preview_links WHERE id = ${vid} LIMIT 1`;
    if (!link) return ok();

    const ua = (request.headers.get('user-agent') || '').slice(0, 300);

    const eventRows = rows.map((r) => ({
      link_id: vid, kind: r.kind, surface: r.surface,
      scroll_pct: r.scroll, seconds: r.seconds, stage: r.stage, label: r.label, ua,
    }));
    await sql`
      INSERT INTO preview_events ${sql(eventRows, 'link_id', 'kind', 'surface', 'scroll_pct', 'seconds', 'stage', 'label', 'ua')}
    `;

    // Roll the batch up onto the link. Timestamps latch once (COALESCE); depth/dwell keep the
    // max (GREATEST) since the client reports cumulative values. Idempotent on replays.
    const hasOpen = rows.some((r) => r.kind === 'open');
    const hasViewSite = rows.some((r) => r.kind === 'view_site');
    const hasSiteOpen = rows.some((r) => r.kind === 'site_open');
    const gateScroll = maxBy(rows, (r) => (r.kind === 'scroll' && r.surface === 'gate' ? r.scroll || 0 : 0));
    const siteScroll = maxBy(rows, (r) => (r.kind === 'scroll' && r.surface === 'site' ? r.scroll || 0 : 0));
    const gateSeconds = maxBy(rows, (r) => (r.kind === 'dwell' && r.surface === 'gate' ? r.seconds || 0 : 0));
    const siteSeconds = maxBy(rows, (r) => (r.kind === 'dwell' && r.surface === 'site' ? r.seconds || 0 : 0));
    const lastStage = [...rows].reverse().find((r) => r.kind === 'stage')?.stage ?? null;
    const clickCount = rows.filter((r) => r.kind === 'click').length;
    const hasLike = rows.some((r) => r.kind === 'click' && r.label === 'like');
    const hasBookingDemo = rows.some((r) => r.kind === 'click' && r.label?.startsWith('booking_demo'));

    // Self-join so RETURNING can compare pre-update (`old`, read from the FROM snapshot)
    // with post-update values — first-open / first-site-visit / like transitions detected
    // once-per-transition by construction, which is what debounces the hot-lead alerts.
    const [roll] = await sql`
      UPDATE preview_links p SET
        last_seen_at    = now(),
        open_count      = p.open_count + ${hasOpen ? 1 : 0},
        first_opened_at = COALESCE(p.first_opened_at, CASE WHEN ${hasOpen}     THEN now() ELSE NULL END),
        viewed_site_at  = COALESCE(p.viewed_site_at,  CASE WHEN ${hasViewSite} THEN now() ELSE NULL END),
        site_reached_at = COALESCE(p.site_reached_at, CASE WHEN ${hasSiteOpen} THEN now() ELSE NULL END),
        gate_scroll_pct = GREATEST(p.gate_scroll_pct, ${gateScroll}),
        site_scroll_pct = GREATEST(p.site_scroll_pct, ${siteScroll}),
        gate_seconds    = GREATEST(p.gate_seconds, ${gateSeconds}),
        site_seconds    = GREATEST(p.site_seconds, ${siteSeconds}),
        click_count     = p.click_count + ${clickCount},
        liked_at        = COALESCE(p.liked_at, CASE WHEN ${hasLike} THEN now() ELSE NULL END),
        last_stage      = COALESCE(${lastStage}::text, p.last_stage)
      FROM preview_links old
      WHERE p.id = ${vid} AND old.id = ${vid}
      RETURNING p.practice_name,
        (old.first_opened_at IS NULL AND p.first_opened_at IS NOT NULL) AS t_open,
        (old.viewed_site_at IS NULL AND old.site_reached_at IS NULL
          AND (p.viewed_site_at IS NOT NULL OR p.site_reached_at IS NOT NULL)) AS t_site,
        (old.liked_at IS NULL AND p.liked_at IS NOT NULL) AS t_like
    `;

    // Hot-lead alert: email the founder while the prospect is literally on the page.
    // Fired via after() so the 204 below gains zero latency; sendEngagementAlert applies
    // its own per-link daily cap (covers repeat booking-demo submits + beacon races).
    if (roll && (roll.t_like || roll.t_site || roll.t_open || hasBookingDemo)) {
      const moments: string[] = [];
      if (roll.t_like) moments.push('tapped "I love it" ❤');
      if (roll.t_site) moments.push('is browsing their new site right now');
      if (roll.t_open) moments.push('opened their preview');
      if (hasBookingDemo) moments.push('tested the booking form on their demo');
      after(() => sendEngagementAlert(vid, String(roll.practice_name), moments));
    }

    return ok();
  } catch (error) {
    console.error('preview track error:', error);
    return ok(); // never surface an error to the beacon caller
  }
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function maxBy<T>(arr: T[], f: (x: T) => number): number {
  let m = 0;
  for (const x of arr) { const v = f(x); if (v > m) m = v; }
  return m;
}

function sanitizeLabel(s: string): string {
  let out = '';
  for (const ch of s) { const c = ch.charCodeAt(0); if (c >= 32 && c !== 127) out += ch; }
  return out.replace(/\s+/g, ' ').trim().slice(0, 80);
}
