import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitCritical } from '@/lib/security/rate-limit-durable';
import {
  isAdminIpAllowed,
  isAdminTotpEnabled,
  verifyAdminTotp,
  createAdminSession,
  revokeAdminSession,
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
} from '@/lib/admin-auth';
import { logSecurityEvent } from '@/lib/security/audit-log';

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  // Handle form submission (sign out)
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    if (formData.get('action') === 'signout') {
      const cookieStore = await cookies();
      // AUDIT 2026-08-12 (P1 A-01): revoke the SESSION, not just the local cookie. Deleting the
      // cookie left a still-valid credential in anyone else's hands.
      await revokeAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
      cookieStore.delete(ADMIN_COOKIE);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Optional IP allowlist: if configured, reject (as 404) from any other IP so the
  // admin login can't even be probed from outside your network.
  if (!(await isAdminIpAllowed())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Rate limit: 5 attempts per IP per 30 minutes
  const ip = getClientIp(request);
  const { allowed } = await rateLimitCritical(`admin-login:ip:${ip}`, { max: 5, windowSeconds: 1800 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in 30 minutes.' }, { status: 429 });
  }

  // Handle JSON submission (sign in)
  const { token, code } = await request.json();
  const validToken = process.env.ADMIN_ACCESS_TOKEN;

  if (!validToken) {
    console.error('ADMIN_ACCESS_TOKEN not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (typeof token !== 'string' || token.length > 256) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // Timing-safe comparison to prevent timing attacks
  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(validToken);
  if (a.length !== b.length) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  if (mismatch !== 0) {
    // AUDIT 2026-08-12 (P2): the 'admin_login' event type existed but was NEVER emitted, so a
    // brute-force attempt against the admin gate left no trace in the security audit log and the
    // hourly security-alert cron had nothing to report on. Log both outcomes.
    void logSecurityEvent({
      event: 'admin_login',
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
      severity: 'warn',
      details: { outcome: 'invalid_token' },
    });
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // SECURITY (audit F28): require the TOTP second factor when ADMIN_TOTP_SECRET is configured.
  // The token alone is no longer sufficient — a leaked token can't sign in without the authenticator.
  if (isAdminTotpEnabled()) {
    if (!verifyAdminTotp(typeof code === 'string' ? code : '')) {
      void logSecurityEvent({
        event: 'admin_login',
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
        severity: 'warn',
        details: { outcome: 'invalid_totp' },
      });
      return NextResponse.json({ error: 'A valid 2FA code is required.', needsCode: true }, { status: 401 });
    }
  }

  // AUDIT 2026-08-12 (P1 A-01): mint a revocable server-side session instead of echoing the
  // submitted token (which IS ADMIN_ACCESS_TOKEN — it just passed a byte-comparison against it)
  // back as the cookie. The old cookie was the master secret: never expired server-side, and
  // could not be revoked without rotating the env var and redeploying.
  const sessionToken = await createAdminSession({
    ip,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: '/',
  });

  void logSecurityEvent({
    event: 'admin_login',
    ip,
    userAgent: request.headers.get('user-agent') || undefined,
    severity: 'info',
    details: { outcome: 'success' },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  await revokeAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  cookieStore.delete(ADMIN_COOKIE);
  return NextResponse.json({ success: true });
}
