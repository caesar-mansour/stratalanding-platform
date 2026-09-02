import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/email-transport';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { EMAIL_VERIFICATION_EXPIRY_HOURS } from '@/lib/auth/constants';
import { escapeHtml } from '@/lib/html-utils';
import { withProtection } from '@/lib/security/with-protection';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'stratalanding@gmail.com';

function generateReferralCode(name: string): string {
  const base = name.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase().padEnd(4, 'X');
  return base + String(Math.floor(10 + Math.random() * 90));
}

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, website, paypalEmail, password } = body;

    // Validate required
    if (!name || !email || !paypalEmail || !password) {
      return NextResponse.json({ error: 'Name, email, password, and PayPal email are required.' }, { status: 400 });
    }
    if (typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'Invalid name.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 8-128 characters.' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !emailRegex.test(paypalEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (website && (typeof website !== 'string' || website.length > 500)) {
      return NextResponse.json({ error: 'Invalid website URL.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing affiliate
    const [existing] = await sql`SELECT id FROM affiliates WHERE email = ${normalizedEmail} LIMIT 1`;
    if (existing) {
      return NextResponse.json({ error: 'An affiliate account with this email already exists.' }, { status: 409 });
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(name);
    let attempts = 0;
    while (attempts < 10) {
      const [conflict] = await sql`SELECT id FROM affiliates WHERE referral_code = ${referralCode} LIMIT 1`;
      if (!conflict) break;
      referralCode = generateReferralCode(name);
      attempts++;
    }

    // Create auth_users record (or reuse existing)
    const passwordHash = await hashPassword(password);
    let authUserId: string;

    const [existingAuth] = await sql`SELECT id FROM auth_users WHERE email = ${normalizedEmail} LIMIT 1`;
    if (existingAuth) {
      // SECURITY (audit F29): do NOT set a password on a PRE-EXISTING account from this
      // unauthenticated route — that let an attacker hijack a verified password-less user
      // (template buyer / client) by "signing up" as an affiliate with their email. The
      // affiliate record links to the existing identity; they set a password via email sign-in.
      authUserId = existingAuth.id;
    } else {
      const [newAuth] = await sql`
        INSERT INTO auth_users (email, password_hash, email_verified)
        VALUES (${normalizedEmail}, ${passwordHash}, false)
        RETURNING id
      `;
      authUserId = newAuth.id;
    }

    // Insert affiliate
    const [affiliate] = await sql`
      INSERT INTO affiliates (name, email, company, website, referral_code, paypal_email, status, auth_user_id)
      VALUES (
        ${name.trim()},
        ${normalizedEmail},
        ${company?.trim() || null},
        ${website?.trim() || null},
        ${referralCode},
        ${paypalEmail.toLowerCase().trim()},
        'pending',
        ${authUserId}
      )
      RETURNING id, referral_code
    `;

    // Generate verification token (branded verification email sent below)
    const verifyToken = generateToken();
    const tokenHash = hashToken(verifyToken);
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
    await sql`INSERT INTO auth_email_verifications (user_id, token_hash, expires_at) VALUES (${authUserId}, ${tokenHash}, ${verifyExpiry.toISOString()})`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${verifyToken}`;

    // Notify admin (non-blocking)
    if (process.env.GMAIL_REFRESH_TOKEN) {
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Affiliate Application: ${name.trim()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0B1B3A; color: #F8FAFC; padding: 32px; border-radius: 12px;">
            <h2 style="color: #22D3EE; margin: 0 0 24px;">New Affiliate Application</h2>
            <table style="width: 100%; border-collapse: collapse; color: #CBD5E1;">
              <tr><td style="padding: 8px 0; color: #94A3B8;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #F8FAFC;">${escapeHtml(name.trim())}</td></tr>
              <tr><td style="padding: 8px 0; color: #94A3B8;">Email</td><td style="padding: 8px 0;">${escapeHtml(normalizedEmail)}</td></tr>
              <tr><td style="padding: 8px 0; color: #94A3B8;">Company</td><td style="padding: 8px 0;">${escapeHtml(company || '—')}</td></tr>
              <tr><td style="padding: 8px 0; color: #94A3B8;">Website</td><td style="padding: 8px 0;">${escapeHtml(website || '—')}</td></tr>
              <tr><td style="padding: 8px 0; color: #94A3B8;">PayPal</td><td style="padding: 8px 0;">${escapeHtml(paypalEmail)}</td></tr>
              <tr><td style="padding: 8px 0; color: #94A3B8;">Code</td><td style="padding: 8px 0; font-weight: 700; color: #22D3EE; font-size: 18px;">${referralCode}</td></tr>
            </table>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/affiliates"
               style="display: inline-block; margin-top: 24px; background: #0891B2; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Review in Admin
            </a>
          </div>
        `,
      }).catch(err => console.error('Affiliate admin notification failed:', err));

      // Verification email to the affiliate (branded, single CTA)
      sendEmail({
        to: normalizedEmail,
        subject: `Verify your StrataLanding Partner account`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #0B1120;">
            <div style="background: linear-gradient(135deg, #0B1B3A 0%, #122548 50%, #0891B2 100%); padding: 48px 32px; text-align: center;">
              <h1 style="color: #F8FAFC; margin: 0 0 8px; font-size: 28px;">Verify your account, ${escapeHtml(name.trim().split(' ')[0])}</h1>
              <p style="color: #94A3B8; margin: 0; font-size: 15px;">One quick step to activate your partner access.</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #CBD5E1; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                Thanks for applying to the StrataLanding Partner Program. Please verify your email address below. Once you verify, we review every application and typically activate accounts within 48 hours.
              </p>
              <div style="text-align: center; margin: 0 0 32px;">
                <a href="${verifyUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #0891B2, #22D3EE); color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">
                  Verify Email Address
                </a>
                <p style="color: #64748B; font-size: 12px; margin: 12px 0 0;">Link expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours.</p>
              </div>
              <div style="background: rgba(8,145,178,0.1); border: 1px solid rgba(8,145,178,0.3); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 28px;">
                <p style="color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Your Referral Code</p>
                <p style="color: #22D3EE; font-size: 36px; font-weight: 800; letter-spacing: 3px; margin: 0 0 12px;">${referralCode}</p>
                <p style="color: #64748B; font-size: 13px; margin: 0;">
                  <a href="https://stratalanding.com?ref=${referralCode}" style="color: #0891B2; text-decoration: none;">stratalanding.com?ref=${referralCode}</a>
                </p>
                <p style="color: #64748B; font-size: 12px; margin: 12px 0 0;">You'll be able to use this once your account is activated.</p>
              </div>
              <p style="color: #64748B; font-size: 12px; line-height: 1.6; margin: 0;">
                Didn't apply? You can safely ignore this email.
              </p>
            </div>
            <div style="text-align: center; padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="color: #475569; font-size: 11px; margin: 0;">StrataLanding Partner Program</p>
            </div>
          </div>
        `,
      }).catch(err => console.error('Affiliate verification email failed:', err));
    }

    return NextResponse.json({
      success: true,
      referralCode: affiliate.referral_code,
      redirectTo: '/partner-portal',
    });
  } catch (error) {
    console.error('Affiliate signup error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// Public signup that creates auth_users rows + sends email (audit F34): cap per-IP and
// enforce same-origin to stop account/email-send flooding.
export const POST = withProtection(handler, {
  name: 'affiliates',
  rateLimit: { max: 5, windowSeconds: 3600 },
});
