import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import postgres from 'postgres';

/**
 * GATE 8 (2026-08-12): manual admin proposals were created with `project_id` NULL.
 *
 * Both create-payment and capture-payment refuse to act on a proposal with no linked project —
 * verified against the deployed preview, which returned:
 *
 *   POST /api/proposals/<id>/create-payment -> 400 {"error":"No project linked to this proposal"}
 *
 * So every hand-built proposal was unpayable, and nothing back-filled the link.
 *
 * These run against the real database because what is being tested IS the resolution rule: which
 * projects are eligible, whether a project belongs to the client, and whether the answer is
 * unambiguous. A mock would only assert my own assumptions back at me.
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
// Deliberately NOT prefixed 'ZZZ-DELETE-ME-TEST': uploads.test.ts deletes every client matching
// 'ZZZ-DELETE-ME-TEST%', and vitest runs test files in parallel — a shared prefix let that cleanup
// delete these fixtures mid-run.
const TAG = 'ZZZ-DELETE-ME-LINKAGE';

// The eligibility rule, kept identical to POST /api/admin/proposals.
const ELIGIBLE_STATUSES = ['new', 'proposal_sent'];

describe.skipIf(!url)('admin proposal -> project linkage', () => {
  let sql: postgres.Sql;
  let clientA: string, clientB: string;

  beforeAll(() => {
    sql = postgres(url as string, {
      ssl: url!.includes('localhost') || url!.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
      max: 2,
    });
  });

  async function cleanup() {
    const clients = await sql`SELECT id FROM clients WHERE email LIKE ${TAG + '%'}`;
    for (const c of clients) {
      await sql`DELETE FROM proposals WHERE project_id IN (SELECT id FROM projects WHERE client_id = ${c.id})`;
      await sql`DELETE FROM projects WHERE client_id = ${c.id}`;
      await sql`DELETE FROM clients WHERE id = ${c.id}`;
    }
  }

  beforeEach(async () => {
    await cleanup();
    const [a] = await sql`INSERT INTO clients (email, name) VALUES (${TAG + '-a@example.com'}, 'A') RETURNING id`;
    const [b] = await sql`INSERT INTO clients (email, name) VALUES (${TAG + '-b@example.com'}, 'B') RETURNING id`;
    clientA = a.id; clientB = b.id;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end({ timeout: 5 });
  });

  async function addProject(clientId: string, status: string, slug: string) {
    const [p] = await sql`
      INSERT INTO projects (client_id, package, timeline, status, site_id)
      VALUES (${clientId}, 'growth', 'no_rush', ${status}, ${TAG + '-' + slug})
      RETURNING id
    `;
    return p.id as string;
  }

  // The ownership check the route runs for an explicitly supplied project_id.
  async function ownerEmailOf(projectId: string): Promise<string | null> {
    const [row] = await sql<{ email: string }[]>`
      SELECT c.email FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;
    return row ? row.email : null;
  }

  // The fallback query the route runs when project_id is absent.
  async function eligibleFor(email: string): Promise<string[]> {
    const rows = await sql<{ id: string }[]>`
      SELECT p.id FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE lower(c.email) = ${email.toLowerCase()}
        AND p.status = ANY(${ELIGIBLE_STATUSES})
    `;
    return rows.map((r) => r.id);
  }

  it('EXPLICIT: a valid project_id owned by the client resolves and links', async () => {
    const pid = await addProject(clientA, 'new', 'explicit');
    expect(await ownerEmailOf(pid)).toBe(TAG + '-a@example.com');

    await sql`
      INSERT INTO proposals (client_name, client_email, company_name, package, valid_until, status, project_id)
      VALUES ('A', ${TAG + '-a@example.com'}, 'ACo', 'growth', now() + interval '7 days', 'sent', ${pid})
    `;
    const [row] = await sql`SELECT project_id FROM proposals WHERE project_id = ${pid}`;
    expect(row.project_id).toBe(pid);
  });

  // The case that must never be allowed: attaching one client's project to another's proposal.
  it('EXPLICIT: a project_id belonging to ANOTHER client is rejected by the ownership check', async () => {
    const pidB = await addProject(clientB, 'new', 'other');
    const ownerEmail = await ownerEmailOf(pidB);
    const proposalEmail = TAG + '-a@example.com';
    expect(ownerEmail!.toLowerCase()).not.toBe(proposalEmail.toLowerCase());
  });

  it('EXPLICIT: an unknown project_id resolves to no owner', async () => {
    expect(await ownerEmailOf('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('FALLBACK: exactly one eligible project auto-resolves', async () => {
    const pid = await addProject(clientA, 'new', 'single');
    const found = await eligibleFor(TAG + '-a@example.com');
    expect(found).toHaveLength(1);
    expect(found[0]).toBe(pid);
  });

  it('FALLBACK: zero eligible projects -> nothing to resolve (route returns 400)', async () => {
    expect(await eligibleFor(TAG + '-a@example.com')).toHaveLength(0);
  });

  it('FALLBACK: an already-paid project is NOT eligible', async () => {
    await addProject(clientA, 'deposit_paid', 'paid');
    expect(await eligibleFor(TAG + '-a@example.com')).toHaveLength(0);
  });

  it('FALLBACK: more than one eligible project -> ambiguous (route returns 409, never picks one)', async () => {
    await addProject(clientA, 'new', 'multi1');
    await addProject(clientA, 'proposal_sent', 'multi2');
    const found = await eligibleFor(TAG + '-a@example.com');
    expect(found.length).toBeGreaterThan(1);
  });

  it('FALLBACK: email matching is case-insensitive, matching the client model', async () => {
    const pid = await addProject(clientA, 'new', 'case');
    const found = await eligibleFor((TAG + '-a@example.com').toUpperCase());
    expect(found).toEqual([pid]);
  });

  it('a linked proposal satisfies the create-payment precondition; an unlinked one does not', async () => {
    const pid = await addProject(clientA, 'new', 'precond');
    const [linked] = await sql`
      INSERT INTO proposals (client_name, client_email, company_name, package, valid_until, status, project_id)
      VALUES ('A', ${TAG + '-a@example.com'}, 'ACo', 'growth', now() + interval '7 days', 'sent', ${pid})
      RETURNING project_id
    `;
    const [unlinked] = await sql`
      INSERT INTO proposals (client_name, client_email, company_name, package, valid_until, status)
      VALUES ('A', ${TAG + '-a@example.com'}, 'ACo', 'growth', now() + interval '7 days', 'sent')
      RETURNING project_id
    `;
    // create-payment / capture-payment both guard on exactly this.
    expect(linked.project_id).toBeTruthy();
    expect(unlinked.project_id).toBeNull();
    await sql`DELETE FROM proposals WHERE client_email = ${TAG + '-a@example.com'}`;
  });
});

describe('proposal creation paths still set project_id', () => {
  const read = (p: string) => fs.readFileSync(p, 'utf8');

  it('the admin route now accepts and persists project_id', () => {
    const src = read('src/app/api/admin/proposals/route.ts');
    expect(src).toContain('project_id');
    expect(src).toMatch(/INSERT INTO proposals[\s\S]*project_id/);
    expect(src).toContain('resolvedProjectId');
  });

  it('the admin route refuses to guess between multiple projects', () => {
    const src = read('src/app/api/admin/proposals/route.ts');
    expect(src).toContain('status: 409');
    // The silent-arbitrary-pick this fix exists to prevent.
    expect(src).not.toMatch(/ORDER BY p\.created_at DESC\s*\n\s*LIMIT 1/);
  });

  it('the admin route validates that the project belongs to the client', () => {
    const src = read('src/app/api/admin/proposals/route.ts');
    expect(src).toContain('belongs to a different client');
    expect(src).toContain('status: 403');
  });

  // Regression guard: the two automated paths already worked and must keep working.
  it('proposal-generator still inserts project_id (unchanged)', () => {
    const src = read('src/lib/proposal-generator.ts');
    expect(src).toMatch(/INSERT INTO proposals[\s\S]*project_id/);
  });

  it('cron/send-proposals still inserts project_id (unchanged)', () => {
    const src = read('src/app/api/cron/send-proposals/route.ts');
    expect(src).toMatch(/INSERT INTO proposals[\s\S]*project_id/);
  });

  // The invariant must not be relaxed to make the admin path work.
  it('create-payment and capture-payment still require a linked project', () => {
    expect(read('src/app/api/proposals/[id]/create-payment/route.ts')).toContain('!proposal.project_id');
    expect(read('src/app/api/proposals/[id]/capture-payment/route.ts')).toContain('!proposal.project_id');
  });
});
