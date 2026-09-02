// Domain-level sending guardrails.
// Prevents any single domain (especially the money domain stratalanding.com)
// from exceeding a hard ceiling across all its inboxes on a given day.
//
// Hard ceiling semantics:
//   - sent_today < daily_cap         → safe
//   - daily_cap ≤ sent_today < ceil  → worker emits a warning event but continues
//   - sent_today ≥ ceil              → worker refuses to send; requeues for tomorrow

import { getDomainLimit } from './db';

export interface DomainAllowanceResult {
  allowed: boolean;
  domain: string;
  sent_today: number;
  daily_cap: number;
  hard_ceiling: number;
  reason?: 'over_ceiling' | 'not_configured';
  warn?: boolean;          // true when between soft cap and ceiling
  is_transactional?: boolean;
}

export function extractDomain(email: string): string {
  const at = email.indexOf('@');
  if (at === -1) return email.toLowerCase();
  return email.slice(at + 1).toLowerCase();
}

export async function checkDomainAllowance(inboxEmail: string): Promise<DomainAllowanceResult> {
  const domain = extractDomain(inboxEmail);
  const limit = await getDomainLimit(domain);

  // If a domain isn't configured, allow by default but log a note. Operator
  // should add it to `outreach_domain_limits` to be safe.
  if (!limit) {
    return {
      allowed: true,
      domain,
      sent_today: 0,
      daily_cap: 25,
      hard_ceiling: 40,
      reason: 'not_configured',
    };
  }

  // If sent_today_date is stale (yesterday), treat sent_today as 0.
  const isStale = !limit.sent_today_date || limit.sent_today_date < new Date().toISOString().slice(0, 10);
  const effective = isStale ? 0 : limit.sent_today;

  if (effective >= limit.hard_ceiling) {
    return {
      allowed: false,
      domain,
      sent_today: effective,
      daily_cap: limit.daily_cap,
      hard_ceiling: limit.hard_ceiling,
      reason: 'over_ceiling',
      is_transactional: limit.is_transactional,
    };
  }

  return {
    allowed: true,
    domain,
    sent_today: effective,
    daily_cap: limit.daily_cap,
    hard_ceiling: limit.hard_ceiling,
    warn: effective >= limit.daily_cap,
    is_transactional: limit.is_transactional,
  };
}
