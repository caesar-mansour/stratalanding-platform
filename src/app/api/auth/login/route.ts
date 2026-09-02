import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyPassword, DUMMY_BCRYPT_HASH } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { hasVerifiedFactors } from '@/lib/auth/mfa';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitCritical } from '@/lib/security/rate-limit-durable';
import { logSecurityEvent } from '@/lib/security/audit-log';
import { withProtection } from '@/lib/security/with-protection';

// SECURITY (audit M6): add an Origin/Sec-Fetch CSRF guard over the SameSite=lax session cookie
// (belt-and-suspenders) so a cross-site page can't drive a login on the victim's behalf.
export const POST = withProtection(postHandler, { name: 'login', csrf: true });

async function postHandler(request: Request) {
  try {
    // SECURITY (audit F9/F23): DURABLE per-IP throttle (5 / 15 min). The old in-memory limiter
    // reset on every serverless cold start, so brute-force was bypassable. This durable gate also
    // bounds how fast any single IP can drive a victim's account toward the progressive lockout
    // below (an IP can contribute at most 5 failures per window), blunting lockout-as-DoS (F23).
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const { allowed } = await rateLimitCritical(`login:ip:${ip}`, { max: 5, windowSeconds: 900 });
    if (!allowed) {
      await logSecurityEvent({ event: 'rate_limit_exceeded', ip, userAgent, details: { endpoint: 'login' }, severity: 'warn' });
      return NextResponse.json({ error: 'Too many login attempts. Please try again in 15 minutes.' }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Input length validation
    if (typeof email !== 'string' || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length > 128) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user (include lockout columns)
    const [user] = await sql`SELECT id, email, password_hash, email_verified, failed_login_count, locked_until FROM auth_users WHERE email = ${normalizedEmail} LIMIT 1`;

    if (!user) {
      // SECURITY (audit F13): run a dummy bcrypt compare so a non-existent email takes the same
      // time as a wrong password — no timing oracle for email enumeration.
      await verifyPassword(password, DUMMY_BCRYPT_HASH);
      await logSecurityEvent({ event: 'login_failure', email: normalizedEmail, ip, userAgent, details: { reason: 'user_not_found' } });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      await logSecurityEvent({ event: 'login_failure', userId: user.id, email: normalizedEmail, ip, userAgent, details: { reason: 'account_locked' }, severity: 'warn' });
      return NextResponse.json({ error: `Account temporarily locked. Try again in ${minutesLeft} minutes.` }, { status: 429 });
    }

    // Check if user has a password set. SECURITY (audit F13): return the SAME generic message as
    // a wrong password so this doesn't reveal that the email exists but is password-less. The
    // login page always offers "email me a sign-in link" for legitimate magic-link/passwordless users.
    if (!user.password_hash) {
      await verifyPassword(password, DUMMY_BCRYPT_HASH);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      // Increment failed login count and apply progressive lockout
      const newCount = (user.failed_login_count || 0) + 1;
      let lockedUntil = null;
      if (newCount >= 15) {
        lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
      } else if (newCount >= 10) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      } else if (newCount >= 5) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
      }
      await sql`UPDATE auth_users SET failed_login_count = ${newCount}, locked_until = ${lockedUntil} WHERE id = ${user.id}`;

      if (lockedUntil) {
        await logSecurityEvent({ event: 'account_lockout', userId: user.id, email: normalizedEmail, ip, userAgent, details: { failedAttempts: newCount }, severity: 'warn' });
      } else {
        await logSecurityEvent({ event: 'login_failure', userId: user.id, email: normalizedEmail, ip, userAgent, details: { reason: 'wrong_password', failedAttempts: newCount } });
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check email verification
    if (!user.email_verified) {
      return NextResponse.json({
        error: 'Please verify your email before logging in. Check your inbox for the verification link.',
      }, { status: 403 });
    }

    // Reset failed login count on success
    if (user.failed_login_count > 0) {
      await sql`UPDATE auth_users SET failed_login_count = 0, locked_until = ${null} WHERE id = ${user.id}`;
    }

    // Check MFA
    const hasMfa = await hasVerifiedFactors(user.id);

    // Create session (aal1 initially)
    const { jwt, expiresAt } = await createSession(user.id, user.email, hasMfa, 'aal1');
    await setSessionCookie(jwt, expiresAt);

    await logSecurityEvent({ event: 'login_success', userId: user.id, email: normalizedEmail, ip, userAgent });

    // Check roles for smart redirect
    const [affiliateRecord] = await sql`SELECT id FROM affiliates WHERE auth_user_id = ${user.id} LIMIT 1`;
    const [clientRecord] = await sql`SELECT id FROM clients WHERE email = ${normalizedEmail} LIMIT 1`;
    const [templateRecord] = await sql`SELECT id FROM template_purchases WHERE buyer_email = ${normalizedEmail} LIMIT 1`;

    return NextResponse.json({
      success: true,
      requiresMFA: hasMfa,
      isAffiliate: !!affiliateRecord,
      isClient: !!(clientRecord || templateRecord),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
