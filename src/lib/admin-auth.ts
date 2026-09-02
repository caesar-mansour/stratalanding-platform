import { cookies, headers } from 'next/headers';
import { createHash, randomBytes } from 'crypto';
import * as OTPAuth from 'otpauth';
import { timingSafeCompare } from '@/lib/security/sanitize';

/**
 * Admin two-factor (TOTP) — audit F28. Clients have MFA; the admin gate was a single shared
 * static token with no second factor. Set ADMIN_TOTP_SECRET (a base32 secret — generate with
 * `node scripts/admin-totp-setup.cjs`) to require a 6-digit authenticator code IN ADDITION to the
 * token. Left UNSET, admin login behaves exactly as before (so this can't lock you out before
 * you've enrolled).
 */
export function isAdminTotpEnabled(): boolean {
  return !!(process.env.ADMIN_TOTP_SECRET && process.env.ADMIN_TOTP_SECRET.trim());
}

export function verifyAdminTotp(code: string): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret || !secret.trim()) return false; // only call when enabled
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'StrataLanding Admin',
      label: 'admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret.trim()),
    });
    return totp.validate({ token: code, window: 1 }) !== null;
  } catch {
    return false;
  }
}

/**
 * OPTIONAL admin IP allowlist (defense-in-depth). Set ADMIN_IP_ALLOWLIST to a
 * comma-separated list of IPs; requests from any other IP are treated as if the admin simply
 * doesn't exist.
 *
 * SCOPE — read this before relying on it (audit 2026-08-12 P2). This is enforced wherever
 * verifyAdmin() runs: every admin PAGE (via requireAdminPage) and every admin API route. It is
 * NOT enforced in the Edge middleware, which cannot resolve the client IP the same way and
 * cannot reach Postgres. So it is a strong gate on anything that reads data or performs an
 * action, and NOT a network-level block on the /admin URLs themselves. The docstring used to
 * claim it gated "ALL admin access", which overstated it.
 *
 * Leave the env var UNSET to disable (the default): then this always returns true
 * and nothing changes. When SET, a request whose IP can't be determined or isn't
 * on the list is denied (fail-closed). Netlify always provides the real client IP
 * via x-nf-client-connection-ip; we fall back to the rightmost X-Forwarded-For.
 */
export async function isAdminIpAllowed(): Promise<boolean> {
  const raw = process.env.ADMIN_IP_ALLOWLIST;
  if (!raw || !raw.trim()) return true; // feature off → no restriction
  const allow = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (allow.length === 0) return true;
  try {
    const h = await headers();
    const nf = h.get('x-nf-client-connection-ip');
    const xff = h.get('x-forwarded-for');
    const ip = (nf || (xff ? xff.split(',').map((s) => s.trim()).filter(Boolean).pop() : '') || '').trim();
    if (!ip) return false; // allowlist on but IP unknown → deny
    return allow.includes(ip);
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE = 'admin_token';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours, enforced server-side

/** Only the hash is ever stored, so a DB leak yields no usable admin cookie. */
function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Mint a NEW revocable admin session and return the raw cookie value.
 *
 * AUDIT 2026-08-12 (P1 A-01): the login route used to echo ADMIN_ACCESS_TOKEN itself back as the
 * cookie, making the cookie and the master secret the same string — unrevocable, never expiring
 * server-side. Callers must only reach this after the token + TOTP checks have passed.
 */
export async function createAdminSession(meta?: { ip?: string; userAgent?: string }): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString();
  const { default: sql } = await import('@/lib/db');
  await sql`
    INSERT INTO admin_sessions (token_hash, expires_at, ip, user_agent)
    VALUES (${hashSessionToken(token)}, ${expiresAt}, ${meta?.ip ?? null}, ${meta?.userAgent ?? null})
  `;
  return token;
}

/** Revoke one session (sign out). Unlike deleting the cookie, this kills it server-side too. */
export async function revokeAdminSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  try {
    const { default: sql } = await import('@/lib/db');
    await sql`
      UPDATE admin_sessions SET revoked_at = now()
      WHERE token_hash = ${hashSessionToken(token)} AND revoked_at IS NULL
    `;
  } catch (err) {
    console.error('[ADMIN] failed to revoke session:', err);
  }
}

/** Revoke every active admin session — the "I think my cookie leaked" button. */
export async function revokeAllAdminSessions(): Promise<number> {
  const { default: sql } = await import('@/lib/db');
  const rows = await sql`
    UPDATE admin_sessions SET revoked_at = now() WHERE revoked_at IS NULL RETURNING id
  `;
  return rows.length;
}

/**
 * Centralized admin authentication verification.
 *
 * Enforces the optional IP allowlist, then validates the `admin_token` cookie against a real
 * server-side session row: it must exist, be unrevoked, and be unexpired.
 *
 * AUDIT 2026-08-12 (P1 A-01): this used to timing-safe-compare the cookie to ADMIN_ACCESS_TOKEN,
 * which meant the cookie WAS the master secret — no expiry the server honoured and no way to
 * revoke it short of rotating the env var and redeploying.
 *
 * BACKWARD COMPATIBILITY: a cookie equal to ADMIN_ACCESS_TOKEN is still accepted while
 * ADMIN_LEGACY_COOKIE=1 is set, so an in-flight admin session survives the deploy. Leave it unset
 * (the default) and only real sessions work.
 */
export async function verifyAdmin(): Promise<boolean> {
  try {
    if (!(await isAdminIpAllowed())) return false;
    const cookieStore = await cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!adminToken) return false;

    if (process.env.ADMIN_LEGACY_COOKIE === '1') {
      const validToken = process.env.ADMIN_ACCESS_TOKEN;
      if (validToken && timingSafeCompare(adminToken, validToken)) return true;
    }

    const { default: sql } = await import('@/lib/db');
    const [session] = await sql`
      SELECT id FROM admin_sessions
      WHERE token_hash = ${hashSessionToken(adminToken)}
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `;
    if (!session) return false;

    // Best-effort activity stamp; never let it fail the auth decision.
    sql`UPDATE admin_sessions SET last_seen_at = now() WHERE id = ${session.id}`.catch(() => {});
    return true;
  } catch {
    return false;
  }
}
