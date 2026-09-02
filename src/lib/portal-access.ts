import 'server-only';

import sql from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { sendMagicLinkEmail } from '@/lib/auth/emails';

const MAGIC_LINK_EXPIRY_MINUTES = 60;

/**
 * Send a fresh magic link so a client who just paid can actually get into their portal.
 *
 * AUDIT 2026-08-12 (P1 U-03): the post-payment screen told the client "We'll send you a magic link
 * to access your client portal within the next few minutes" and pointed at /login — but NOTHING in
 * the codebase sent one (grep for magic-link across the payment paths returned nothing). A client
 * who had just paid a $1,200-$4,800 deposit was told to wait for an email that never came, at a
 * login they had no credentials for. That is the worst possible moment to strand someone.
 *
 * Deliberately non-throwing: a failed access email must never fail the payment that already
 * succeeded. The failure is recorded durably by the transport (email_failures, audit E-01) so it
 * is visible rather than silent, and the client can always use "email me a login link" on /login.
 */
export async function sendPortalAccessLink(email: string): Promise<{ sent: boolean }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { sent: false };

    const token = generateToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    await sql`
      INSERT INTO auth_magic_links (email, token_hash, redirect_to, expires_at)
      VALUES (${normalizedEmail}, ${hashToken(token)}, ${'/portal'}, ${expiresAt.toISOString()})
    `;

    await sendMagicLinkEmail(normalizedEmail, token, '/portal');
    return { sent: true };
  } catch (err) {
    console.error('[PORTAL] failed to send post-payment access link:', err);
    return { sent: false };
  }
}
