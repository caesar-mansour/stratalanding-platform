// Delivery Status Notification (DSN) parser.
// When an email bounces, the receiving MTA sends a "mailer-daemon" message back.
// We detect these in the IMAP poll, parse the status code + recipient, and
// record a `bounce` event on the original send so the UI can show it and
// the prospect gets auto-suppressed (for hard bounces only).

export type BounceKind = 'hard' | 'soft' | 'unknown';

export interface BounceDetail {
  is_bounce: boolean;
  kind: BounceKind;
  status_code: string | null;    // SMTP 5xx or 4xx numeric
  failed_recipient: string | null;
  diagnostic: string | null;
}

const MAILER_DAEMON_FROM = /(^|<)(mailer[-_]?daemon|postmaster|bounces?|no[-_]?reply|mail[-_]?delivery[-_]?system)@/i;
const DSN_SUBJECT = /(undeliverable|delivery status|failure notice|returned mail|mail delivery failed|bounce|could not be delivered)/i;
const STATUS_CODE_RE = /(?:status|smtp):?\s*(?:\[|\()?(\d{3}|\d\.\d\.\d)\)?/i;
const SMTP_STATUS_RE = /\b([4-5]\d\d)[-\s]*(?:[0-9a-f]{2,}|[45]\.\d\.\d)?\b/;
const FAILED_RECIP_RE = /(?:final[-_]?recipient|original[-_]?recipient|failed[-_]?recipient|x-failed-recipients?|to|recipient(?:\s+address)?):\s*(?:rfc822;\s*)?([^\s<>]+@[^\s<>]+)/i;
const DIAGNOSTIC_RE = /(?:diagnostic[-_]?code|status|remote server returned|reason):\s*(.{5,200})/i;

// Final failure categories — these trigger auto-suppression.
const HARD_BOUNCE_PATTERNS = [
  /5\.1\.1/,                         // No such user
  /5\.1\.10/,                        // Recipient address rejected
  /5\.2\.1/,                         // Mailbox disabled
  /user unknown/i,
  /no such (user|address|mailbox)/i,
  /mailbox (does ?n't|not) exist/i,
  /invalid recipient/i,
  /address rejected/i,
  /blocked by spam filter/i,
  /550[-\s]?5\.1/,
  /550[-\s]?(address|user|recipient)/i,
];

// Soft bounces — transient failures. Don't suppress, but log for retry logic.
const SOFT_BOUNCE_PATTERNS = [
  /4\d\d/,
  /temporar(y|ily)/i,
  /over quota/i,
  /mailbox full/i,
  /try again later/i,
  /deferred/i,
  /greylist/i,
  /rate[-\s]?limit/i,
  /too many/i,
];

/**
 * Given the from/subject/body of an inbound message, decide if it's a bounce
 * and classify severity. We use three signals: sender pattern, subject
 * keywords, and body content.
 */
export function parseBounce(opts: {
  from: string | null;
  subject: string | null;
  body: string | null;
}): BounceDetail {
  // SECURITY (audit F63): cap attacker-controlled inputs before running the regexes to
  // prevent ReDoS — a crafted Subject/body with long whitespace runs caused quadratic
  // backtracking that stalled the poll cron.
  const from = (opts.from ?? '').slice(0, 2000);
  const subject = (opts.subject ?? '').slice(0, 2000);
  const body = (opts.body ?? '').slice(0, 50000);

  const senderIsDaemon = MAILER_DAEMON_FROM.test(from);
  const subjectSuggestsBounce = DSN_SUBJECT.test(subject);

  if (!senderIsDaemon && !subjectSuggestsBounce) {
    return { is_bounce: false, kind: 'unknown', status_code: null, failed_recipient: null, diagnostic: null };
  }

  // Extract status code (prefer SMTP 3-digit)
  let statusCode: string | null = null;
  const smtp = body.match(SMTP_STATUS_RE) || subject.match(SMTP_STATUS_RE);
  if (smtp) statusCode = smtp[1];
  if (!statusCode) {
    const s = body.match(STATUS_CODE_RE);
    if (s) statusCode = s[1];
  }

  // Extract failed recipient
  const recip = body.match(FAILED_RECIP_RE) || subject.match(FAILED_RECIP_RE);
  const failed_recipient = recip ? recip[1].toLowerCase() : null;

  // Extract diagnostic text
  const diag = body.match(DIAGNOSTIC_RE);
  const diagnostic = diag ? diag[1].trim() : null;

  // Classify
  let kind: BounceKind = 'unknown';
  const searchText = `${subject}\n${body}`;
  if (HARD_BOUNCE_PATTERNS.some((p) => p.test(searchText))) kind = 'hard';
  else if (SOFT_BOUNCE_PATTERNS.some((p) => p.test(searchText))) kind = 'soft';
  else if (statusCode?.startsWith('5')) kind = 'hard';
  else if (statusCode?.startsWith('4')) kind = 'soft';

  return { is_bounce: true, kind, status_code: statusCode, failed_recipient, diagnostic };
}
