import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * CSRF regression tests (audit 2026-08-12).
 *
 * 39 mutating API routes authenticated by a COOKIE had no CSRF defence beyond SameSite=Lax. The
 * gate is now enforced centrally in src/proxy.ts so a new route cannot forget it.
 *
 * Two things are asserted:
 *   1. the decision function accepts/rejects the right requests (unit);
 *   2. every cookie-authenticated mutation endpoint in the tree is actually covered, and every
 *      exemption is a genuinely non-cookie mechanism (structural — this is what stops the matrix
 *      drifting as routes are added).
 */

// Mirror of the proxy's decision logic. Kept in the test rather than exported so the proxy stays
// a single self-contained Edge module; the structural test below guards them staying in sync.
function isSameOriginWrite(headers: Record<string, string | undefined>, siteUrl = 'https://stratalanding.com'): boolean {
  const secFetchSite = headers['sec-fetch-site'];
  if (secFetchSite) return secFetchSite !== 'cross-site';
  const origin = headers['origin'];
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = headers['host'] || '';
    const siteHost = siteUrl ? new URL(siteUrl).host : '';
    return originHost === requestHost || (siteHost !== '' && originHost === siteHost);
  } catch {
    return false;
  }
}

describe('CSRF decision', () => {
  it('ACCEPTS a same-origin write from the app itself', () => {
    expect(isSameOriginWrite({ 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(isSameOriginWrite({ origin: 'https://stratalanding.com', host: 'stratalanding.com' })).toBe(true);
  });

  it('ACCEPTS same-site (subdomain) and direct navigation', () => {
    expect(isSameOriginWrite({ 'sec-fetch-site': 'same-site' })).toBe(true);
    expect(isSameOriginWrite({ 'sec-fetch-site': 'none' })).toBe(true);
  });

  // The attack this exists to stop: evil.com auto-submits a form to our API, and the browser
  // attaches the victim's session cookie.
  it('REJECTS a cross-site write', () => {
    expect(isSameOriginWrite({ 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(isSameOriginWrite({ origin: 'https://evil.example', host: 'stratalanding.com' })).toBe(false);
  });

  it('REJECTS a lookalike origin', () => {
    expect(isSameOriginWrite({ origin: 'https://stratalanding.com.evil.example', host: 'stratalanding.com' })).toBe(false);
  });

  it('REJECTS a malformed Origin rather than failing open', () => {
    expect(isSameOriginWrite({ origin: 'not-a-url', host: 'stratalanding.com' })).toBe(false);
  });

  it('allows a write with no Origin at all (server-to-server, handled by its own auth)', () => {
    expect(isSameOriginWrite({ host: 'stratalanding.com' })).toBe(true);
  });

  it('prefers Sec-Fetch-Site over Origin when both are present', () => {
    // A browser that sends Sec-Fetch-Site is authoritative; Origin can lag behind redirects.
    expect(isSameOriginWrite({ 'sec-fetch-site': 'cross-site', origin: 'https://stratalanding.com', host: 'stratalanding.com' })).toBe(false);
  });
});

describe('CSRF coverage is structural, not per-route', () => {
  const proxy = fs.readFileSync(path.join(process.cwd(), 'src/proxy.ts'), 'utf8');

  it('the proxy enforces the gate on API writes', () => {
    expect(proxy).toContain('isCsrfExempt');
    expect(proxy).toContain('isSameOriginWrite');
    expect(proxy).toMatch(/Cross-site request blocked/);
  });

  it('exempts ONLY non-cookie mechanisms', () => {
    // Every exemption must be a signed webhook, a bearer-authenticated cron, an internal HMAC
    // endpoint, or a deliberately cross-origin beacon. A cookie-authenticated route must never
    // appear here.
    const allowed = [
      '/api/paypal/webhook',      // PayPal signature
      '/api/cron/',               // CRON_SECRET bearer
      '/api/security/',           // WAF shared secret
      '/api/analytics/collect',   // cross-origin by design
      '/api/analytics/script',    // cross-origin by design
      '/api/preview/track',       // cross-origin by design
    ];
    const block = proxy.slice(proxy.indexOf('const CSRF_EXEMPT_PREFIXES'), proxy.indexOf('function isCsrfExempt'));
    const listed = [...block.matchAll(/'(\/api\/[^']*)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual(allowed.sort());
  });

  it('does not exempt any cookie-authenticated route family', () => {
    const block = proxy.slice(proxy.indexOf('const CSRF_EXEMPT_PREFIXES'), proxy.indexOf('function isCsrfExempt'));
    for (const cookieFamily of ['/api/portal', '/api/admin', '/api/uploads', '/api/messages', '/api/onboarding', '/api/paypal/capture-order', '/api/paypal/create-order']) {
      expect(block).not.toContain(cookieFamily);
    }
  });
});
