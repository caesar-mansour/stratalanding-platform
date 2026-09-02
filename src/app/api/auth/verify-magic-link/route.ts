import { NextResponse, type NextRequest } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/auth/tokens';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { hasVerifiedFactors } from '@/lib/auth/mfa';
import { validateRedirectPath } from '@/lib/security/sanitize';

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const token = request.nextUrl.searchParams.get('token');
    const redirectTo = validateRedirectPath(request.nextUrl.searchParams.get('redirectTo') || '/portal');

    if (!token) {
      return NextResponse.redirect(`${siteUrl}/login?error=invalid_link`);
    }

    const tokenHash = hashToken(token);

    // AUDIT 2026-08-12 (P2): claiming the link is now a SINGLE atomic statement. It used to be
    // SELECT (used = false) -> check expiry in JS -> UPDATE used = true, so two requests carrying
    // the same link — a double-click, a prefetch racing the click, an email scanner racing the
    // human — both passed the SELECT and both minted a session from one single-use token. Expiry
    // is evaluated in SQL too, so it cannot drift with server clock handling.
    const [magicLink] = await sql`
      UPDATE auth_magic_links
      SET used = ${true}
      WHERE token_hash = ${tokenHash}
        AND used = ${false}
        AND expires_at > now()
      RETURNING id, email, redirect_to
    `;

    if (!magicLink) {
      // Distinguish expired from invalid purely for the message. Read-only, no security weight:
      // the claim above has already failed, so nothing here can grant access.
      const [stale] = await sql`
        SELECT expires_at FROM auth_magic_links WHERE token_hash = ${tokenHash} LIMIT 1
      `;
      const expired = stale && new Date(stale.expires_at as string) < new Date();
      return NextResponse.redirect(`${siteUrl}/login?error=${expired ? 'link_expired' : 'invalid_link'}`);
    }

    // Find or create auth user
    const [existingUser] = await sql`SELECT id FROM auth_users WHERE email = ${magicLink.email} LIMIT 1`;

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Verify email if not already
      await sql`UPDATE auth_users SET email_verified = ${true} WHERE id = ${userId}`;
    } else {
      // Create new user
      try {
        const [newUser] = await sql`INSERT INTO auth_users (email, email_verified) VALUES (${magicLink.email}, ${true}) RETURNING id`;
        userId = newUser.id;
      } catch {
        return NextResponse.redirect(`${siteUrl}/login?error=auth_error`);
      }
    }

    // Check if user has MFA
    const hasMfa = await hasVerifiedFactors(userId);

    // Create session
    const { jwt, expiresAt } = await createSession(userId, magicLink.email, hasMfa, 'aal1');
    await setSessionCookie(jwt, expiresAt);

    // If MFA is required, redirect to 2FA page
    if (hasMfa) {
      return NextResponse.redirect(`${siteUrl}/auth/verify-2fa?redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    // All users go to /portal — portal handles internal routing
    return NextResponse.redirect(`${siteUrl}${redirectTo}`);
  } catch (error) {
    console.error('Verify magic link error:', error);
    return NextResponse.redirect(`${siteUrl}/login?error=auth_error`);
  }
}
