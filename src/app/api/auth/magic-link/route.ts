import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { sendMagicLinkEmail } from '@/lib/auth/emails';
import { MAGIC_LINK_EXPIRY_MINUTES, MAGIC_LINK_RATE_LIMIT_SECONDS } from '@/lib/auth/constants';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

export async function POST(request: Request) {
  try {
    // SECURITY (audit F14): per-IP throttle (the existing per-email throttle didn't stop
    // an attacker from blasting magic-link emails to many different addresses).
    const ip = getClientIp(request);
    if (!(await rateLimitDurable(`magic:ip:${ip}`, { max: 10, windowSeconds: 3600 })).allowed) {
      return NextResponse.json({ success: true });
    }

    const { email, redirectTo } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check banned emails
    const [banned] = await sql`SELECT id FROM banned_emails WHERE email = ${normalizedEmail} LIMIT 1`;

    if (banned) {
      // Return success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    // Rate limit: max 1 magic link per email per 60 seconds
    const [recentLink] = await sql`SELECT created_at FROM auth_magic_links WHERE email = ${normalizedEmail} AND used = ${false} ORDER BY created_at DESC LIMIT 1`;

    if (recentLink) {
      const created = new Date(recentLink.created_at).getTime();
      if (Date.now() - created < MAGIC_LINK_RATE_LIMIT_SECONDS * 1000) {
        // Return success to prevent enumeration
        return NextResponse.json({ success: true });
      }
    }

    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    // Store magic link
    await sql`INSERT INTO auth_magic_links (email, token_hash, redirect_to, expires_at) VALUES (${normalizedEmail}, ${tokenHash}, ${redirectTo || '/portal'}, ${expiresAt.toISOString()})`;

    // Send email
    await sendMagicLinkEmail(normalizedEmail, token, redirectTo || '/portal');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
