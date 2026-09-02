/**
 * Client-safe redirect-path validation (audit F77).
 *
 * Mirrors `validateRedirectPath` in `src/lib/security/sanitize.ts` but with ZERO Node `crypto`
 * dependency, so it's safe to import into `'use client'` components without dragging a node
 * builtin into the browser bundle. Use it anywhere a `redirectTo` taken from the URL is fed to
 * `router.push()` — otherwise `/login?redirectTo=//evil.com` becomes an open redirect / phishing
 * springboard after a successful login.
 *
 * Only same-origin paths under a known app section are allowed; anything else falls back.
 */
const ALLOWED_PREFIXES = ['/portal', '/partner-portal', '/admin', '/auth', '/times'];

export function safeClientPath(path: string | null | undefined, fallback = '/portal'): string {
  if (!path || typeof path !== 'string') return fallback;
  // Relative paths only — block protocol-relative (//evil) and absolute (https://evil) targets.
  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//')) return fallback;
  if (path.includes('://')) return fallback;
  if (path.includes('\\')) return fallback; // some browsers treat \ as /
  const isAllowed = ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`)
  );
  return isAllowed ? path : fallback;
}
