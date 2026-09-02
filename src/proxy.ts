import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/middleware';
import { inspectRequest, type WafVerdict } from '@/lib/security/waf';
import { wafLogSecret } from '@/lib/security/keys';

// Trusted client IP = the rightmost (proxy-appended) X-Forwarded-For entry (matches getClientIp).
function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return request.headers.get('x-real-ip') || '';
}

// ── Durable IP denylist (attacker-only, fail-open) ───────────────────────────────
// The Edge can't read Postgres per-request, so we keep a small in-isolate snapshot of currently-
// blocked IPs, refreshed asynchronously every ~30s from the gated /api/security/denylist endpoint.
// A legitimate visitor is never on this list (blocks are founder-confirmed / opt-in auto-escalation),
// and the check is a Set lookup — no perceptible latency for anyone.
// COST (Neon): the denylist is the only part of the security layer that would poll the DB on a
// timer. It's OPT-IN — unless WAF_DENYLIST=1 is set, the proxy NEVER touches Neon, so the security
// layer adds ZERO compute-hours. The pattern-based WAF (probes/scanners/honeypots) still works with
// no DB at all. Turn this on only if you actively use manual IP blocking.
const DENYLIST_ENABLED = process.env.WAF_DENYLIST === '1';
let denylist: { ips: Set<string>; at: number } = { ips: new Set(), at: 0 };
let denylistRefreshing = false;
const DENYLIST_TTL_MS = 120_000; // poll at most every 2 min (when enabled)

function maybeRefreshDenylist(request: NextRequest): void {
  if (!DENYLIST_ENABLED) return; // opt-in — no Neon cost by default
  if (denylistRefreshing || Date.now() - denylist.at < DENYLIST_TTL_MS) return;
  denylistRefreshing = true;
  const secret = wafLogSecret();
  if (!secret) { denylistRefreshing = false; return; }
  fetch(new URL('/api/security/denylist', request.url), {
    headers: { 'x-waf-secret': secret },
    signal: AbortSignal.timeout(2000),
  })
    .then((r) => (r.ok ? r.json() : { ips: [] }))
    .then((d) => {
      if (Array.isArray(d?.ips)) denylist = { ips: new Set(d.ips), at: Date.now() };
      else denylist = { ips: denylist.ips, at: Date.now() };
    })
    .catch(() => { denylist = { ips: denylist.ips, at: Date.now() }; }) // fail open — keep prior snapshot
    .finally(() => { denylistRefreshing = false; });
}

// ── WAF audit persistence (COST: this was the #1 Neon compute leak) ──────────────
// Honeypot/probe paths (/wp-admin, /.env, /xmlrpc.php, /phpmyadmin, …) are internet background
// radiation: every public domain gets scanned around the clock. Reporting each one fired a Node
// function that did a durable rate-limit write + a locked, chained audit-log transaction — ~5
// Postgres round trips per probe. Because probes arrive far more often than Neon's 5-minute
// scale-to-zero window, the compute NEVER slept: a full week of 24/7 CU-hours with zero visitors.
// Persistence is now OPT-IN. Blocking is unchanged (pattern matching is pure, runs at the Edge, and
// still 403s the attacker) and REAL security events — login failures, lockouts, admin actions — are
// logged by the Node routes directly and are NOT affected. Set WAF_AUDIT=1 only while actively
// investigating an attack; leave it off and the WAF costs zero Neon and zero function invocations.
const WAF_AUDIT = process.env.WAF_AUDIT === '1';

// Fire a WAF verdict to the Node logger (Edge can't reach Postgres directly). For blocks we await
// (the attacker is being 403'd anyway); for shadow we fire-and-forget so legit traffic isn't slowed.
async function reportWaf(request: NextRequest, verdict: WafVerdict, awaitIt: boolean): Promise<void> {
  if (!WAF_AUDIT) return; // default: no Node invocation, no Neon write — the 403 below still happens
  // AUDIT 2026-08-12 (P2): never fall back to AUTH_SECRET for this header (see security/keys.ts).
  // Without a dedicated WAF_LOG_SECRET we skip reporting rather than putting the JWT signing key
  // into request logs. Blocking is unaffected — it is pattern matching at the edge.
  const secret = wafLogSecret();
  if (!secret) return;
  try {
    const p = fetch(new URL('/api/security/event', request.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-waf-secret': secret },
      body: JSON.stringify({
        action: verdict.action,
        rule: verdict.rule,
        detail: verdict.detail,
        ip: clientIp(request),
        path: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent') || '',
      }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {});
    if (awaitIt) await p;
  } catch {
    /* logging must NEVER affect the response */
  }
}


// ── Content-Security-Policy (audit 2026-08-12) ───────────────────────────────────
// The shipped CSP used `script-src 'unsafe-inline'`, which means it provided no XSS protection at
// all — an injected <script> executes exactly as a legitimate one does.
//
// A per-request NONCE fixes that, but it carries a hard constraint that decides this design:
// a nonce is generated per request, so a statically PRERENDERED page cannot contain one. Its
// inline hydration script was written at build time and would be blocked, because CSP Level 3
// browsers ignore 'unsafe-inline' as soon as a nonce is present. Verified empirically: with a
// nonce policy applied globally, /pricing served an inline <script> with no nonce attribute.
//
// So the policy is SCOPED, which also happens to put the strength where the risk is:
//
//   NONCE'd (strict) — every route that is dynamic anyway and handles sessions, money or admin
//     data. These are exactly the pages where script injection would be worth something.
//
//   STATIC-SAFE (retains 'unsafe-inline' for scripts) — public marketing pages, which are
//     prerendered and render no user-supplied HTML. Documented, not hidden: this is the directive
//     that genuinely cannot be removed under Next's static rendering.
// A prerendered page CANNOT carry a per-request nonce, so this list must contain ONLY routes that
// are genuinely dynamic. It is verified against the real build output by
// `npm run verify:csp`, which fails if any route here turns out to be static — otherwise a future
// page that happens to prerender would silently ship a nonce policy its own inline script violates.
const NONCE_SCOPED_PREFIXES = [
  '/portal', '/partner-portal', '/times', '/proposal', '/preview', '/api',
  '/admin',
];

// Prerendered pages inside an otherwise-dynamic prefix. Confirmed static in the build output;
// they render no server-side user data (their shells are static and data arrives via API, where
// React escapes it), so the static-safe policy is the correct one for them.
const NONCE_EXCEPTIONS = [
  '/admin/login', '/admin/affiliates', '/admin/messages', '/admin/templates',
];

const CSP_SHARED = [
  "default-src 'self'",
  // style-src keeps 'unsafe-inline' on BOTH policies: React inline styles and Framer Motion's
  // animated style attributes are inline by construction, and there is no nonce mechanism for the
  // `style` attribute. Style injection cannot execute script — the residual risk is defacement.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

function strictCsp(nonce: string): string {
  return [
    // 'strict-dynamic' lets a nonce'd script load its own dependencies, which is how the PayPal
    // SDK (injected programmatically) keeps working without a host allowlist per CDN.
    // 'unsafe-inline' is retained ONLY as the CSP Level 2 fallback — Level 3 browsers ignore it
    // whenever a nonce is present, so it weakens nothing for anything modern.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    ...CSP_SHARED,
  ].join('; ');
}

function staticSafeCsp(): string {
  return [
    "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com",
    ...CSP_SHARED,
  ].join('; ');
}

function applyCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

function usesNonce(pathname: string): boolean {
  if (NONCE_EXCEPTIONS.includes(pathname)) return false;
  return NONCE_SCOPED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}


// ── CSRF: central Origin enforcement for cookie-authenticated mutations ──────────
// AUDIT 2026-08-12. 39 mutating API routes authenticated by a COOKIE had no CSRF defence beyond
// SameSite=Lax. SameSite=Lax does stop cross-site POSTs from a plain form, but it is one browser
// default away from being the only thing standing between a malicious page and an authenticated
// state change — and it does not help at all for same-site subdomain attacks.
//
// Enforced HERE rather than by wrapping 39 routes, because a per-route wrapper is something a
// future route can simply forget. The proxy sees every request.
//
// EXEMPT, deliberately — these are NOT cookie-authenticated, so an Origin requirement would break
// them while protecting nothing:
//   /api/paypal/webhook   PayPal posts it, authenticated by signature
//   /api/cron/*           Netlify scheduled functions, authenticated by CRON_SECRET bearer
//   /api/security/*       the edge WAF, authenticated by a shared secret header
//   /api/analytics/collect, /api/analytics/script, /api/preview/track
//                         cross-origin BY DESIGN — they are called from clients' own websites
const CSRF_EXEMPT_PREFIXES = [
  '/api/paypal/webhook',
  '/api/cron/',
  '/api/security/',
  '/api/analytics/collect',
  '/api/analytics/script',
  '/api/preview/track',
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * True when the request is NOT a cross-site write. Mirrors lib/security/with-protection.ts —
 * Sec-Fetch-Site when the browser sends it, Origin-vs-host otherwise.
 */
function isSameOriginWrite(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite) return secFetchSite !== 'cross-site';

  const origin = request.headers.get('origin');
  // A state-changing request with no Origin at all is not something a browser produces
  // cross-site; server-to-server callers land here and are handled by their own auth.
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('host') || '';
    const siteHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : '';
    return originHost === requestHost || (siteHost !== '' && originHost === siteHost);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  // One nonce per request. Next extracts it from the CSP on the REQUEST headers and stamps its
  // own bootstrap scripts with it — setting it only on the response is not enough.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const strict = usesNonce(request.nextUrl.pathname);
  const csp = strict ? strictCsp(nonce) : staticSafeCsp();

  // ── Layer 1: WAF — inspect EVERY request before anything else (invisible to real visitors) ──
  const verdict = inspectRequest(request);
  if (verdict.action === 'block') {
    await reportWaf(request, verdict, true);
    return new NextResponse('Forbidden', { status: 403, headers: { 'cache-control': 'no-store' } });
  }
  if (verdict.action === 'shadow') {
    void reportWaf(request, verdict, false); // log only — never blocks a visitor
  }

  // ── Durable denylist: drop confirmed-bad IPs (opt-in; fail-open; legit visitors never listed) ──
  if (DENYLIST_ENABLED) {
    maybeRefreshDenylist(request);
    if (denylist.ips.size > 0) {
      const ip = clientIp(request);
      if (ip && denylist.ips.has(ip)) {
        await reportWaf(request, { action: 'block', rule: 'denylist', detail: `denylisted ip ${ip}` }, true);
        return new NextResponse('Forbidden', { status: 403, headers: { 'cache-control': 'no-store' } });
      }
    }
  }

  // ── CSRF gate ────────────────────────────────────────────────────────────────
  const method = request.method.toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (
    isWrite &&
    request.nextUrl.pathname.startsWith('/api/') &&
    !isCsrfExempt(request.nextUrl.pathname) &&
    !isSameOriginWrite(request)
  ) {
    return NextResponse.json(
      { error: 'Cross-site request blocked.' },
      { status: 403, headers: { 'cache-control': 'no-store' } },
    );
  }

  // Inject geo headers + real client IP for analytics collect endpoint
  if (request.nextUrl.pathname === '/api/analytics/collect') {
    const geo = (request as NextRequest & { geo?: { country?: string; city?: string; latitude?: string; longitude?: string } }).geo;
    const requestHeaders = new Headers(request.headers);
    if (geo?.country) requestHeaders.set('x-country', geo.country);
    if (geo?.city) requestHeaders.set('x-nf-city', geo.city);
    if (geo?.latitude) requestHeaders.set('x-nf-latitude', geo.latitude);
    if (geo?.longitude) requestHeaders.set('x-nf-longitude', geo.longitude);

    // Forward the real client IP — x-forwarded-for has the actual visitor IP,
    // x-nf-client-connection-ip is the Netlify edge server IP (not the visitor)
    const visitorIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    if (visitorIp) requestHeaders.set('x-real-client-ip', visitorIp);

    requestHeaders.set('x-nonce', nonce);
    if (strict) requestHeaders.set('Content-Security-Policy', csp);
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  // For /times/* and /preview/* routes, forward the pathname so the root layout
  // can detect the standalone shell and skip marketing chrome. The homepage
  // needs it too: NIGHT SHIFT paints the dark body server-side off x-pathname
  // (session handling is a passthrough for these public routes anyway).
  if (
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/times') ||
    request.nextUrl.pathname.startsWith('/preview')
  ) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);
    requestHeaders.set('x-nonce', nonce);
    if (strict) requestHeaders.set('Content-Security-Policy', csp);
    return applyCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  // Portal/admin/2FA session handling (returns NextResponse.next() for everything else).
  const sessionResponse = await updateSession(request);
  return applyCsp(sessionResponse, csp);
}

export const config = {
  // Run on every route EXCEPT static assets, so the WAF covers the whole surface. The specific
  // session/analytics/standalone branches above still key off the pathname, so behavior for those
  // routes is unchanged; all other routes just get WAF-inspected and passed straight through.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand/|icons/|manifest\\.json|robots\\.txt|sitemap\\.xml|sw\\.js|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|map)$).*)',
  ],
};
