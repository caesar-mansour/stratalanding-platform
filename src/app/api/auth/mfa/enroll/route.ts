import { NextResponse } from 'next/server';
import { getSessionTokenFromCookies, getLiveSession } from '@/lib/auth/session';
import { enrollMFAFactor, hasVerifiedFactors } from '@/lib/auth/mfa';
import { withProtection } from '@/lib/security/with-protection';

// SECURITY (audit M6): CSRF/Origin guard on this authenticated state-changing route.
export const POST = withProtection(postHandler, { name: 'mfa-enroll', csrf: true });

async function postHandler() {
  try {
    const token = await getSessionTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // SECURITY (audit H1): validate against the DB so a signed-out / password-reset / revoked
    // token cannot enroll a factor.
    const payload = await getLiveSession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // SECURITY (audit C1): password-only MFA bypass. An attacker who knows just the password
    // holds an aal1 session; if they could enroll their OWN authenticator and activate it to
    // aal2, MFA would be defeated. So when the user ALREADY has a verified factor, enrolling
    // another requires an already-stepped-up (aal2) session — i.e. they must first pass
    // /mfa/verify {action:'login'} with the EXISTING authenticator. Genuine first-time
    // enrollment (zero verified factors) is still allowed from aal1.
    if (payload.aal !== 'aal2' && (await hasVerifiedFactors(payload.sub))) {
      return NextResponse.json(
        { error: 'Verify with your existing authenticator before adding another.' },
        { status: 403 }
      );
    }

    const result = await enrollMFAFactor(payload.sub);

    return NextResponse.json({
      data: {
        id: result.factorId,
        type: 'totp',
        totp: {
          qr_code: result.qrCode,
          secret: result.secret,
          uri: result.uri,
        },
      },
    });
  } catch (error) {
    console.error('MFA enroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
