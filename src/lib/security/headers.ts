/** Security header constants for use in next.config.ts and API routes. */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), payment=(self "https://www.paypal.com" "https://www.sandbox.paypal.com")',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
} as const;

// AUDIT 2026-08-12: buildCSP() removed. It had ZERO callers — the real policy lived in
// next.config.ts and netlify.toml — so it was a third, stale definition of the CSP that could
// drift from the two that were actually served. The single source of truth is now src/proxy.ts,
// which issues a per-request nonce policy and is verified by `npm run verify:csp`.
