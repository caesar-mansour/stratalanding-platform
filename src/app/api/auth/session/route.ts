import { NextResponse } from 'next/server';
import { getSessionTokenFromCookies, getLiveSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const token = await getSessionTokenFromCookies();

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // SECURITY (audit H1): report auth state from the DB-backed session, not the JWT alone, so a
    // signed-out / password-reset / expired session correctly reads as unauthenticated here.
    const payload = await getLiveSession(token);

    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        aal: payload.aal,
        hasMfa: payload.has_mfa,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
