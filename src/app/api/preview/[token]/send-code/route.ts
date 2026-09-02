import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import sql from '@/lib/db';
import { hashToken, hmacToken } from '@/lib/auth/tokens';
import { sendPreviewCodeEmail } from '@/lib/auth/emails';
import { sendYesAlert } from '@/lib/preview-alerts';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_SEC = 600;       // 10 min — email delivery is often slower than the old 60s window
const RESEND_COOLDOWN_SEC = 45; // min gap between sends; expiry no longer gates the resend

// POST — email a 6-digit confirmation code for the approve step. They stay on the site
// and type it back. Only one active code per email; a fresh one can be requested after
// a short cooldown (a new send invalidates the old code).
//
// This is also where the YES is recorded: submitting an email here IS the decision, so
// we latch it (yes_at) and alert the founder immediately — the code only gates portal
// access. A slow or mistyped inbox can no longer lose the yes.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const tokenHash = hashToken(token);

    const ip = getClientIp(request);
    if (!rateLimit(`preview-code-ip:${ip}`, { max: 15, windowSeconds: 3600 }).allowed
      || !rateLimit(`preview-code-tok:${tokenHash.slice(0, 24)}`, { max: 10, windowSeconds: 3600 }).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

    // SECURITY (audit F56): the per-IP in-memory limits above are defeatable by rotating
    // X-Forwarded-For across cold instances. A DURABLE per-EMAIL cap closes the brute-force /
    // mint-unlimited-codes path that leads to instant-login takeover, regardless of source IP.
    if (!(await rateLimitDurable(`otp-send:email:${email}`, { max: 5, windowSeconds: 3600 })).allowed) {
      return NextResponse.json({ error: 'Too many codes requested for this email. Try again later.' }, { status: 429 });
    }

    const [link] = await sql`SELECT id, practice_name, contact_email, expires_at FROM preview_links WHERE token_hash = ${tokenHash} LIMIT 1`;
    if (!link) return NextResponse.json({ error: 'This preview link is invalid.' }, { status: 404 });
    if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'This preview link has expired.' }, { status: 410 });
    // NOTE: any email is accepted here — the outreach email tells the office to pass the
    // link to the doctor, who answers from their own address. The OTP still proves inbox
    // ownership, and the admin notification flags a mismatch with the address on file.

    // Cooldown between sends (resend no longer waits for expiry — the email may simply
    // not have arrived). A fresh send below overwrites (invalidates) the old code.
    const [existing] = await sql`SELECT last_sent_at FROM preview_otps WHERE email = ${email} LIMIT 1`;
    if (existing) {
      const sinceSec = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000;
      if (sinceSec < RESEND_COOLDOWN_SEC) {
        const retryInSec = Math.max(1, Math.ceil(RESEND_COOLDOWN_SEC - sinceSec));
        return NextResponse.json({ error: `A code was just sent. You can request a new one in ${retryInSec}s.`, retryInSec }, { status: 429 });
      }
    }

    // Latch the yes ONCE (yes_at IS NULL) and alert the founder off the response path.
    const [firstYes] = await sql`
      UPDATE preview_links
      SET yes_at = now(), decision_email = ${email},
          status = CASE WHEN status = 'pending' THEN 'liked' ELSE status END
      WHERE id = ${link.id} AND yes_at IS NULL
      RETURNING practice_name`;
    if (firstYes) after(() => sendYesAlert(String(firstYes.practice_name), email));

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    // SECURITY (audit F69/F79): keyed HMAC (not bare SHA-256) so a leaked DB can't rainbow-table
    // a 6-digit code, and BIND the code to this preview token so a code can't be replayed against
    // a different link.
    const codeHash = hmacToken(`${token}:${code}`);
    const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString();
    await sql`
      INSERT INTO preview_otps (email, code_hash, expires_at, attempts, last_sent_at)
      VALUES (${email}, ${codeHash}, ${expiresAt}, 0, now())
      ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, last_sent_at = now()
    `;

    // AUDIT 2026-08-12 (P1 E-03): this used to swallow the send failure and return { sent: true }
    // regardless, so a prospect was told "check your email" for a code that was never sent — with
    // no recovery path and no signal to the studio. Report the real outcome.
    try {
      await sendPreviewCodeEmail(email, code);
    } catch (e) {
      console.error('[PREVIEW] code email failed for', email, e);
      return NextResponse.json(
        { sent: false, error: 'We could not send your code right now. Please try again in a moment.' },
        { status: 502 },
      );
    }

    const dev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({ sent: true, expiresInSec: CODE_TTL_SEC, resendInSec: RESEND_COOLDOWN_SEC, ...(dev ? { devCode: code } : {}) });
  } catch (error) {
    console.error('preview send-code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
