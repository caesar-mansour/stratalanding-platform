// Bot / prefetcher / Apple MPP detection for outreach tracking pixel + click endpoints.
// Patterns derived from `src/app/api/analytics/collect/route.ts` — kept in sync
// with the site analytics bot filter so we catch the same crawlers/prefetchers.
//
// Usage:
//   const { isBot, openType } = classifyOpenRequest(userAgent, ip);
//   if (isBot) return pixel(); // don't log
//   logOpen(sendId, openType); // 'real' | 'mpp_prefetch' | 'gmail_proxy' | 'unknown'

import crypto from 'crypto';
import { dailySalt } from './config';

// Full bot blocklist — mirrors /api/analytics/collect.
const BOT_UA_PATTERNS: RegExp[] = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /facebookexternalhit/i, /linkedinbot/i, /twitterbot/i, /whatsapp/i,
  /telegrambot/i, /discordbot/i, /slackbot/i,
  /google-smtp-source/i,
  /yahoo.*slurp/i, /bingpreview/i, /msnbot/i,
  /applebot/i, /duckduckbot/i, /baiduspider/i, /yandexbot/i,
  /semrushbot/i, /ahrefsbot/i, /dotbot/i, /rogerbot/i,
  /screaming frog/i, /gtmetrix/i, /pingdom/i, /uptimerobot/i,
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /selenium/i,
  /curl/i, /wget/i, /python-requests/i, /httpx/i, /axios/i,
  /go-http-client/i, /java\//i, /libwww/i, /lwp-/i,
  // Email-scanning appliances (safe to drop)
  /barracuda/i, /symantec/i, /proofpoint/i, /mimecast/i,
  /forcepoint/i, /messagelabs/i, /fireeye/i,
];

// Email clients/proxies we want to *log* but flag as non-human (for open-type).
const GMAIL_PROXY_PATTERNS: RegExp[] = [
  /googleimageproxy/i,
  /GoogleImageProxy/i,
];

// Apple Mail Privacy Protection: fetches pixels at message delivery via iCloud
// Private Relay. UA is usually plain Safari + iCloud referer. We use IP range as
// a secondary signal.
const APPLE_MPP_UA_PATTERNS: RegExp[] = [
  /Macintosh.*Mail\//i,          // Native Mail app
  /iPhone.*Mail\//i,             // iOS Mail
  /iPad.*Mail\//i,
];

// Apple MPP / iCloud Private Relay IP ranges (subset — Apple publishes full list).
// Use first-octet + second-octet prefix matching; good enough for our purposes.
const APPLE_MPP_IP_PREFIXES: string[] = [
  '17.',            // Apple's /8
  '172.224.',       // iCloud Private Relay
  '172.225.',
  // Removed '104.28.' (generic Cloudflare) — audit F78: it misclassified real
  // Cloudflare-fronted opens as MPP prefetch and could auto-pause healthy inboxes.
];

function isAppleMppByIp(ip: string | null): boolean {
  if (!ip) return false;
  return APPLE_MPP_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function isAppleMppByUa(ua: string | null): boolean {
  if (!ua) return false;
  return APPLE_MPP_UA_PATTERNS.some((p) => p.test(ua));
}

export type OpenClassification =
  | { isBot: true; openType?: never }
  | { isBot: false; openType: 'real' | 'mpp_prefetch' | 'gmail_proxy' | 'unknown' };

export function classifyOpenRequest(
  userAgent: string | null,
  ipAddress: string | null,
  fetchDest?: string | null,
): OpenClassification {
  // Prefetch Sec-Fetch-Dest from browsers / proxies means "we're loading this but not showing it"
  if (fetchDest === 'prefetch') {
    return { isBot: true };
  }

  // No UA at all — strong bot signal
  if (!userAgent) {
    return { isBot: true };
  }

  // Hard bot drop
  if (BOT_UA_PATTERNS.some((p) => p.test(userAgent))) {
    return { isBot: true };
  }

  // Gmail image proxy — log but mark as cached/proxy open
  if (GMAIL_PROXY_PATTERNS.some((p) => p.test(userAgent))) {
    return { isBot: false, openType: 'gmail_proxy' };
  }

  // Apple MPP — log but do not count in "real opens"
  if (isAppleMppByUa(userAgent) || isAppleMppByIp(ipAddress)) {
    return { isBot: false, openType: 'mpp_prefetch' };
  }

  // Real human open
  return { isBot: false, openType: 'real' };
}

// Hash an IP with a rotating daily salt, so the same IP on a new day yields a
// different hash (lets us track multi-day opens) while dedupe-within-day works.
export function hashIp(ip: string | null | undefined, when: Date = new Date()): string | null {
  if (!ip) return null;
  const h = crypto.createHash('sha256');
  h.update(ip);
  h.update('|');
  h.update(dailySalt(when));
  return h.digest('hex').slice(0, 32);
}

// Extract the client IP from a Next.js request, honoring common proxy headers.
export function getClientIpFromRequest(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    // SECURITY (audit F10): use the rightmost (trusted-proxy-appended) entry, not the
    // client-controllable leftmost one.
    const parts = xf.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr.trim();
  const xf2 = req.headers.get('cf-connecting-ip');
  if (xf2) return xf2.trim();
  return null;
}
