import { NextResponse, type NextRequest } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/auth/tokens';

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${siteUrl}/login?error=invalid_token`);
    }

    const tokenHash = hashToken(token);

    // Find verification record
    const [verification] = await sql`SELECT id, user_id, expires_at FROM auth_email_verifications WHERE token_hash = ${tokenHash} AND used = ${false} LIMIT 1`;

    if (!verification) {
      return NextResponse.redirect(`${siteUrl}/login?error=invalid_token`);
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.redirect(`${siteUrl}/login?error=token_expired`);
    }

    // Mark as used
    await sql`UPDATE auth_email_verifications SET used = ${true} WHERE id = ${verification.id}`;

    // Verify the user's email
    await sql`UPDATE auth_users SET email_verified = ${true} WHERE id = ${verification.user_id}`;

    return NextResponse.redirect(`${siteUrl}/login?verified=true`);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${siteUrl}/login?error=auth_error`);
  }
}
