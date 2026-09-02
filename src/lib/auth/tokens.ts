import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import crypto from 'crypto';
import { mfaEncKey, otpPepper } from '@/lib/security/keys';

// SECURITY (audit L-edge-secret): fail fast if AUTH_SECRET is unset. The node-runtime boot check
// (validate-env) enforces this in production, but the EDGE middleware path isn't covered by it —
// without this assert, `encode(undefined)` would silently degrade to the guessable bytes of the
// string "undefined" instead of erroring.
const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
};

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Keyed (HMAC-SHA256) hash for LOW-ENTROPY secrets like the 6-digit preview OTP (audit F69).
 * A bare SHA-256 of a 6-digit code is instantly reversible with a rainbow table if the DB leaks;
 * an HMAC with a server-side pepper is not. Prefer a dedicated OTP_PEPPER; fall back to AUTH_SECRET
 * (a strong secret) during rollout so this never degrades to an empty/guessable key.
 *
 * SECURITY (audit L-hmac-empty): use the fail-closed `otpPepper()` resolver as the default instead
 * of the old `... || ''`, which could HMAC with an EMPTY key (defeating the pepper) if both env
 * vars were ever unset. `otpPepper()` throws when neither is set rather than degrading silently.
 */
export function hmacToken(value: string, pepper: string = otpPepper()): string {
  return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}

export interface SessionJWTPayload extends JWTPayload {
  sub: string;
  email: string;
  sid: string;
  aal: 'aal1' | 'aal2';
  has_mfa: boolean;
}

export async function generateSessionJWT(payload: {
  userId: string;
  email: string;
  sessionId: string;
  aal: 'aal1' | 'aal2';
  hasMfa: boolean;
  expiresAt: Date;
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    sid: payload.sessionId,
    aal: payload.aal,
    has_mfa: payload.hasMfa,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt.getTime() / 1000))
    .sign(getSecret());
}

export async function verifySessionJWT(token: string): Promise<SessionJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    return payload as SessionJWTPayload;
  } catch {
    return null;
  }
}

// Encrypt/decrypt TOTP secrets (and outreach app passwords) for at-rest storage.
// SECURITY (audit F12): derive the AES key from a DEDICATED MFA_ENC_KEY (falling back to
// AUTH_SECRET during rollout) with a PER-RECORD random salt — not the old static 'salt' that
// reused one key for every record. New ciphertext is `salt:iv:tag:ct` (4 parts); the decryptor
// still reads the legacy `iv:tag:ct` (3 parts) so existing secrets keep working.
export function encryptSecret(plaintext: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(mfaEncKey(), salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length === 4) {
    // New format: salt:iv:tag:ct, key derived from MFA_ENC_KEY (or AUTH_SECRET) + per-record salt.
    const [saltHex, ivHex, authTagHex, encrypted] = parts;
    const key = crypto.scryptSync(mfaEncKey(), Buffer.from(saltHex, 'hex'), 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  // LEGACY format: iv:tag:ct, key derived from AUTH_SECRET with the old static 'salt'.
  const [ivHex, authTagHex, encrypted] = parts;
  const key = crypto.scryptSync(process.env.AUTH_SECRET!, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
