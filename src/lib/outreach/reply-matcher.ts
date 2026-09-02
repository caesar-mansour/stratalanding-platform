// Four-strategy reply matcher with confidence scoring.
// Given an inbound email (headers + from + subject), we try to link it to an
// outreach_sends row. Strategies are tried in descending confidence order;
// the first hit wins.
//
// 1. EXACT        — inbound `In-Reply-To` matches our stored Message-ID
// 2. HEADER_CHAIN — inbound `References` header contains our Message-ID
// 3. REPLY_TO_TOKEN — inbound `To` includes plus-addressed token (caesar+<uuid>@domain)
// 4. FUZZY        — from == prospect.email, sent within 30 days, subject starts with "Re: <original>" (Levenshtein <= 5)
//
// Fuzzy matches are flagged but NOT auto-classified or auto-suppressed —
// they surface in the UI with a "Confirm match?" action.

import sql from '@/lib/db';
import type { ReplyMatchConfidence } from './types';

export interface InboundHeaders {
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;     // space-separated message-ids
  from: string | null;
  to: string | null;
  subject: string | null;
  date: Date | null;
}

export interface ReplyMatch {
  send_id: string;
  prospect_id: string;
  confidence: ReplyMatchConfidence;
  inbox_id: string;
  original_subject: string;
}

// Normalize a Message-ID for comparison (strip angle brackets + whitespace + case-fold).
function normalizeMsgId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/<([^>]+)>/);
  const cleaned = (m ? m[1] : raw).trim().toLowerCase();
  return cleaned || null;
}

// Levenshtein distance (capped) — small helper for fuzzy subject matching.
function levenshtein(a: string, b: string, cap = 6): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    let minRow = curr;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(
        prev[j] + 1,
        curr + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev[j - 1] = curr;
      curr = next;
      if (curr < minRow) minRow = curr;
    }
    prev[b.length] = curr;
    if (minRow > cap) return cap + 1;
  }
  return prev[b.length];
}

// Extract an email address from a raw header value like `"Dr X" <dr@x.com>`.
function extractEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const angle = raw.match(/<([^>]+)>/);
  const bare = (angle ? angle[1] : raw).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare) ? bare : null;
}

// Normalize a subject for fuzzy matching: strip "Re:", "Fwd:", and auto-reply
// prefixes ("Out of Office Notice Re:", "Automatic reply:", "Vacation:", etc.),
// then lowercase + trim. Repeated stripping handles "Re: Out of Office Re: ...".
function normalizeSubject(s: string | null | undefined): string {
  if (!s) return '';
  let out = s.trim();
  // Strip in a loop because OOO bots often produce nested prefixes like
  // "Auto-Reply: Re: Out of Office: <our subject>".
  for (let i = 0; i < 6; i++) {
    const before = out;
    out = out
      // Standard threading prefixes.
      .replace(/^\s*(re|fwd|fw|aw|r|wg|sv|tr)\s*:\s*/i, '')
      // Auto-reply / out-of-office variants we see from Gmail, Outlook, Apple Mail.
      .replace(/^\s*(out of office( notice)?|auto[- ]?reply|automatic reply|automated response|vacation( reply)?|away from (the )?office|i'?m (away|out)|absence)\s*[:\-]?\s*/i, '');
    if (out === before) break;
  }
  return out.trim().toLowerCase();
}

// Strategy 1 + 2: header chain.
async function matchByHeaderChain(headers: InboundHeaders): Promise<ReplyMatch | null> {
  const inReplyTo = normalizeMsgId(headers.inReplyTo);
  const references = (headers.references ?? '')
    .split(/\s+/)
    .map(normalizeMsgId)
    .filter((x): x is string => Boolean(x));
  const allIds = [inReplyTo, ...references].filter((x): x is string => Boolean(x));
  if (allIds.length === 0) return null;

  // Our stored message_id has angle brackets; we need to compare the bracket-free core.
  // Build both-forms to match either variant.
  const withBrackets = allIds.map((id) => `<${id}>`);
  const candidates = [...allIds, ...withBrackets];

  const rows = await sql<Array<{ id: string; prospect_id: string; inbox_id: string; subject: string; message_id: string }>>`
    SELECT id, prospect_id, inbox_id, subject, message_id
    FROM outreach_sends
    WHERE LOWER(message_id) = ANY(${candidates.map((c) => c.toLowerCase())})
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  const matchedBracketless = normalizeMsgId(row.message_id);
  const confidence: ReplyMatchConfidence = inReplyTo === matchedBracketless ? 'exact' : 'header_chain';
  return {
    send_id: row.id,
    prospect_id: row.prospect_id,
    inbox_id: row.inbox_id,
    original_subject: row.subject,
    confidence,
  };
}

// Strategy 3: plus-addressed reply-to token.
async function matchByReplyToToken(headers: InboundHeaders): Promise<ReplyMatch | null> {
  if (!headers.to) return null;
  // Look for `local+<uuid>@domain` in the inbound To
  const match = headers.to.match(/\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i);
  if (!match) return null;
  const token = match[1];
  const rows = await sql<Array<{ id: string; prospect_id: string; inbox_id: string; subject: string }>>`
    SELECT id, prospect_id, inbox_id, subject
    FROM outreach_sends
    WHERE reply_to_token = ${token}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    send_id: rows[0].id,
    prospect_id: rows[0].prospect_id,
    inbox_id: rows[0].inbox_id,
    original_subject: rows[0].subject,
    confidence: 'reply_to_token',
  };
}

// Strategy 4: fuzzy by prospect email + recent send + subject similarity.
async function matchByFuzzy(headers: InboundHeaders): Promise<ReplyMatch | null> {
  const fromEmail = extractEmail(headers.from);
  if (!fromEmail) return null;

  const rows = await sql<Array<{ id: string; prospect_id: string; inbox_id: string; subject: string }>>`
    SELECT s.id, s.prospect_id, s.inbox_id, s.subject
    FROM outreach_sends s
    JOIN outreach_prospects p ON p.id = s.prospect_id
    WHERE LOWER(p.email) = ${fromEmail}
      AND s.sent_at >= now() - INTERVAL '30 days'
    ORDER BY s.sent_at DESC
    LIMIT 5
  `;
  if (rows.length === 0) return null;

  const incoming = normalizeSubject(headers.subject);
  if (!incoming) return null;

  for (const r of rows) {
    const original = normalizeSubject(r.subject);
    if (!original) continue;
    // 4a — close edit distance (handles tiny tracking suffixes the warmup tools add).
    const dist = levenshtein(incoming, original, 5);
    if (dist <= 5) {
      return {
        send_id: r.id,
        prospect_id: r.prospect_id,
        inbox_id: r.inbox_id,
        original_subject: r.subject,
        confidence: 'fuzzy',
      };
    }
    // 4b — substring fallback. OOO bots often produce "Out of Office Notice
    // Re: <original>" and after prefix-stripping the original is still wrapped
    // by extra words. If the original subject appears anywhere in the incoming
    // (and is meaningful, i.e. >= 4 chars), accept it as fuzzy.
    if (original.length >= 4 && incoming.includes(original)) {
      return {
        send_id: r.id,
        prospect_id: r.prospect_id,
        inbox_id: r.inbox_id,
        original_subject: r.subject,
        confidence: 'fuzzy',
      };
    }
  }
  return null;
}

/**
 * Match an inbound reply to an outreach_sends row.
 * Returns null if no strategy finds a match.
 */
export async function matchReply(headers: InboundHeaders): Promise<ReplyMatch | null> {
  // Try strategies in descending confidence order.
  const s1 = await matchByHeaderChain(headers);
  if (s1) return s1;
  const s2 = await matchByReplyToToken(headers);
  if (s2) return s2;
  const s3 = await matchByFuzzy(headers);
  if (s3) return s3;
  return null;
}
