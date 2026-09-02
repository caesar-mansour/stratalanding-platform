/**
 * In-memory rate limiter for API routes.
 * Tracks requests by key (IP, email, etc.) with configurable windows.
 * Sufficient for single-instance deployments. For multi-instance, use Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume a rate limit token.
 * @param key - Unique identifier (e.g., `login:${ip}` or `contact:${ip}`)
 * @param options - Rate limit configuration
 * @returns Whether the request is allowed
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, remaining: options.max, resetAt: Date.now() + options.windowSeconds * 1000 };
  }

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
    return { allowed: true, remaining: options.max - 1, resetAt: now + options.windowSeconds * 1000 };
  }

  if (entry.count >= options.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get the client IP from request headers.
 *
 * SECURITY (audit F10/F56): the LEFTMOST `X-Forwarded-For` entry is supplied by the client
 * and was spoofable to bypass IP rate limits (login, OTP, signup, contact, etc.). The
 * trustworthy value is the entry APPENDED by the trusted proxy (Netlify) — i.e. the LAST
 * hop — not the attacker-controllable first one. We therefore use the rightmost XFF entry.
 *
 * NOTE: this assumes a single trusted proxy in front of the app (Netlify). If a second
 * trusted proxy is ever added (e.g. Cloudflare in front of Netlify), revisit the hop index
 * and verify against the real headers in staging.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
