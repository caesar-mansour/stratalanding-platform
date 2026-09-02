#!/usr/bin/env node
/**
 * Verify the shipped Content-Security-Policy against a RUNNING production build.
 *
 * AUDIT 2026-08-12. The old policy carried `script-src 'unsafe-inline'`, which means it provided no
 * XSS protection at all. It is now a scoped nonce policy, and that scoping has a sharp edge worth
 * automating:
 *
 *   A statically PRERENDERED page cannot carry a per-request nonce. Its inline hydration script was
 *   written at build time, and CSP Level 3 browsers ignore 'unsafe-inline' the moment a nonce is
 *   present — so serving a nonce policy to a prerendered page BLOCKS its own bootstrap script and
 *   the page dies silently in the browser while returning HTTP 200 to curl.
 *
 * This script therefore checks the thing that actually breaks: for every route, if the response
 * carries a nonce, every inline <script> in the body must carry that same nonce.
 *
 *   npm run build && npm run start   (in another shell, DB_SSL_DISABLE=1 locally)
 *   npm run verify:csp
 */

const BASE = process.env.VERIFY_BASE_URL || 'http://localhost:3000';

// Representative routes across both policy classes.
const ROUTES = [
  // expected: static-safe (no nonce)
  '/', '/pricing', '/about', '/contact', '/brief', '/quote', '/blog', '/partners',
  '/privacy', '/terms', '/login', '/auth/forgot-password', '/admin/login',
  // expected: strict (nonce)
  '/portal', '/admin', '/times/outreach',
];

const REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

(async () => {
  let failures = 0;
  let strictCount = 0;
  let staticSafeCount = 0;

  for (const route of ROUTES) {
    let res;
    try {
      res = await fetch(BASE + route, { redirect: 'manual' });
    } catch (err) {
      console.error(`✗ ${route} — could not reach ${BASE} (${err.message})`);
      failures++;
      continue;
    }

    const csp = res.headers.get('content-security-policy');
    if (!csp) {
      console.error(`✗ ${route} — NO Content-Security-Policy header`);
      failures++;
      continue;
    }

    for (const directive of REQUIRED_DIRECTIVES) {
      if (!csp.includes(directive)) {
        console.error(`✗ ${route} — CSP missing "${directive}"`);
        failures++;
      }
    }

    const nonceMatch = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    const body = await res.text();
    // Inline scripts are <script> or <script ...> WITHOUT a src attribute.
    const inlineScripts = [...body.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)].map((m) => m[1]);

    if (nonceMatch) {
      strictCount++;
      const nonce = nonceMatch[1];
      const unnonced = inlineScripts.filter((attrs) => !attrs.includes(`nonce="${nonce}"`));
      if (unnonced.length > 0) {
        console.error(
          `✗ ${route} — STRICT policy but ${unnonced.length} inline <script> without the nonce. ` +
          `These are blocked in the browser. Route is probably prerendered; add it to ` +
          `NONCE_EXCEPTIONS in src/proxy.ts or make it dynamic.`,
        );
        failures++;
      } else {
        console.log(`✓ ${route} — strict (nonce), ${inlineScripts.length} inline script(s) all nonce'd`);
      }
      if (!csp.includes("'strict-dynamic'")) {
        console.error(`✗ ${route} — nonce present but 'strict-dynamic' missing`);
        failures++;
      }
    } else {
      staticSafeCount++;
      // No nonce: 'unsafe-inline' must be present or the page's own bootstrap script is blocked.
      if (!csp.includes("'unsafe-inline'")) {
        console.error(`✗ ${route} — no nonce AND no 'unsafe-inline' — inline scripts will be blocked`);
        failures++;
      } else {
        console.log(`✓ ${route} — static-safe policy (${inlineScripts.length} inline script(s))`);
      }
    }
  }

  console.log(`\n${strictCount} strict route(s), ${staticSafeCount} static-safe route(s).`);
  if (failures > 0) {
    console.error(`\n${failures} CSP problem(s).`);
    process.exit(1);
  }
  console.log('CSP verification passed.');
})();
