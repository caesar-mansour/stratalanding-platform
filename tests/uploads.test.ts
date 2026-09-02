import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import postgres from 'postgres';

/**
 * Upload architecture regression tests (audit 2026-08-12).
 *
 * `file_store` held the actual bytes with NO owner column and NO foreign key. Authorization still
 * worked, but only by PARSING the project id out of the storage-key string — a convention, not a
 * constraint. A key written without it escaped the check, and a deleted project left its bytes
 * behind forever.
 *
 * These run against the real database, because what is being tested IS the schema: the FK, the
 * cascade, and the ownership join. A mock would assert my own assumptions back at me.
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
const TAG = 'ZZZ-DELETE-ME-TEST';

describe.skipIf(!url)('file_store ownership and lifecycle', () => {
  let sql: postgres.Sql;
  let clientA: string, clientB: string, projectA: string, projectB: string;

  beforeAll(() => {
    sql = postgres(url as string, {
      ssl: url!.includes('localhost') || url!.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
      max: 2,
    });
  });

  async function cleanup() {
    await sql`DELETE FROM file_store WHERE uploaded_by = ${TAG}`;
    const clients = await sql`SELECT id FROM clients WHERE email LIKE ${TAG + '%'}`;
    for (const c of clients) {
      await sql`DELETE FROM file_store WHERE project_id IN (SELECT id FROM projects WHERE client_id = ${c.id})`;
      await sql`DELETE FROM projects WHERE client_id = ${c.id}`;
      await sql`DELETE FROM clients WHERE id = ${c.id}`;
    }
  }

  beforeEach(async () => {
    await cleanup();
    const [a] = await sql`INSERT INTO clients (email, name) VALUES (${TAG + '-a@example.com'}, 'A') RETURNING id`;
    const [b] = await sql`INSERT INTO clients (email, name) VALUES (${TAG + '-b@example.com'}, 'B') RETURNING id`;
    clientA = a.id; clientB = b.id;
    const [pa] = await sql`INSERT INTO projects (client_id, package, timeline, status, site_id) VALUES (${clientA},'growth','no_rush','new',${TAG + '-a'}) RETURNING id`;
    const [pb] = await sql`INSERT INTO projects (client_id, package, timeline, status, site_id) VALUES (${clientB},'growth','no_rush','new',${TAG + '-b'}) RETURNING id`;
    projectA = pa.id; projectB = pb.id;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end({ timeout: 5 });
  });

  async function putFile(key: string, projectId: string | null) {
    await sql`
      INSERT INTO file_store (storage_key, file_data, content_type, file_size, project_id, uploaded_by)
      VALUES (${key}, ${Buffer.from('x')}, 'image/png', 1, ${projectId}, ${TAG})
    `;
  }

  // The authorization query the download route now runs.
  async function canRead(key: string, clientId: string): Promise<boolean> {
    const [row] = await sql`
      SELECT fs.storage_key FROM file_store fs
      INNER JOIN projects p ON p.id = fs.project_id
      WHERE fs.storage_key = ${key} AND p.client_id = ${clientId}
      LIMIT 1
    `;
    return !!row;
  }

  it('records the owning project on upload', async () => {
    await putFile('project-files/a/logo.png', projectA);
    const [row] = await sql`SELECT project_id FROM file_store WHERE storage_key = 'project-files/a/logo.png'`;
    expect(row.project_id).toBe(projectA);
  });

  it('AUTHORIZED read: the owning client can read their own file', async () => {
    await putFile('project-files/a/logo.png', projectA);
    expect(await canRead('project-files/a/logo.png', clientA)).toBe(true);
  });

  // The core cross-tenant case.
  it('UNAUTHORIZED read: another client cannot read it', async () => {
    await putFile('project-files/a/logo.png', projectA);
    expect(await canRead('project-files/a/logo.png', clientB)).toBe(false);
  });

  it('CROSS-PROJECT: a file owned by project B is not readable via client A', async () => {
    await putFile('project-files/b/secret.png', projectB);
    expect(await canRead('project-files/b/secret.png', clientA)).toBe(false);
    expect(await canRead('project-files/b/secret.png', clientB)).toBe(true);
  });

  // This is what the missing FK allowed: bytes surviving their project forever.
  it('OWNER DELETION cascades: deleting the project deletes its bytes', async () => {
    await putFile('project-files/a/one.png', projectA);
    await putFile('project-files/a/two.png', projectA);
    const before = await sql`SELECT count(*)::int n FROM file_store WHERE project_id = ${projectA}`;
    expect(before[0].n).toBe(2);

    await sql`DELETE FROM projects WHERE id = ${projectA}`;

    const after = await sql`SELECT count(*)::int n FROM file_store WHERE storage_key IN ('project-files/a/one.png','project-files/a/two.png')`;
    expect(after[0].n).toBe(0);
  });

  it('deleting one project leaves another project files intact', async () => {
    await putFile('project-files/a/one.png', projectA);
    await putFile('project-files/b/one.png', projectB);
    await sql`DELETE FROM projects WHERE id = ${projectA}`;
    const [row] = await sql`SELECT count(*)::int n FROM file_store WHERE project_id = ${projectB}`;
    expect(row.n).toBe(1);
  });

  it('rejects a file whose project does not exist (referential integrity)', async () => {
    const ghost = '00000000-0000-0000-0000-000000000000';
    await expect(putFile('project-files/ghost/x.png', ghost)).rejects.toThrow();
  });

  it('an unowned legacy row is NOT readable through the ownership join', async () => {
    // Rows written before migration 061 have project_id NULL. They must not satisfy the join —
    // the route falls back to the stricter path-segment check for those, deliberately.
    await putFile('legacy/orphan.png', null);
    expect(await canRead('legacy/orphan.png', clientA)).toBe(false);
    expect(await canRead('legacy/orphan.png', clientB)).toBe(false);
  });
});

describe('upload validation limits', () => {
  it('the server ceiling matches what the platform accepts', () => {
    const uploads = fs.readFileSync('src/app/api/uploads/route.ts', 'utf8');
    const chat = fs.readFileSync('src/app/api/chat-upload/route.ts', 'utf8');
    // Netlify caps a function request payload near 6 MB; anything above that fails at the edge
    // with an opaque error instead of our clean message.
    expect(uploads).toContain('5 * 1024 * 1024');
    expect(chat).toContain('5 * 1024 * 1024');
  });

  it('the client-facing copy matches the server ceiling', () => {
    const ui = fs.readFileSync('src/app/portal/uploads/UploadsContent.tsx', 'utf8');
    expect(ui).toContain('Max 5MB per file');
    expect(ui).not.toContain('Max 10MB');
  });

  it('uploads are type-validated, not just size-validated', () => {
    const uploads = fs.readFileSync('src/app/api/uploads/route.ts', 'utf8');
    expect(uploads).toMatch(/allowed|ALLOWED|file\.type/);
  });
});
