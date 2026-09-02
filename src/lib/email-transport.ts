const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// Cache access token to avoid rate-limiting from Google's token endpoint
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000), // audit 2026-08-12 (P2): bound the token refresh too
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    cachedToken = null;
    throw new Error(`Failed to refresh access token: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

function encodeSubject(subject: string): string {
  // RFC 2047: encode non-ASCII subjects as =?UTF-8?B?<base64>?=
  const hasNonAscii = /[^\x00-\x7F]/.test(subject);
  if (!hasNonAscii) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

// Strip CRLF sequences to prevent email header injection
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildRawEmail(from: string, to: string, subject: string, html: string, replyTo?: string): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const plainText = htmlToPlainText(html);
  const fromAddress = from.match(/<(.+)>/)?.[1] || from;
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${fromAddress.split('@')[1]}>`;
  const date = new Date().toUTCString();

  const lines = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(to)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `Subject: ${encodeSubject(sanitizeHeader(subject))}`,
    // AUDIT 2026-08-12 (P2): without Reply-To, admin notifications arrive From and To the SAME
    // address, so hitting "Reply" on a new-lead email answers yourself instead of the prospect.
    ...(replyTo ? [`Reply-To: ${sanitizeHeader(replyTo)}`] : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plainText).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
    '',
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Record a send failure durably so an email outage is OBSERVABLE.
 *
 * AUDIT 2026-08-12 (P1 E-01): failures previously left nothing but a console.error in a serverless
 * log. An expired GMAIL_REFRESH_TOKEN or a revoked OAuth grant would silently stop every proposal,
 * payment confirmation and magic link while the app kept returning 200s.
 *
 * Best-effort by construction: logging a failure must never itself throw into a request path, and
 * must never make a already-failing send look worse than it is.
 */
async function recordFailure(
  to: string,
  subject: string,
  error: string,
  context?: string,
  critical?: boolean,
): Promise<void> {
  try {
    const { default: sql } = await import('@/lib/db');
    await sql`
      INSERT INTO email_failures (recipient, subject, error, context, critical)
      VALUES (${to}, ${subject}, ${error}, ${context ?? null}, ${critical ?? false})
    `;
  } catch (err) {
    // Table missing (migration 056 not applied) or DB down — the console line is the last resort.
    console.error('[EMAIL] failed to record send failure durably:', err);
  }
}

// AUDIT 2026-08-12 (P2): the Gmail API calls had no timeout — a hanging upstream held the lambda
// until the platform killed it, so a slow Gmail turned into an opaque function failure instead of
// a recorded send failure.
const EMAIL_TIMEOUT_MS = 15_000;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  /** Which flow is sending, for the failure log (e.g. 'proposal', 'magic-link'). */
  context?: string;
  /** True when a customer is actively blocked by this email not arriving. */
  critical?: boolean;
  /** Where replies should go — e.g. the prospect's address on a lead notification. */
  replyTo?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.error('[EMAIL] GMAIL_REFRESH_TOKEN not configured — email NOT sent');
    await recordFailure(options.to, options.subject, 'GMAIL_REFRESH_TOKEN not configured', options.context, options.critical);
    return { success: false, error: 'Email not configured' };
  }

  const fromEmail = `StrataLanding <${process.env.GMAIL_USER || 'stratalanding@gmail.com'}>`;

  try {

    const accessToken = await getAccessToken();
    const raw = buildRawEmail(fromEmail, options.to, options.subject, options.html, options.replyTo);

    const res = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    console.log(`Email sent successfully - messageId: ${data.id}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] send error:', message);
    await recordFailure(options.to, options.subject, message, options.context, options.critical);
    return { success: false, error: message };
  }
}

/**
 * Send an email whose non-delivery breaks the customer's journey, and THROW if it fails.
 *
 * AUDIT 2026-08-12 (P1 E-01/E-03): several routes reported success to the user after the send had
 * already failed — the preview OTP and magic-link flows told the prospect "check your email" for a
 * mail that was never sent, leaving them stuck with no recovery path. Use this wherever the user
 * is told to go look in their inbox, so the caller is forced to decide what the user sees.
 */
export async function sendEmailCritical(options: {
  to: string;
  subject: string;
  html: string;
  context: string;
}): Promise<void> {
  const result = await sendEmail({ ...options, critical: true });
  if (!result.success) {
    throw new Error(`Critical email failed (${options.context}): ${result.error ?? 'unknown error'}`);
  }
}
