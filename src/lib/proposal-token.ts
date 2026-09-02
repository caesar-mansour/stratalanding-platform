/**
 * Signed, expiring access token for the public proposal page (audit F53).
 *
 * `/proposal/[id]` used to `SELECT *` by a guessable UUID with NO auth — leaking client name,
 * email, company, custom price, and notes to anyone who had/guessed the id, and the first view
 * flipped status→viewed (a forgeable "they opened it" signal). The proposal email now carries
 * `?t=<token>`; the page requires a valid token (or an authenticated admin) to render.
 *
 * Keyed with PROPOSAL_TOKEN_KEY (falls back to AUTH_SECRET). Stateless (no DB) — the signature
 * binds the proposal id + an expiry, so links naturally expire and can't be forged.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const TTL_DAYS = 30;

function key(): string {
  const k = process.env.PROPOSAL_TOKEN_KEY || process.env.AUTH_SECRET;
  if (!k) throw new Error('[SECURITY] PROPOSAL_TOKEN_KEY and AUTH_SECRET are both unset.');
  return k;
}

function sign(proposalId: string, exp: number): string {
  return createHmac('sha256', key()).update(`${proposalId}:${exp}`).digest('base64url').slice(0, 32);
}

export function generateProposalToken(proposalId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;
  return `${exp}.${sign(proposalId, exp)}`;
}

/** Full public proposal URL with a fresh signed token — use for every PROSPECT-facing link. */
export function proposalPublicUrl(proposalId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base}/proposal/${proposalId}?t=${generateProposalToken(proposalId)}`;
}

export function verifyProposalToken(proposalId: string, token: string | undefined | null): boolean {
  if (!token || !token.includes('.')) return false;
  const [expStr, sig] = token.split('.');
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false; // expired
  const expected = sign(proposalId, exp);
  if (!sig || sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
