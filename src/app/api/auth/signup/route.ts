import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { sendEmailVerificationEmail } from '@/lib/auth/emails';
import { EMAIL_VERIFICATION_EXPIRY_HOURS } from '@/lib/auth/constants';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

export async function POST(request: Request) {
  try {
    // Rate limit: 3 signups per IP per hour
    const ip = getClientIp(request);
    const { allowed } = await rateLimitDurable(`signup:ip:${ip}`, { max: 3, windowSeconds: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
    }

    const { email, password, name } = await request.json();

    // Input length validation
    if (typeof email !== 'string' || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (typeof name === 'string' && name.length > 200) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length > 128) {
      return NextResponse.json({ error: 'Password is too long' }, { status: 400 });
    }
    // Password complexity: require 3 of 4 categories
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if ([hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length < 3) {
      return NextResponse.json({ error: 'Password must include at least 3 of: uppercase, lowercase, number, special character' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check banned emails
    const [banned] = await sql`SELECT id FROM banned_emails WHERE email = ${normalizedEmail} LIMIT 1`;

    if (banned) {
      return NextResponse.json({ error: 'This email cannot be used' }, { status: 400 });
    }

    // Check if user already exists
    const [existingUser] = await sql`SELECT id, email_verified, password_hash FROM auth_users WHERE email = ${normalizedEmail} LIMIT 1`;

    if (existingUser) {
      // SECURITY (audit F1/F29/M5): NEVER set a password, VERIFY a password, or issue a session
      // for a PRE-EXISTING account from this unauthenticated route. The old auto-login branch
      // turned signup into a password-verification oracle that ALSO bypassed the login route's
      // progressive lockout (signup has its own, separate limiter), and historically let anyone
      // hijack a password-less account. Authentication must go through /login (where lockout
      // applies) or the email sign-in link. One uniform response for any verified account — do
      // not branch on whether a password is set, so the two cases are indistinguishable.
      if (existingUser.email_verified) {
        return NextResponse.json({
          error: 'An account with this email already exists. Please log in — use “Forgot password” if you need to set or reset one.',
          accountExists: true,
        }, { status: 400 });
      }

      // Unverified existing record (with or without a password): discard it and let
      // registration proceed fresh below — a new verification email gates access.
      await sql`DELETE FROM auth_users WHERE id = ${existingUser.id}`;
    }

    // Create new user
    const passwordHash = await hashPassword(password);

    let userId: string;
    try {
      const [newUser] = await sql`INSERT INTO auth_users (email, password_hash, email_verified) VALUES (${normalizedEmail}, ${passwordHash}, ${false}) RETURNING id`;
      userId = newUser.id;
    } catch (error: unknown) {
      // Handle race condition (unique constraint violation)
      if (error instanceof Error && 'code' in error && (error as Error & { code: string }).code === '23505') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }
      throw error;
    }

    // If a client record exists for this email, update the name
    if (name) {
      await sql`UPDATE clients SET name = ${name} WHERE email = ${normalizedEmail}`;
    }

    // Send verification email
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    await sql`INSERT INTO auth_email_verifications (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})`;

    await sendEmailVerificationEmail(normalizedEmail, token);

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      needsVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
