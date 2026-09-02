// Outreach subsystem configuration & constants.
// Pure values + getters — no DB calls, safe to import anywhere.

// Public origin where tracking pixels, click-through redirects, and the
// unsubscribe page are served. Includes basePath when deployed under one
// (e.g. https://stratalanding.com/times) so absolute URLs in outgoing
// emails resolve correctly through the proxy.
const _SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratalanding.com';
const _SITE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const OUTREACH_SITE_URL = `${_SITE_ORIGIN.replace(/\/$/, '')}${_SITE_BASE_PATH}`;

// Tracking endpoint base paths (public, no auth)
export const TRACK_OPEN_PATH = '/track/open';
export const TRACK_CLICK_PATH = '/track/click';
export const UNSUBSCRIBE_PATH = '/unsubscribe';

// Queue worker constants
export const WORKER_CLAIM_TIMEOUT_MS = 3 * 60 * 1000; // reap stuck 'sending' claims after 3 min
export const MAX_SEND_ATTEMPTS = 3;
export const WORKER_BATCH_LIMIT = 3; // max claims per cron tick (stays under Netlify 10s)

// Hard global ceiling per user per day, independent of how many inboxes they
// have. A second line of defense against the cap-bypass race that produced
// 36+35 over-cap dispatch on 2026-04-26. Override via env if needed.
export const USER_DAILY_HARD_CAP = Number(process.env.OUTREACH_USER_DAILY_HARD_CAP ?? 50);

// Spacing defaults (per Warmbox specialist's "1 email / 5 min" rule with jitter)
export const DEFAULT_MIN_SPACING_SEC = 280;
export const DEFAULT_MAX_SPACING_SEC = 360;

// Warmup ramp: daily cap grows from 5 → 25 over 14 days
export const WARMUP_START_CAP = 5;
export const WARMUP_END_CAP = 25;
export const WARMUP_DAYS = 14;

// Reply classification threshold (below = uncertain, fallback to manual)
export const CLASSIFY_CONFIDENCE_MIN = 0.6;

// Bounce / complaint ceilings — inbox auto-pauses if crossed
export const INBOX_BOUNCE_RATE_PAUSE = 0.05;      // 5%
export const INBOX_COMPLAINT_RATE_PAUSE = 0.001;  // 0.1%

export function trackOpenUrl(token: string): string {
  return `${OUTREACH_SITE_URL}${TRACK_OPEN_PATH}/${token}.png`;
}

// SECURITY (audit L-hmac-empty): resolve the outreach signing key FAIL-CLOSED — never HMAC with an
// empty '' key (which would make the click/unsubscribe sigs and the daily IP-hash salt forgeable).
// Prefer CRON_SECRET, fall back to AUTH_SECRET (both strong, required), throw if neither is set.
function outreachSigningKey(): string {
  const key = process.env.CRON_SECRET || process.env.AUTH_SECRET;
  if (!key) throw new Error('[SECURITY] CRON_SECRET and AUTH_SECRET are both unset — refusing to sign.');
  return key;
}

// SECURITY (audit F37): bind the redirect target to the tracking token with an HMAC so the
// click-tracker can't be turned into an open redirect (`/track/click/<anything>?to=evil.com`).
// Only links WE generate carry a valid sig; the route refuses arbitrary external targets without one.
// crypto is require()d lazily so this module stays safe to import anywhere (no top-level node dep).
export function clickSig(token: string, to: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHmac } = require('crypto') as typeof import('crypto');
  const key = outreachSigningKey();
  return createHmac('sha256', key).update(`${token}:${to}`).digest('hex').slice(0, 32);
}

export function trackClickUrl(token: string, to: string): string {
  return `${OUTREACH_SITE_URL}${TRACK_CLICK_PATH}/${token}?to=${encodeURIComponent(to)}&sig=${clickSig(token, to)}`;
}

// SECURITY (audit F38): bind a signed token to the unsubscribe link so a POST can't suppress an
// ARBITRARY address (denial-of-outreach). Only links we generate carry a valid token; the route
// refuses to suppress without one. Same lazy-crypto pattern as clickSig (import-safe).
export function unsubSig(email: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHmac } = require('crypto') as typeof import('crypto');
  const key = outreachSigningKey();
  return createHmac('sha256', key).update(`unsub:${email.toLowerCase().trim()}`).digest('hex').slice(0, 32);
}

export function unsubscribeUrl(email: string): string {
  return `${OUTREACH_SITE_URL}${UNSUBSCRIBE_PATH}?email=${encodeURIComponent(email)}&token=${unsubSig(email)}`;
}

// Daily salt for ip_hash — rotates at midnight UTC so same IP on new day gets a fresh hash.
export function dailySalt(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  // Mix with a server secret so the hash isn't guessable externally. SECURITY (audit F12):
  // never the literal 'local' (which made recipient IP hashes brute-forceable) — require a real
  // secret (CRON_SECRET, falling back to AUTH_SECRET, both strong).
  return `${y}${m}${d}-${outreachSigningKey()}`;
}

// Effective daily cap considering warmup ramp.
export function effectiveDailyCap(inbox: {
  daily_cap: number;
  warmup_start_date: string | null;
  warmup_daily_cap: number | null;
}): number {
  if (!inbox.warmup_start_date || !inbox.warmup_daily_cap) return inbox.daily_cap;
  const start = new Date(inbox.warmup_start_date);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (daysElapsed >= WARMUP_DAYS) return inbox.daily_cap;
  const ratio = daysElapsed / WARMUP_DAYS;
  const ramped = Math.floor(WARMUP_START_CAP + (inbox.daily_cap - WARMUP_START_CAP) * ratio);
  return Math.max(WARMUP_START_CAP, Math.min(inbox.daily_cap, ramped));
}

// Random spacing within the inbox's configured window.
export function randomSpacingSeconds(min: number, max: number): number {
  const lo = Math.max(60, Math.floor(min));
  const hi = Math.max(lo + 1, Math.floor(max));
  return lo + Math.floor(Math.random() * (hi - lo));
}
