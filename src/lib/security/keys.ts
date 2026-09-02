/**
 * Purpose-separated secret keys (audit F12).
 *
 * Previously AUTH_SECRET did everything — signed JWTs, HMAC'd price-override links, derived the
 * MFA AES key, and HMAC'd download tokens — and several call sites fell back to a GUESSABLE literal
 * ('fallback' / 'local') when it was unset, which let an attacker forge those MACs.
 *
 * This module resolves a DEDICATED key per purpose. During rollout it falls back ONLY to
 * AUTH_SECRET (already a strong, required secret) — never to a literal — and throws if neither is
 * set, so we fail closed instead of signing with an empty/guessable key.
 *
 * For true key separation, set these in the host env (Netlify), each `openssl rand -hex 32`:
 *   PRICE_OVERRIDE_HMAC_KEY · MFA_ENC_KEY · OTP_PEPPER · DOWNLOAD_TOKEN_KEY
 */
function resolveKey(name: string): string {
  const v = process.env[name] || process.env.AUTH_SECRET;
  if (!v) {
    throw new Error(`[SECURITY] ${name} and AUTH_SECRET are both unset — refusing to derive a key.`);
  }
  return v;
}

export const priceOverrideKey = (): string => resolveKey('PRICE_OVERRIDE_HMAC_KEY');
export const mfaEncKey = (): string => resolveKey('MFA_ENC_KEY');
export const downloadTokenKey = (): string => resolveKey('DOWNLOAD_TOKEN_KEY');
export const otpPepper = (): string => resolveKey('OTP_PEPPER');
/**
 * Shared secret the edge WAF uses to authenticate itself to the internal /api/security/event
 * logger, so an attacker can't forge security events.
 *
 * AUDIT 2026-08-12 (P2): this used resolveKey(), which falls back to AUTH_SECRET — and the proxy
 * puts the result in an `x-waf-secret` REQUEST HEADER. AUTH_SECRET is the HS256 key for every
 * session JWT and the fallback for MFA encryption, the OTP pepper, price-override HMACs, proposal
 * tokens and download tokens. Sending it as a header writes it into Netlify request/function logs
 * and any attached observability tooling. Worse, the in-file guidance tells the founder to set
 * WAF_AUDIT=1 precisely when under attack — i.e. the worst possible moment to log the signing key.
 *
 * No fallback here. Unset means null, and the proxy simply skips reporting (blocking still works —
 * it is pure pattern matching at the edge and needs no secret).
 */
export const wafLogSecret = (): string | null => process.env.WAF_LOG_SECRET || null;
