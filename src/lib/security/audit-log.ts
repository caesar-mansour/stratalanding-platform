import crypto from 'crypto';
import sql from '@/lib/db';

export type SecurityEvent =
  | 'login_success' | 'login_failure'
  | 'signup'
  | 'magic_link_sent' | 'magic_link_used'
  | 'password_reset_request' | 'password_reset_complete'
  | 'mfa_enroll' | 'mfa_verify_success' | 'mfa_verify_failure'
  | 'session_created' | 'session_destroyed'
  | 'admin_login' | 'admin_action'
  | 'file_upload' | 'file_download'
  | 'account_lockout' | 'rate_limit_exceeded'
  // Edge WAF (audit: elite security platform)
  | 'waf_block' | 'honeypot_hit' | 'waf_shadow';

interface LogParams {
  event: SecurityEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity?: 'info' | 'warn' | 'critical';
}

// A fixed advisory-lock key that serializes audit-log inserts so the hash chain links correctly
// under concurrency (any constant works — it just has to be the same everywhere).
const CHAIN_LOCK_KEY = 4815162342;

function sha256hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Canonical, round-trip-safe representation of the chained fields. `details` is intentionally
// EXCLUDED (a JSONB column normalizes key order/spacing on read, which would break verification);
// deletions/reordering are still caught by the prev_hash linkage, and the who/what/severity scalars
// are protected.
function canonical(p: { event: string; userId?: string; email?: string; ip?: string; userAgent?: string; severity: string; prevHash: string }): string {
  return [p.event, p.userId || '', p.email || '', p.ip || '', p.userAgent || '', p.severity, p.prevHash].join('|');
}

/**
 * Log a security event to security_audit_log, hash-chained for tamper-evidence (audit: elite
 * security platform). Each row's `entry_hash = sha256(canonical || prev_hash)`, so a deleted or
 * edited row breaks the chain (see verifyAuditChain). NEVER throws and never loses an event: if the
 * chained insert fails (e.g. migration 051 not yet applied → no hash columns), it falls back to a
 * plain insert.
 */
export async function logSecurityEvent(params: LogParams): Promise<void> {
  const severity = params.severity || 'info';
  const detailsJson = JSON.stringify(params.details || {});
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sql.begin(async (tx: any) => {
      await tx`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`;
      const [last] = await tx`
        SELECT entry_hash FROM security_audit_log
        WHERE entry_hash IS NOT NULL
        ORDER BY created_at DESC, id DESC LIMIT 1
      `;
      const prevHash = (last?.entry_hash as string) || 'genesis';
      const entryHash = sha256hex(canonical({
        event: params.event, userId: params.userId, email: params.email,
        ip: params.ip, userAgent: params.userAgent, severity, prevHash,
      }));
      await tx`
        INSERT INTO security_audit_log
          (event_type, user_id, email, ip_address, user_agent, details, severity, prev_hash, entry_hash)
        VALUES (
          ${params.event}, ${params.userId || null}, ${params.email || null},
          ${params.ip || null}, ${params.userAgent || null}, ${detailsJson}, ${severity},
          ${prevHash}, ${entryHash}
        )
      `;
    });
  } catch {
    // Fallback — never lose an event (hash columns may not exist yet).
    try {
      await sql`
        INSERT INTO security_audit_log
          (event_type, user_id, email, ip_address, user_agent, details, severity)
        VALUES (
          ${params.event}, ${params.userId || null}, ${params.email || null},
          ${params.ip || null}, ${params.userAgent || null}, ${detailsJson}, ${severity}
        )
      `;
    } catch (error) {
      console.error('[SECURITY AUDIT] Failed to log event:', params.event, error);
    }
  }
}

export interface ChainVerifyResult {
  ok: boolean;
  checked: number;
  brokenAtId?: string;
  reason?: string;
}

/**
 * Walk the most-recent `limit` chained rows and verify the hash chain is intact. Detects content
 * edits (recomputed entry_hash mismatch) and deletions/reordering (prev_hash linkage break).
 * Used by the Security Command Center integrity badge.
 */
export async function verifyAuditChain(limit = 1000): Promise<ChainVerifyResult> {
  try {
    const recent = await sql`
      SELECT id, event_type, user_id, email, ip_address, user_agent, severity, prev_hash, entry_hash
      FROM security_audit_log
      WHERE entry_hash IS NOT NULL
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `;
    const rows = [...recent].reverse(); // chronological
    let checked = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const recomputed = sha256hex(canonical({
        event: r.event_type as string,
        userId: (r.user_id as string) || '',
        email: (r.email as string) || '',
        ip: (r.ip_address as string) || '',
        userAgent: (r.user_agent as string) || '',
        severity: (r.severity as string) || 'info',
        prevHash: (r.prev_hash as string) || '',
      }));
      if (recomputed !== r.entry_hash) {
        return { ok: false, checked, brokenAtId: String(r.id), reason: 'content tampered' };
      }
      if (i > 0 && r.prev_hash !== rows[i - 1].entry_hash) {
        return { ok: false, checked, brokenAtId: String(r.id), reason: 'chain link broken (row deleted/reordered)' };
      }
      checked++;
    }
    return { ok: true, checked };
  } catch (error) {
    console.error('[SECURITY AUDIT] chain verify failed:', error);
    return { ok: false, checked: 0, reason: 'verification query failed (migration 051 applied?)' };
  }
}
