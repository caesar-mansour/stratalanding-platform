import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSessionTokenFromCookies, getLiveSession, upgradeSessionToAAL2, setSessionCookie, refreshSessionJWT, deleteOtherUserSessions } from '@/lib/auth/session';
import { verifyAndActivateFactor, verifyMFACode, deleteFactor, hasVerifiedFactors } from '@/lib/auth/mfa';
import { SESSION_DURATION_MS } from '@/lib/auth/constants';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitCritical } from '@/lib/security/rate-limit-durable';
import { withProtection } from '@/lib/security/with-protection';
import { sendSecurityAlertEmail } from '@/lib/auth/emails';

// SECURITY (audit M6): CSRF/Origin guard on this authenticated state-changing route.
export const POST = withProtection(postHandler, { name: 'mfa-verify', csrf: true });

async function postHandler(request: Request) {
  try {
    const token = await getSessionTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // SECURITY (audit H1): validate against the DB so a revoked/expired session can't step up.
    const payload = await getLiveSession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // SECURITY (audit F11): throttle MFA verification to prevent TOTP brute-force.
    const ip = getClientIp(request);
    if (!(await rateLimitCritical(`mfa:${payload.sub}:${ip}`, { max: 10, windowSeconds: 900 })).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { factorId, code, action } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    if (action === 'setup') {
      // Verify and activate a new factor
      if (!factorId) {
        return NextResponse.json({ error: 'Factor ID is required' }, { status: 400 });
      }

      // SECURITY (audit C1): the 'setup' path activates a factor and upgrades the session to
      // aal2. If the user ALREADY has a verified factor and this session is not yet aal2, an
      // attacker with the password alone could enroll+activate their own factor to defeat MFA.
      // An existing-MFA user must step up via {action:'login'} against the EXISTING factor; only
      // genuine first-time enrollment (zero prior verified factors) may reach aal2 through setup.
      if (payload.aal !== 'aal2' && (await hasVerifiedFactors(payload.sub!))) {
        return NextResponse.json(
          { error: 'Verify with your existing authenticator first.' },
          { status: 403 }
        );
      }

      const activated = await verifyAndActivateFactor(factorId, code, payload.sub!);
      if (!activated) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // AUDIT 2026-08-12 (P2): turning MFA ON did not protect sessions that already existed.
      // getServerUser() gates on `payload.has_mfa === true && session.aal !== 'aal2'`, but
      // has_mfa is baked into the JWT at login — so every session minted BEFORE enrolment carries
      // has_mfa:false, the check never fires, and those sessions keep full access with no second
      // factor. That is the exact window an attacker who already has the password sits in.
      // Kill every other session so they must re-authenticate and receive a has_mfa:true JWT.
      await deleteOtherUserSessions(payload.sub!, payload.sid);

      // AUDIT 2026-08-12 (P2): notify on MFA enrolment — an attacker enrolling THEIR factor on a
      // stolen account is exactly the event the owner needs to hear about.
      if (payload.email) void sendSecurityAlertEmail(payload.email as string, 'mfa_enabled');

      // Upgrade session to aal2 and update has_mfa in JWT
      const newJwt = await upgradeSessionToAAL2(payload.sid, payload.sub!, payload.email);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await setSessionCookie(newJwt, expiresAt);

      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      // Verify MFA during login
      const result = await verifyMFACode(payload.sub!, code);
      if (!result.valid) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // Upgrade session to aal2
      const newJwt = await upgradeSessionToAAL2(payload.sid, payload.sub!, payload.email);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await setSessionCookie(newJwt, expiresAt);

      // Smart-redirect flags (mirror /api/auth/login)
      const normalizedEmail = payload.email.toLowerCase();
      const [affiliateRecord] = await sql`SELECT id FROM affiliates WHERE auth_user_id = ${payload.sub!} LIMIT 1`;
      const [clientRecord] = await sql`SELECT id FROM clients WHERE email = ${normalizedEmail} LIMIT 1`;
      const [templateRecord] = await sql`SELECT id FROM template_purchases WHERE buyer_email = ${normalizedEmail} LIMIT 1`;

      return NextResponse.json({
        success: true,
        isAffiliate: !!affiliateRecord,
        isClient: !!(clientRecord || templateRecord),
      });
    }

    if (action === 'disable') {
      // Verify code before disabling
      const result = await verifyMFACode(payload.sub!, code);
      if (!result.valid) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // Delete the factor
      if (result.factorId) {
        await deleteFactor(result.factorId, payload.sub!);
      }

      // SECURITY (audit F87): recompute AAL after removing a factor — if no verified factors
      // remain, downgrade the session to aal1 so a stale aal2 JWT/session row can't keep an
      // "MFA-verified" trust level with zero factors.
      const stillHasMfa = await hasVerifiedFactors(payload.sub!);
      const newAal: 'aal1' | 'aal2' = stillHasMfa ? (payload.aal as 'aal1' | 'aal2') : 'aal1';
      if (!stillHasMfa) {
        await sql`UPDATE auth_sessions SET aal = 'aal1' WHERE id = ${payload.sid}`;
      }

      // Re-sign JWT with the recomputed MFA state
      const newJwt = await refreshSessionJWT(
        payload.sid,
        payload.sub!,
        payload.email,
        stillHasMfa,
        newAal
      );
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
      await setSessionCookie(newJwt, expiresAt);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('MFA verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
