/**
 * Durable, cross-instance rate limiter (audit F9).
 *
 * The legacy `src/lib/rate-limit.ts` limiter is an in-memory Map: it resets on every Netlify
 * serverless cold start and is NOT shared between concurrent instances, so an attacker could
 * bypass every limit (login, signup, OTP, email) by spreading requests across cold instances.
 *
 * This limiter keeps the authoritative counter in Postgres (`rate_limit_counters`, migration
 * 047) via a single atomic `INSERT … ON CONFLICT` statement, so the count is correct regardless
 * of which instance serves the request.
 *
 * FAIL-OPEN by design: if the DB is unreachable we log and ALLOW. A rate limiter must never be
 * able to lock the whole site out during a DB blip — availability beats the marginal abuse risk.
 * Pair with the in-memory `rateLimit()` as an L1 fast-reject to bound DB writes under a flood.
 */
import sql from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export interface DurableRateLimitOptions {
  /** Max requests allowed within the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface DurableRateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window (>= 0). */
  remaining: number;
  /** Unix ms when the current window resets. */
  resetAt: number;
  /** True if the check failed open because the store was unreachable. */
  degraded: boolean;
}

/**
 * Atomically increment the counter for `key` and report whether the request is allowed.
 *
 * The single statement both creates the window and reset-or-increments it: when the stored
 * window has already elapsed (`expires_at < now()`) it restarts at 1, otherwise it increments.
 * Postgres takes a row lock on the conflicting row, so concurrent requests can't race past `max`.
 */
export async function rateLimitDurable(
  key: string,
  options: DurableRateLimitOptions
): Promise<DurableRateLimitResult> {
  const { max, windowSeconds } = options;

  // COST (Neon): L1 in-memory fast-reject — the pairing this file's own docs prescribe but that no
  // call site actually did. Every public form (contact, quote, brief, signup, magic-link, OTP) called
  // straight through to Postgres, so spam bots hammering a contact form wrote a row per attempt and
  // held the database awake around the clock.
  //
  // Sound to deny on: an instance's local count is a LOWER BOUND on the true global count, so if the
  // local count already exceeds `max`, the real one does too. It can never reject a request the
  // durable counter would have allowed — it only stops re-asking Postgres a question already
  // answered. Distinct key prefix so this counter can't collide with a direct rateLimit() of the
  // same key (notably rateLimitCritical's degraded-mode fallback below).
  const l1 = rateLimit(`l1:${key}`, { max, windowSeconds });
  if (!l1.allowed) {
    return { allowed: false, remaining: 0, resetAt: l1.resetAt, degraded: false };
  }

  try {
    const [row] = await sql<{ count: number; expires_at: Date }[]>`
      INSERT INTO rate_limit_counters (bucket, window_start, count, expires_at)
      VALUES (${key}, now(), 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT (bucket) DO UPDATE SET
        count = CASE
          WHEN rate_limit_counters.expires_at < now() THEN 1
          ELSE rate_limit_counters.count + 1
        END,
        window_start = CASE
          WHEN rate_limit_counters.expires_at < now() THEN now()
          ELSE rate_limit_counters.window_start
        END,
        expires_at = CASE
          WHEN rate_limit_counters.expires_at < now() THEN now() + make_interval(secs => ${windowSeconds})
          ELSE rate_limit_counters.expires_at
        END
      RETURNING count, expires_at
    `;

    const count = Number(row.count);
    const resetAt = new Date(row.expires_at).getTime();
    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt,
      degraded: false,
    };
  } catch (error) {
    // Fail open — never let the limiter store take the site down.
    console.error('[RATE-LIMIT] durable store unavailable, failing open for', key, error);
    return {
      allowed: true,
      remaining: max,
      resetAt: Date.now() + windowSeconds * 1000,
      degraded: true,
    };
  }
}

/**
 * SECURITY (audit M4): fail-SAFE limiter for auth-critical gates (login, admin-login, MFA verify,
 * password reset). It uses the durable Postgres counter, but if that fails OPEN (DB unreachable or
 * the `rate_limit_counters` table not yet applied), it falls back to the in-memory L1 limiter
 * instead of allowing unbounded attempts. A single instance still bounds brute-force during a DB
 * blip, so a transient outage can't silently disable every auth throttle. Use this — not the bare
 * `rateLimitDurable` — anywhere the limiter is the primary defense against credential attacks.
 */
export async function rateLimitCritical(
  key: string,
  options: DurableRateLimitOptions
): Promise<DurableRateLimitResult> {
  const durable = await rateLimitDurable(key, options);
  if (!durable.degraded) return durable;

  // Durable store unavailable — enforce the in-memory backstop rather than failing open.
  const mem = rateLimit(key, options);
  return {
    allowed: mem.allowed,
    remaining: mem.remaining,
    resetAt: mem.resetAt,
    degraded: true,
  };
}
