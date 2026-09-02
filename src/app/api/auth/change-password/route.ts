import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';
import { deleteAllUserSessions, createSession, setSessionCookie } from '@/lib/auth/session';
import { sendSecurityAlertEmail } from '@/lib/auth/emails';
import { hasVerifiedFactors } from '@/lib/auth/mfa';
import { withProtection } from '@/lib/security/with-protection';

// SECURITY (audit M6): CSRF/Origin guard on this authenticated state-changing route.
export const POST = withProtection(postHandler, { name: 'change-pw', csrf: true });

// Change password while logged in. Requires the current password IF one is set
// (auto-provisioned phone leads have one from the credentials modal). Passwordless
// accounts (magic-link only) can set one without a current password.
async function postHandler(request: Request) {
  try {
    const { user } = await getServerUser();
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = getClientIp(request);
    if (!(await rateLimitDurable(`change-pw:${user.id}:${ip}`, { max: 10, windowSeconds: 900 })).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(newPassword)).length;
    if (classes < 3) {
      return NextResponse.json({ error: 'Password must include at least 3 of: uppercase, lowercase, number, special character.' }, { status: 400 });
    }

    const [au] = await sql`SELECT password_hash FROM auth_users WHERE id = ${user.id} LIMIT 1`;
    if (!au) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    if (au.password_hash) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        return NextResponse.json({ error: 'Enter your current password.' }, { status: 400 });
      }
      const ok = await verifyPassword(currentPassword, au.password_hash);
      if (!ok) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
      if (await verifyPassword(newPassword, au.password_hash)) {
        return NextResponse.json({ error: 'New password must be different from your current one.' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await sql`UPDATE auth_users SET password_hash = ${passwordHash}, email_verified = ${true} WHERE id = ${user.id}`;

    // SECURITY (audit F7/F67): revoke ALL existing sessions so a stolen/older token can't
    // survive the password change, then re-issue a fresh session for THIS device only.
    await deleteAllUserSessions(user.id);
    const hasMfa = await hasVerifiedFactors(user.id);
    const { jwt, expiresAt } = await createSession(user.id, user.email, hasMfa, user.aal === 'aal2' ? 'aal2' : 'aal1');
    await setSessionCookie(jwt, expiresAt);

    return NextResponse.json({ success: true, hadPassword: !!au.password_hash });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Lets the Security page know whether to require a current password.
export async function GET() {
  const { user } = await getServerUser();
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [au] = await sql`SELECT password_hash FROM auth_users WHERE id = ${user.id} LIMIT 1`;
  return NextResponse.json({ hasPassword: !!au?.password_hash });
}
