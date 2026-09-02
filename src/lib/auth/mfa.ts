import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import sql from '@/lib/db';
import { encryptSecret, decryptSecret } from './tokens';

const TOTP_PERIOD = 30;

// The absolute TOTP time-step a validated code belongs to. `delta` is otpauth's offset of the
// accepted code from the current step; adding it to the current step yields a value that is
// STABLE for a given code across the whole validation window (as `delta` shrinks by 1 each time
// the current step advances). We persist it per factor so a code can't be replayed (audit M3).
function usedStepFor(delta: number): number {
  return Math.floor(Date.now() / 1000 / TOTP_PERIOD) + delta;
}

export async function enrollMFAFactor(userId: string): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}> {
  const totp = new OTPAuth.TOTP({
    issuer: 'StrataLanding',
    label: 'StrataLanding',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secretBase32 = totp.secret.base32;
  const uri = totp.toString();
  const encrypted = encryptSecret(secretBase32);

  const [factor] = await sql`
    INSERT INTO auth_mfa_factors (user_id, secret_encrypted, verified, friendly_name)
    VALUES (${userId}, ${encrypted}, false, 'Authenticator App')
    RETURNING id
  `;

  if (!factor) {
    throw new Error('Failed to create MFA factor');
  }

  const qrCode = await QRCode.toDataURL(uri);

  return {
    factorId: factor.id,
    qrCode,
    secret: secretBase32,
    uri,
  };
}

export async function verifyAndActivateFactor(factorId: string, code: string, userId: string): Promise<boolean> {
  // SECURITY (audit F62): scope to the owning user so a caller cannot activate/verify
  // another user's MFA factor by guessing a factorId.
  const [factor] = await sql`
    SELECT secret_encrypted, last_used_step FROM auth_mfa_factors WHERE id = ${factorId} AND user_id = ${userId} LIMIT 1
  `;

  if (!factor) return false;

  const secretBase32 = decryptSecret(factor.secret_encrypted);

  const totp = new OTPAuth.TOTP({
    issuer: 'StrataLanding',
    label: 'StrataLanding',
    algorithm: 'SHA1',
    digits: 6,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;

  // SECURITY (audit M3): reject a code whose time-step was already consumed (replay).
  const usedStep = usedStepFor(delta);
  if (factor.last_used_step !== null && Number(factor.last_used_step) >= usedStep) return false;

  await sql`UPDATE auth_mfa_factors SET verified = true, last_used_step = ${usedStep} WHERE id = ${factorId} AND user_id = ${userId}`;

  return true;
}

export async function verifyMFACode(userId: string, code: string): Promise<{ valid: boolean; factorId?: string }> {
  const factors = await sql`
    SELECT id, secret_encrypted, last_used_step FROM auth_mfa_factors
    WHERE user_id = ${userId} AND verified = true
  `;

  if (!factors || factors.length === 0) return { valid: false };

  for (const factor of factors) {
    const secretBase32 = decryptSecret(factor.secret_encrypted);

    const totp = new OTPAuth.TOTP({
      issuer: 'StrataLanding',
      label: 'StrataLanding',
      algorithm: 'SHA1',
      digits: 6,
      period: TOTP_PERIOD,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      // SECURITY (audit M3): reject replay of an already-consumed time-step for this factor.
      const usedStep = usedStepFor(delta);
      if (factor.last_used_step !== null && Number(factor.last_used_step) >= usedStep) {
        return { valid: false };
      }
      await sql`UPDATE auth_mfa_factors SET last_used_step = ${usedStep} WHERE id = ${factor.id}`;
      return { valid: true, factorId: factor.id };
    }
  }

  return { valid: false };
}

export async function listUserFactors(userId: string): Promise<Array<{
  id: string;
  friendly_name: string;
  verified: boolean;
  created_at: string;
}>> {
  const factors = await sql`
    SELECT id, friendly_name, verified, created_at
    FROM auth_mfa_factors
    WHERE user_id = ${userId} AND verified = true
  `;

  return factors as unknown as Array<{
    id: string;
    friendly_name: string;
    verified: boolean;
    created_at: string;
  }>;
}

export async function deleteFactor(factorId: string, userId: string): Promise<void> {
  // SECURITY (audit L-deleteFactor): scope the delete to the owning user so a factorId alone
  // can never remove another user's factor (defense-in-depth).
  await sql`DELETE FROM auth_mfa_factors WHERE id = ${factorId} AND user_id = ${userId}`;
}

export async function hasVerifiedFactors(userId: string): Promise<boolean> {
  const factors = await sql`
    SELECT id FROM auth_mfa_factors
    WHERE user_id = ${userId} AND verified = true
    LIMIT 1
  `;

  return factors.length > 0;
}
