import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/auth/emails';
import { PASSWORD_RESET_EXPIRY_MINUTES } from '@/lib/auth/constants';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitCritical } from '@/lib/security/rate-limit-durable';

export async function POST(request: Request) {
  try {
    // SECURITY (audit F14): per-IP throttle to prevent email-bombing arbitrary addresses.
    // Return success on throttle so we don't reveal anything (consistent with anti-enumeration).
    const ip = getClientIp(request);
    if (!(await rateLimitCritical(`forgot:ip:${ip}`, { max: 5, windowSeconds: 3600 })).allowed) {
      return NextResponse.json({ success: true });
    }

    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user - always return success to prevent email enumeration
    const [user] = await sql`SELECT id FROM auth_users WHERE email = ${normalizedEmail} LIMIT 1`;

    if (user) {
      // Generate reset token
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

      await sql`INSERT INTO auth_password_resets (user_id, token_hash, expires_at) VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})`;

      // Send reset email
      const emailResult = await sendPasswordResetEmail(normalizedEmail, token);
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
      }
    }

    // Always return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
