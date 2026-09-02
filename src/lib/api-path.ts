/**
 * Prefix a same-origin URL with the app's basePath at runtime.
 *
 * Local dev: NEXT_PUBLIC_BASE_PATH unset → returns the path unchanged.
 * Production behind a path-based proxy (e.g. stratalanding.com/times/*):
 *   NEXT_PUBLIC_BASE_PATH=/times → returns "/times/api/foo".
 *
 * Use this for every client-side fetch() that targets a same-origin route.
 * Next.js's <Link> and router.push() already prepend basePath automatically;
 * raw fetch() does not, which is why this helper exists.
 */
export function apiPath(p: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!base) return p;
  // Don't double-prefix if the caller already included it
  if (p.startsWith(base + '/') || p === base) return p;
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
}
