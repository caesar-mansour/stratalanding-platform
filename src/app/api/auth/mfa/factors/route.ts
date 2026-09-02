import { NextResponse } from 'next/server';
import { getSessionTokenFromCookies, getLiveSession } from '@/lib/auth/session';
import { listUserFactors } from '@/lib/auth/mfa';

export async function GET() {
  try {
    const token = await getSessionTokenFromCookies();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // SECURITY (audit H1): validate against the DB so a revoked token can't enumerate factors.
    const payload = await getLiveSession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const factors = await listUserFactors(payload.sub!);

    return NextResponse.json({
      factors: factors.map(f => ({
        id: f.id,
        friendly_name: f.friendly_name,
        factor_type: 'totp',
        status: f.verified ? 'verified' : 'unverified',
        created_at: f.created_at,
      })),
    });
  } catch (error) {
    console.error('List MFA factors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
