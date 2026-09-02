/**
 * Uniform route protection wrapper (audit F34 rate-limit coverage + F73 CSRF/Origin).
 *
 * Wrap any App-Router route handler to get, in one place:
 *   1. Durable per-IP rate limiting (shared across serverless instances — see rate-limit-durable).
 *   2. Optional per-identity (email/account) rate limiting via `identityKey`.
 *   3. Origin / Sec-Fetch-Site CSRF defense on state-changing (non-GET) requests.
 *
 * It is intentionally NON-INVASIVE: it wraps the exported handler and preserves its
 * `(request, ctx)` signature, so adopting it is a one-line change per route and never moves
 * business logic. Body-shape validation lives separately in `src/lib/validation` (parseJson),
 * because a Request body can only be read once and most handlers read it themselves.
 *
 *   export const POST = withProtection(handler, { name: 'ref', rateLimit: { max: 30, windowSeconds: 3600 } });
 */
import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

type RouteContext = { params?: Promise<Record<string, string>> };
type RouteHandler = (request: Request, ctx: RouteContext) => Promise<Response> | Response;

export interface ProtectionOptions {
  /** Bucket prefix for rate-limit keys, e.g. "ref" → bucket "ref:ip:1.2.3.4". Required. */
  name: string;
  /** Per-IP durable rate limit. Omit to skip IP limiting (e.g. pure CSRF protection). */
  rateLimit?: { max: number; windowSeconds: number };
  /**
   * Optional per-identity rate limit. The extractor returns a stable string (e.g. an email)
   * from the request, or null to skip. Runs IN ADDITION to the per-IP limit, so a spoofed IP
   * can't escape a per-account cap. The body is NOT consumed (works off headers/url/clone).
   */
  identity?: {
    extract: (request: Request) => Promise<string | null> | string | null;
    max: number;
    windowSeconds: number;
  };
  /**
   * CSRF/Origin enforcement on non-GET requests. Default: true. Set false for server-to-server
   * callers that legitimately send no browser Origin AND must accept cross-site (e.g. payment
   * provider webhooks) — those routes verify authenticity by signature instead.
   */
  csrf?: boolean;
  /**
   * Report-only rollout: log what WOULD be blocked but allow it through. Use for ~24h on a new
   * public endpoint to size real traffic before enforcing. Default: false (enforce).
   */
  reportOnly?: boolean;
}

/** Origins we accept browser requests from: the configured site URL + the request's own host. */
function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  // Modern browsers send this on every request. same-origin / same-site / none(=direct nav) are fine;
  // only cross-site is a CSRF signal.
  if (secFetchSite) {
    return secFetchSite !== 'cross-site';
  }
  // Fallback for clients that don't send Sec-Fetch-*: compare Origin host to the request host.
  const origin = request.headers.get('origin');
  if (!origin) return true; // no Origin (server-to-server, some same-origin GETs) — not a CSRF vector
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('host') || '';
    const siteHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : '';
    return originHost === requestHost || (siteHost !== '' && originHost === siteHost);
  } catch {
    return false;
  }
}

function tooMany(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export function withProtection(handler: RouteHandler, opts: ProtectionOptions): RouteHandler {
  return async (request: Request, ctx: RouteContext = {}) => {
    const method = request.method.toUpperCase();
    const enforceCsrf = opts.csrf !== false && method !== 'GET' && method !== 'HEAD';

    // 1. CSRF / Origin defense (belt-and-suspenders over SameSite=lax cookies).
    if (enforceCsrf && !isSameOriginRequest(request)) {
      if (opts.reportOnly) {
        console.warn(`[PROTECT] would block cross-site ${method} on ${opts.name}`);
      } else {
        return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
      }
    }

    // 2. Per-IP durable rate limit.
    if (opts.rateLimit) {
      const ip = getClientIp(request);
      const res = await rateLimitDurable(`${opts.name}:ip:${ip}`, opts.rateLimit);
      if (!res.allowed) {
        if (opts.reportOnly) {
          console.warn(`[PROTECT] would rate-limit ${opts.name} ip=${ip}`);
        } else {
          return tooMany(res.resetAt);
        }
      }
    }

    // 3. Per-identity durable rate limit (e.g. per-email), resistant to IP rotation.
    if (opts.identity) {
      const id = await opts.identity.extract(request);
      if (id) {
        const res = await rateLimitDurable(`${opts.name}:id:${id.toLowerCase()}`, {
          max: opts.identity.max,
          windowSeconds: opts.identity.windowSeconds,
        });
        if (!res.allowed) {
          if (opts.reportOnly) {
            console.warn(`[PROTECT] would rate-limit ${opts.name} id=${id}`);
          } else {
            return tooMany(res.resetAt);
          }
        }
      }
    }

    return handler(request, ctx);
  };
}
