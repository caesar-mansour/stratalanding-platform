import sql from './db';

export type SuppressionReason =
  | 'one_click_unsubscribe'
  | 'manual_unsubscribe'
  | 'hard_bounce'
  | 'spam_complaint'
  | 'reply_remove_request'
  | 'admin_suppressed';

export interface SuppressionEntry {
  email: string;
  reason: SuppressionReason;
  source?: string;
  notes?: string;
  unsubscribed_at: Date;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isSuppressed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM email_suppressions WHERE LOWER(email) = ${normalized}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

export async function addSuppression(opts: {
  email: string;
  reason: SuppressionReason;
  source?: string;
  notes?: string;
  userId?: string;
}): Promise<void> {
  const email = normalizeEmail(opts.email);
  if (!email) return;
  // V1: hardcoded to Caesar's founder user_id when no caller passes one.
  // Phase 2 will plumb the real session userId through every callsite.
  const userId = opts.userId ?? 'b1a5e4a0-0000-4000-8000-c0a050000001';
  await sql`
    INSERT INTO email_suppressions (user_id, email, reason, source, notes)
    VALUES (${userId}::uuid, ${email}, ${opts.reason}, ${opts.source ?? null}, ${opts.notes ?? null})
    ON CONFLICT (email) DO UPDATE
      SET reason = EXCLUDED.reason,
          source = COALESCE(EXCLUDED.source, email_suppressions.source),
          notes = COALESCE(EXCLUDED.notes, email_suppressions.notes),
          unsubscribed_at = NOW()
  `;
}

export async function getSuppression(email: string): Promise<SuppressionEntry | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const rows = await sql<SuppressionEntry[]>`
    SELECT email, reason, source, notes, unsubscribed_at
    FROM email_suppressions
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
