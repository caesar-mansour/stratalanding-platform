import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/password';
import { deleteAllUserSessions } from '@/lib/auth/session';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitCritical } from '@/lib/security/rate-limit-durable';
import { sendSecurityAlertEmail } from '@/lib/auth/emails';

export async function POST(request: Request) {
  try {
    // SECURITY (audit L-reset-rl/M4): cap reset submissions per IP (fail-safe). The token is
    // high-entropy so brute force is infeasible, but this bounds abuse and matches the other gates.
    const ip = getClientIp(request);
    if (!(await rateLimitCritical(`reset-pw:ip:${ip}`, { max: 10, windowSeconds: 3600 })).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (typeof password === 'string') {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if ([hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length < 3) {
        return NextResponse.json({ error: 'Password must include at least 3 of: uppercase, lowercase, number, special character' }, { status: 400 });
      }
    }

    const tokenHash = hashToken(token);

    // Find reset record
    const [resetRecord] = await sql`SELECT id, user_id, expires_at FROM auth_password_resets WHERE token_hash = ${tokenHash} AND used = ${false} LIMIT 1`;

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Reset link has expired' }, { status: 400 });
    }

    // Mark as used
    await sql`UPDATE auth_password_resets SET used = ${true} WHERE id = ${resetRecord.id}`;

    // Update password.
    // AUDIT 2026-08-12 (P2): also CLEAR THE LOCKOUT. Progressive lockout lives in
    // auth_users.failed_login_count / locked_until, and login checks locked_until before it checks
    // the password — so a user locked out by failed attempts could reset their password and STILL
    // be unable to log in, with nothing on screen explaining why. Resetting the password is a
    // successful proof of identity via email; it should release the lock.
    const passwordHash = await hashPassword(password);
    await sql`
      UPDATE auth_users
      SET password_hash = ${passwordHash},
          email_verified = ${true},
          failed_login_count = 0,
          locked_until = NULL
      WHERE id = ${resetRecord.user_id}
    `;

    // Invalidate all sessions (force re-login)
    await deleteAllUserSessions(resetRecord.user_id);

    // AUDIT 2026-08-12 (P2): tell the owner. A reset they did not request is the clearest early
    // signal that someone else controls their inbox or account.
    const [resetUser] = await sql`SELECT email FROM auth_users WHERE id = ${resetRecord.user_id} LIMIT 1`;
    if (resetUser?.email) void sendSecurityAlertEmail(resetUser.email as string, 'password_reset');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
