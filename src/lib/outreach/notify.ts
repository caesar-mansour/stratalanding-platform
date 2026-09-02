import { getSystemSetting } from './db';
import { OUTREACH_SITE_URL } from './config';

/**
 * Fire off an email notification to Caesar when a new reply lands.
 *
 * Reads preferences from `system_settings`:
 *   - notification_email      → recipient (null disables)
 *   - notify_on_reply         → master toggle
 *   - notify_on_hot_only      → if true, skip warm/cold/uncertain
 *
 * Designed as fire-and-forget: callers should NOT await this in a way that
 * blocks the IMAP poll. If it throws, we swallow + log.
 *
 * Uses a minimal inline OAuth2 Gmail-API send (same mechanism as the main
 * send-adapter, but without the full outreach-inbox abstraction since
 * notifications are transactional and always come from GMAIL_USER).
 */
export async function notifyOnNewReply(input: {
  prospectName: string;
  prospectEmail: string;
  classification: string | null;
  replyBodyPreview: string;
  originalSubject: string;
  sendId: string;
}): Promise<void> {
  try {
    const [enabled, hotOnly, recipient] = await Promise.all([
      getSystemSetting<boolean>('notify_on_reply'),
      getSystemSetting<boolean>('notify_on_hot_only'),
      getSystemSetting<string | null>('notification_email'),
    ]);

    if (enabled !== true) return;
    if (!recipient || typeof recipient !== 'string' || !recipient.includes('@')) return;

    const classification = (input.classification ?? 'uncertain').toLowerCase();
    if (hotOnly === true && classification !== 'hot') return;

    const isHot = classification === 'hot';
    const icon = isHot ? '🔥' : classification === 'warm' ? '💬' : '✉';
    const subject = `${icon} Reply from ${input.prospectName}`;
    const html = buildNotificationHtml({
      prospectName: input.prospectName,
      prospectEmail: input.prospectEmail,
      classification,
      replyBodyPreview: input.replyBodyPreview,
      originalSubject: input.originalSubject,
    });

    const ok = await sendTransactional({ to: recipient, subject, html });
    if (!ok) console.error('[notify] send failed for', recipient);
  } catch (err) {
    console.error('[notify] unexpected error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Inline OAuth2 Gmail send (self-contained, mirrors send-adapter internals)
// ─────────────────────────────────────────────────────────────────────────

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!process.env.GMAIL_REFRESH_TOKEN) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;

  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) { cachedToken = null; return null; }
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

async function sendTransactional(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const fromEmail = process.env.GMAIL_USER || 'stratalanding@gmail.com';
  const fromDomain = fromEmail.split('@')[1];
  const messageId = `<${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}@${fromDomain}>`;
  const date = new Date().toUTCString();
  const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const sanitized = (v: string) => v.replace(/[\r\n]/g, '');
  const encodedSubject = /[^\x00-\x7F]/.test(opts.subject)
    ? `=?UTF-8?B?${Buffer.from(opts.subject, 'utf-8').toString('base64')}?=`
    : opts.subject;

  const plainText = opts.html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();

  const raw = [
    `From: "Outreach Notifier" <${fromEmail}>`,
    `To: ${sanitized(opts.to)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `Subject: ${sanitized(encodedSubject)}`,
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
    Buffer.from(opts.html).toString('base64'),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const rawB64 = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawB64 }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[notify] Gmail API error', res.status, text.slice(0, 200));
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML template
// ─────────────────────────────────────────────────────────────────────────

function buildNotificationHtml(input: {
  prospectName: string;
  prospectEmail: string;
  classification: string;
  replyBodyPreview: string;
  originalSubject: string;
}): string {
  const cls = input.classification;
  const badge =
    cls === 'hot'    ? ['#10B981', '#10B98122', '#10B98144', 'Hot'] :
    cls === 'warm'   ? ['#06B6D4', '#06B6D422', '#06B6D444', 'Warm'] :
    cls === 'cold'   ? ['#A1A1AA', '#71717A22', '#71717A44', 'Cold'] :
    cls === 'remove' ? ['#EF4444', '#EF444422', '#EF444444', 'Remove'] :
    cls === 'ooo'    ? ['#F59E0B', '#F59E0B22', '#F59E0B44', 'Out of Office'] :
    cls === 'bounce' ? ['#F43F5E', '#F43F5E22', '#F43F5E44', 'Bounce'] :
                       ['#8B5CF6', '#8B5CF622', '#8B5CF644', 'Uncertain'];
  const [color, bg, border, label] = badge;
  const badgeHtml = `<span style="display:inline-block;background:${bg};color:${color};border:1px solid ${border};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;">${label}</span>`;

  // SECURITY (audit F74): fully HTML-escape the inbound reply preview (it's attacker-
  // controlled email content rendered into the founder's notification inbox).
  const preview = escapeHtml(input.replyBodyPreview.slice(0, 500));
  // AUDIT 2026-08-12 (P3): was /outreach/room, which 404s — the real route is /times/outreach/room.
  const link = `${OUTREACH_SITE_URL}/times/outreach/room`;
  const truncated = input.replyBodyPreview.length > 500;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#09090B;color:#E4E4E7;">
  <div style="background:#18181B;border:1px solid #27272A;border-radius:12px;padding:24px;">
    <div style="margin-bottom:16px;">
      ${badgeHtml}
      <span style="margin-left:8px;font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.05em;font-weight:500;">Reply received</span>
    </div>
    <h2 style="margin:0 0 4px;color:#FAFAFA;font-size:20px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(input.prospectName)}</h2>
    <p style="margin:0 0 16px;color:#A1A1AA;font-size:13px;font-family:'JetBrains Mono',monospace;">${escapeHtml(input.prospectEmail)}</p>
    <p style="margin:0 0 8px;color:#71717A;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:500;">Re: ${escapeHtml(input.originalSubject)}</p>
    <div style="background:#09090B;border:1px solid #27272A;border-radius:8px;padding:16px;margin-bottom:20px;color:#D4D4D8;font-size:14px;line-height:1.5;white-space:pre-wrap;">${preview}${truncated ? '...' : ''}</div>
    <a href="${link}" style="display:inline-block;background:#10B981;color:#09090B;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
      Open in platform →
    </a>
    <p style="margin:24px 0 0;color:#52525B;font-size:11px;line-height:1.4;">
      Automated notification from your outreach tool. Reply directly from the platform — no need to open Gmail.
    </p>
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
