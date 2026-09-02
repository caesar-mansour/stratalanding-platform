/**
 * Environment variable validation.
 * Call validateEnvironment() at application startup (instrumentation.ts).
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'ADMIN_ACCESS_TOKEN',
  'NEXT_PUBLIC_SITE_URL',
] as const;

// AUDIT 2026-08-12 (P1): payments and email were NOT enforced, so production could boot green with
// no PayPal credentials and no mail transport — and you'd only discover it when a real customer
// tried to pay, or when a proposal silently never arrived. Both are load-bearing for revenue.
const REQUIRED_IN_PRODUCTION = [
  'OPENAI_API_KEY',
  'CRON_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'GMAIL_USER',
] as const;

// SECURITY (audit F12): dedicated per-purpose keys. Not hard-required — they fall back to the
// (strong, required) AUTH_SECRET via src/lib/security/keys.ts, so a forgotten var can't take the
// site down — but setting each (openssl rand -hex 32) gives true key separation. Warn if unset.
const RECOMMENDED_KEYS = [
  'PRICE_OVERRIDE_HMAC_KEY',
  'MFA_ENC_KEY',
  'OTP_PEPPER',
  'DOWNLOAD_TOKEN_KEY',
  // AUDIT 2026-08-12 (P2): both were missing from this list. PROPOSAL_TOKEN_KEY still falls back
  // to AUTH_SECRET; WAF_LOG_SECRET no longer falls back at all (it was being sent as a request
  // header), so leaving it unset silently disables WAF audit logging.
  'PROPOSAL_TOKEN_KEY',
  'WAF_LOG_SECRET',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) missing.push(v);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const v of REQUIRED_IN_PRODUCTION) {
      if (!process.env[v]) missing.push(v);
    }
  }

  // SECURITY (audit F21): ENFORCE secret strength in production (was warn-only). A short
  // AUTH_SECRET / ADMIN_ACCESS_TOKEN weakens JWT signing, HMACs, and the admin gate — fail to
  // boot rather than run with a guessable secret.
  const weak: string[] = [];
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && authSecret.length < 32) weak.push('AUTH_SECRET (min 32 chars)');
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  if (adminToken && adminToken.length < 24) weak.push('ADMIN_ACCESS_TOKEN (min 24 chars)');

  // AUDIT 2026-08-12 (P1): PAYPAL_MODE fails open to SANDBOX. `PAYPAL_MODE === 'live' ? live : sandbox`
  // means a missing or misspelled value silently points production at sandbox — real customers get
  // a sandbox checkout and every "payment" is fake money. Refuse to boot rather than take play money.
  if (process.env.NODE_ENV === 'production') {
    const mode = process.env.PAYPAL_MODE;
    if (mode !== 'live' && mode !== 'sandbox') {
      throw new Error(
        `[SECURITY] PAYPAL_MODE must be explicitly "live" or "sandbox" in production (got: ${mode ?? 'unset'}). ` +
        'It fails open to sandbox, which silently takes fake money from real customers.',
      );
    }
    if (mode === 'sandbox') {
      console.warn('[PAYMENTS] PAYPAL_MODE=sandbox in a production build — no real money will be collected.');
    }
  }

  // Warn if CRON_SECRET looks human-readable (not hex/random)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && /^[a-z-]+$/i.test(cronSecret)) {
    console.warn('[SECURITY] CRON_SECRET appears human-readable. Use: openssl rand -hex 16');
  }

  // Nudge toward dedicated keys (audit F12) without failing the boot — they fall back to AUTH_SECRET.
  if (process.env.NODE_ENV === 'production') {
    const unset = RECOMMENDED_KEYS.filter((k) => !process.env[k]);
    if (unset.length > 0) {
      console.warn(`[SECURITY] For key separation, set: ${unset.join(', ')} (each: openssl rand -hex 32). Falling back to AUTH_SECRET for now.`);
    }
  }

  if (weak.length > 0) {
    const msg = `[SECURITY] Weak secrets: ${weak.join(', ')}. Generate with: openssl rand -hex 32`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  if (missing.length > 0) {
    const msg = `[SECURITY] Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }
}
