# Migrations

## How this works (and doesn't)

There is **no migration runner in this repo.** The database *does* track what has been applied —
`schema_migrations (name, applied_at, checksum)` holds 38 rows dating from 2026-04-24 — but nothing
in `src/` or `scripts/` reads or writes that table any more. The runner was lost; the history was
not.

**Apply migrations by hand, in filename order, and record them.** Verify the money-path constraints
afterwards with `npm run verify:payments`.

`000-baseline.sql` is a `pg_dump --schema-only` of the live schema (59 tables, 123 indexes, 46 FKs),
committed so the database can be rebuilt from source. **Only run it against an empty database.**

## Applied to LOCAL only — must still be applied to production

Added during the 2026-08-12 audit remediation:

| File | What it does | If skipped |
|---|---|---|
| `056-email-failures.sql` | dead-letter table for failed email | send failures stay invisible |
| `057-preserve-financial-records.sql` | `payments` / `payment_refunds` FK → `ON DELETE RESTRICT` | deleting a project destroys its payment records |
| `058-admin-sessions.sql` | revocable admin sessions | **admin login breaks** (`ADMIN_LEGACY_COOKIE=1` is the escape hatch) |
| `059-scheduled-proposal-claim.sql` | allows the `sending` claim state + a due-row index | the proposal cron's row claim fails at runtime, and overlapping runs double-email prospects |

## Never applied, and nothing uses them

`037-multi-tenant.sql`, `038-plans-subscriptions.sql`, `039-usage-tracking.sql`,
`040-user-settings.sql`.

Verified 2026-08-12: none appear in `schema_migrations`, and none of the tables they create
(`tenants`, `plans`, `subscriptions`, `usage_events`, `user_settings`) exist in the database.
Nothing in `src/` references them.

They describe a multi-tenant SaaS direction with plans and subscriptions — a different product from
the fixed-price studio StrataLanding actually is. **Kept rather than deleted** because they are
coherent design work that may be wanted if the product ever moves that way; deleting them would
throw away thinking, while applying them would add five unused tables to production. If that
direction is definitively abandoned, delete these four files.

## Gaps in the numbering

Files `001`–`019` and `021`–`036` are absent from the repo but *are* recorded in
`schema_migrations`, so they were applied to the live database and their artefacts were lost.
`000-baseline.sql` captures their cumulative result, which is why it exists.
