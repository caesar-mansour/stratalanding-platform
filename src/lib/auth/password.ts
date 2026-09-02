import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BCRYPT_ROUNDS } from './constants';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A constant, valid bcrypt hash used to equalize response timing (audit F13). When an email
 * doesn't exist (or has no password), run verifyPassword against THIS hash so a "no such user"
 * response takes the same ~bcrypt time as a "wrong password" one — closing the timing side-channel
 * that otherwise lets an attacker enumerate which emails are registered.
 */
export const DUMMY_BCRYPT_HASH = '$2b$12$Csx7YKmA/aFgNs.FgWjHn.HF6hIXHtqSPRpD0zdk9QMJwKVQHCzgK';

// Generate a strong, human-readable password (no look-alike chars) for
// auto-provisioned accounts. 14 chars, guaranteed upper/lower/digit.
export function generatePassword(): string {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const L = 'abcdefghijkmnpqrstuvwxyz';
  const D = '23456789';
  const all = U + L + D;
  const pick = (s: string) => s[crypto.randomInt(s.length)];
  const chars = [pick(U), pick(L), pick(D)];
  for (let i = 0; i < 11; i++) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
