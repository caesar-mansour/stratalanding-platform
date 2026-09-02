import { NextRequest, NextResponse } from 'next/server';
import { verifySessionJWT } from '@/lib/auth/tokens';
import { deleteSession, getSessionTokenFromCookies, clearSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const token = await getSessionTokenFromCookies();

  if (token) {
    const payload = await verifySessionJWT(token);
    if (payload?.sid) {
      await deleteSession(payload.sid);
    }
  }

  await clearSessionCookie();

  return NextResponse.redirect(new URL('/login', request.url));
}
