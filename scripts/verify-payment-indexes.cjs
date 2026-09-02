#!/usr/bin/env node
/**
 * Pre-flight check for the money path. RUN THIS AGAINST PRODUCTION NEON BEFORE PAYPAL_MODE=live.
 *
 * AUDIT 2026-08-12 (P0-8). Three INSERT ... ON CONFLICT statements on the payment path infer their
 * conflict target from partial unique indexes that exist only in hand-applied .sql files. There is
 * no migration runner, no applied-migrations table, and no CI step that applies them — so whether
 * they exist in prod is unknown. If they do not, Postgres raises 42P10 ("no unique or exclusion
 * constraint matching the ON CONFLICT specification") AFTER PayPal has already taken the money:
 * no payments row is written, the project never leaves proposal_sent, chat never unlocks, and the
 * webhook 500s into an infinite PayPal retry loop.
 *
 *   node scripts/verify-payment-indexes.cjs
 *
 * Reads DATABASE_URL from the environment (or .env.local). Exits non-zero if anything is missing.
 */

const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// Minimal .env.local reader so this runs without extra tooling.
function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// Each entry: the guarantee the code depends on, and why it matters.
const REQUIRED_UNIQUE = [
  {
    table: 'payments',
    column: 'paypal_capture_id',
    why: 'capture-order + webhook idempotency. Without it a refresh, double-click or PayPal retry writes duplicate payment rows and can double-advance status.',
  },
  {
    table: 'payments',
    column: 'paypal_event_id',
    why: 'webhook exactly-once processing. Without it a redelivered event re-sends the confirmation email and re-credits affiliate commission.',
  },
  {
    table: 'payment_refunds',
    column: 'paypal_event_id',
    why: 'refund/dispute exactly-once. Without it a redelivered refund event claws back commission repeatedly.',
  },
  {
    table: 'referral_conversions',
    column: 'project_id',
    why: 'one commission per project. Without it an admin status reset + re-pay double-credits the affiliate.',
  },
];

(async () => {
  const url = loadEnv();
  if (!url) {
    console.error('✗ DATABASE_URL is not set (env or .env.local).');
    process.exit(2);
  }

  const sql = postgres(url, {
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
    max: 1,
  });

  let failures = 0;
  try {
    for (const req of REQUIRED_UNIQUE) {
      const rows = await sql`
        SELECT i.indexname, i.indexdef
        FROM pg_indexes i
        WHERE i.tablename = ${req.table} AND i.indexdef ILIKE ${'%UNIQUE%'} AND i.indexdef ILIKE ${`%${req.column}%`}
      `;
      if (rows.length === 0) {
        failures++;
        console.error(`✗ MISSING unique index: ${req.table}(${req.column})`);
        console.error(`    ${req.why}`);
      } else {
        console.log(`✓ ${req.table}(${req.column}) — ${rows[0].indexname}`);
      }
    }

    // The durable rate limiter fails open without its table (audit P2). Migration 047 creates
    // `rate_limit_counters` — note the name; `rate_limits` does not exist.
    const [rl] = await sql`SELECT to_regclass('public.rate_limit_counters') AS t`;
    if (!rl?.t) {
      failures++;
      console.error('✗ MISSING table: rate_limit_counters — durable rate limiting fails OPEN (migration 047).');
    } else {
      console.log('✓ rate_limit_counters table present');
    }
  } catch (err) {
    console.error('✗ Check failed:', err.message);
    process.exit(2);
  } finally {
    await sql.end({ timeout: 5 });
  }

  if (failures > 0) {
    console.error(`\n${failures} problem(s). Apply migrations/045-security-constraints.sql and 048-refunds-and-tokens.sql to this database BEFORE taking real payments.`);
    process.exit(1);
  }
  console.log('\nAll payment-path constraints present. Safe to proceed.');
})();
