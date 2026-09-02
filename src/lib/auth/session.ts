import { cookies } from 'next/headers';
import sql from '@/lib/db';
import { generateToken, hashToken, generateSessionJWT, verifySessionJWT, type SessionJWTPayload } from './tokens';
import { AUTH_COOKIE_NAME, SESSION_DURATION_MS } from './constants';

export async function createSession(
  userId: string,
  email: string,
  hasMfa: boolean,
  aal: 'aal1' | 'aal2' = 'aal1'
): Promise<{ jwt: string; expiresAt: Date }> {
  const sessionToken = generateToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await sql`
    INSERT INTO auth_sessions (user_id, token_hash, aal, expires_at)
    VALUES (${userId}, ${tokenHash}, ${aal}, ${expiresAt.toISOString()})
    RETURNING id
  `;

  if (!session) {
    throw new Error('Failed to create session');
  }

  const jwt = await generateSessionJWT({
    userId,
    email,
    sessionId: session.id,
    aal,
    hasMfa,
    expiresAt,
  });

  return { jwt, expiresAt };
}

export async function getSessionFromJWT(token: string): Promise<{
  payload: SessionJWTPayload;
  valid: boolean;
} | null> {
  const payload = await verifySessionJWT(token);
  if (!payload) return null;

  const [session] = await sql`
    SELECT id, expires_at FROM auth_sessions WHERE id = ${payload.sid} LIMIT 1
  `;

  if (!session) return null;

  return { payload, valid: true };
}

/**
 * SECURITY (audit H1): validate a session token against the DATABASE, not just the JWT
 * signature. Confirms the `auth_sessions` row still exists (so an explicit sign-out or a
 * password reset — both of which delete the row — actually revoke the token) and that it has
 * not expired, then returns the payload carrying the AUTHORITATIVE `aal` from the row.
 *
 * Use this on session-scoped endpoints (mfa/enroll, mfa/verify, mfa/factors, session, signout)
 * that must operate on an aal1 session and therefore cannot go through `getServerUser`, which
 * enforces the aal2 step-up gate meant for data access. Returns null if the token is invalid,
 * revoked, or expired.
 */
export async function getLiveSession(token: string): Promise<SessionJWTPayload | null> {
  const payload = await verifySessionJWT(token);
  if (!payload) return null;

  const [session] = await sql`
    SELECT id, aal, expires_at FROM auth_sessions WHERE id = ${payload.sid} LIMIT 1
  `;

  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at as string) < new Date()) return null;

  // Trust the DB's aal over the JWT copy (the JWT may be a stale aal1 issued before step-up).
  return { ...payload, aal: (session.aal as 'aal1' | 'aal2') ?? payload.aal };
}

export async function upgradeSessionToAAL2(
  sessionId: string,
  userId: string,
  email: string
): Promise<string> {
  await sql`UPDATE auth_sessions SET aal = 'aal2' WHERE id = ${sessionId}`;

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const jwt = await generateSessionJWT({
    userId,
    email,
    sessionId,
    aal: 'aal2',
    hasMfa: true,
    expiresAt,
  });

  return jwt;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM auth_sessions WHERE id = ${sessionId}`;
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await sql`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
}

/**
 * Kill every session for a user EXCEPT the one making the request.
 *
 * AUDIT 2026-08-12 (P2): used when MFA is switched on. `has_mfa` is baked into the JWT at login,
 * and getServerUser() gates on it — so sessions minted before enrolment carry has_mfa:false, never
 * trip the aal2 check, and keep full access with no second factor. Enrolling must therefore
 * invalidate them, while leaving the enrolling session usable so the user isn't logged out
 * mid-setup.
 */
export async function deleteOtherUserSessions(userId: string, keepSessionId: string): Promise<void> {
  await sql`DELETE FROM auth_sessions WHERE user_id = ${userId} AND id <> ${keepSessionId}`;
}

export async function setSessionCookie(jwt: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete('portal_verified');
  cookieStore.delete('portal_user_email');
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}

export async function refreshSessionJWT(
  sessionId: string,
  userId: string,
  email: string,
  hasMfa: boolean,
  aal: 'aal1' | 'aal2'
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  return generateSessionJWT({
    userId,
    email,
    sessionId,
    aal,
    hasMfa,
    expiresAt,
  });
}
