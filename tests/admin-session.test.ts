import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import fs from 'fs';
import postgres from 'postgres';

/**
 * Regression tests for AUDIT 2026-08-12 P1 A-01 — revocable admin sessions.
 *
 * THE INVARIANT: an admin cookie grants access only while a matching server-side session row is
 * present, unrevoked and unexpired. Before the fix the cookie WAS `ADMIN_ACCESS_TOKEN`, so it
 * never expired server-side and could not be revoked without rotating the env var and redeploying.
 *
 * These run against the local database (the same one `npm run verify:payments` targets). They
 * exercise the real SQL the auth path uses rather than a mock, because the whole point of the fix
 * is that the database is now the authority.
 */

function loadDbUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const m = fs.readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

const url = loadDbUrl();
const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const TEST_PREFIX = 'ZZZ-DELETE-ME-TEST-';

// Mirrors the lookup in verifyAdmin(): exists AND not revoked AND not expired.
async function sessionIsValid(sql: postgres.Sql, token: string): Promise<boolean> {
  const [row] = await sql`
    SELECT id FROM admin_sessions
    WHERE token_hash = ${hash(token)} AND revoked_at IS NULL AND expires_at > now()
    LIMIT 1
  `;
  return !!row;
}

describe.skipIf(!url)('admin sessions are revocable and expiring', () => {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(url as string, {
      ssl: url!.includes('localhost') || url!.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
      max: 1,
    });
  });

  afterAll(async () => {
    await sql`DELETE FROM admin_sessions WHERE user_agent LIKE ${TEST_PREFIX + '%'}`;
    await sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    await sql`DELETE FROM admin_sessions WHERE user_agent LIKE ${TEST_PREFIX + '%'}`;
  });

  async function insert(token: string, opts: { expiresInMs?: number; revoked?: boolean } = {}) {
    const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 60_000)).toISOString();
    await sql`
      INSERT INTO admin_sessions (token_hash, expires_at, revoked_at, user_agent)
      VALUES (${hash(token)}, ${expiresAt}, ${opts.revoked ? new Date().toISOString() : null}, ${TEST_PREFIX + 'ua'})
    `;
  }

  it('accepts a live session', async () => {
    await insert('live-token');
    expect(await sessionIsValid(sql, 'live-token')).toBe(true);
  });

  it('rejects a token with no session row (the old master-secret cookie)', async () => {
    expect(await sessionIsValid(sql, 'some-token-that-was-never-issued')).toBe(false);
  });

  // The whole point of A-01: sign-out must kill the credential server-side, not just locally.
  it('rejects a revoked session even though the cookie value is unchanged', async () => {
    await insert('revoke-me');
    expect(await sessionIsValid(sql, 'revoke-me')).toBe(true);
    await sql`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${hash('revoke-me')}`;
    expect(await sessionIsValid(sql, 'revoke-me')).toBe(false);
  });

  it('rejects an expired session — expiry is enforced by the server, not the browser', async () => {
    await insert('expired', { expiresInMs: -1000 });
    expect(await sessionIsValid(sql, 'expired')).toBe(false);
  });

  it('revoke-all kills every active session at once', async () => {
    await insert('a');
    await insert('b');
    await sql`UPDATE admin_sessions SET revoked_at = now() WHERE revoked_at IS NULL AND user_agent LIKE ${TEST_PREFIX + '%'}`;
    expect(await sessionIsValid(sql, 'a')).toBe(false);
    expect(await sessionIsValid(sql, 'b')).toBe(false);
  });

  it('stores only the hash — the raw token is never persisted', async () => {
    await insert('secret-token-value');
    const [row] = await sql`
      SELECT token_hash FROM admin_sessions WHERE token_hash = ${hash('secret-token-value')}
    `;
    expect(row.token_hash).toBe(hash('secret-token-value'));
    expect(row.token_hash).not.toContain('secret-token-value');
    const leaked = await sql`
      SELECT id FROM admin_sessions WHERE token_hash = ${'secret-token-value'}
    `;
    expect(leaked.length).toBe(0);
  });

  it('one session revoked does not affect another', async () => {
    await insert('keep');
    await insert('kill');
    await sql`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${hash('kill')}`;
    expect(await sessionIsValid(sql, 'keep')).toBe(true);
    expect(await sessionIsValid(sql, 'kill')).toBe(false);
  });
});
