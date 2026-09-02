// Send adapters: OAuth2 (Gmail API) and SMTP (nodemailer app password).
// The send worker picks an adapter based on inbox.type and calls sendOutreachEmail().
// On success, returns { ok: true, messageId }. On failure, { ok: false, error, retryable }.

import type { BuiltEmail } from './build-email';
import type { OutreachInbox } from './types';
import { decryptSecret } from '@/lib/auth/tokens';

// Decrypt an at-rest app password (audit F39). New rows are AES-256-GCM encrypted
// (iv:authTag:ciphertext hex); legacy plaintext rows are returned as-is for compatibility.
function decryptInboxPassword(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  if (/^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/i.test(v)) {
    try { return decryptSecret(v); } catch { return undefined; }
  }
  return v;
}

// Lazy-load Gmail OAuth helpers by calling /src/lib/email-transport indirectly,
// but we need to override from/headers which the existing sendEmail doesn't allow.
// Instead we replicate the token-caching logic here and build our own raw MIME.

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let cachedOauthToken: { token: string; expiresAt: number } | null = null;

async function getOauthAccessToken(): Promise<string> {
  if (cachedOauthToken && Date.now() < cachedOauthToken.expiresAt - 60_000) {
    return cachedOauthToken.token;
  }
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
  if (!res.ok) {
    cachedOauthToken = null;
    throw new Error(`OAuth refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedOauthToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedOauthToken.token;
}

function sanitizeHeaderValue(v: string): string {
  return v.replace(/[\r\n]/g, '');
}

function encodeSubject(subject: string): string {
  if (!/[^\x00-\x7F]/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

function buildRawMime(built: BuiltEmail, replyTo?: string): string {
  const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const date = new Date().toUTCString();
  const headerLines: string[] = [
    `From: ${sanitizeHeaderValue(built.from)}`,
    `To: ${sanitizeHeaderValue(built.to)}`,
    `Date: ${date}`,
    `Message-ID: ${built.messageId}`,
    `Subject: ${encodeSubject(sanitizeHeaderValue(built.subject))}`,
    `Reply-To: ${sanitizeHeaderValue(replyTo ?? built.replyTo)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  for (const [k, v] of Object.entries(built.headers)) {
    if (k.toLowerCase() === 'message-id') continue; // already set
    headerLines.push(`${k}: ${sanitizeHeaderValue(v)}`);
  }

  const parts = [
    headerLines.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(built.bodyText).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(built.bodyHtml).toString('base64'),
    '',
    `--${boundary}--`,
    '',
  ];

  const raw = parts.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

// ---- OAuth2 adapter (for dev@stratalanding.com) ----

async function sendOauth2(built: BuiltEmail): Promise<SendResult> {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    return { ok: false, error: 'GMAIL_REFRESH_TOKEN missing', retryable: false };
  }
  try {
    const token = await getOauthAccessToken();
    const raw = buildRawMime(built);
    const res = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const text = await res.text();
      const retryable = res.status >= 500 || res.status === 429;
      return { ok: false, error: `Gmail API ${res.status}: ${text}`, retryable };
    }
    await res.json(); // { id, threadId, labelIds }
    return { ok: true, messageId: built.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'oauth2 send failed', retryable: true };
  }
}

// ---- SMTP adapter (for stratalanding@gmail.com + app password) ----
//
// We lazy-require nodemailer to avoid pulling it into routes that don't need it.
let _nodemailer: typeof import('nodemailer') | null = null;
async function getNodemailer() {
  if (_nodemailer) return _nodemailer;
  _nodemailer = (await import('nodemailer')).default;
  return _nodemailer;
}

async function sendAppPassword(built: BuiltEmail, inbox: OutreachInbox): Promise<SendResult> {
  // Resolution order:
  //   1. inbox.app_password_encrypted — set when the user added this desk via the UI
  //   2. process.env.${inbox.credential_key}_APP_PASSWORD — explicit env-var key
  //   3. process.env.GMAIL2_APP_PASSWORD — legacy default for the seeded gmail.com inbox
  const inboxAny = inbox as OutreachInbox & { app_password_encrypted?: string | null; credential_key?: string | null };
  const fromDb = inboxAny.app_password_encrypted;
  const fromKey = inboxAny.credential_key ? process.env[`${inboxAny.credential_key}_APP_PASSWORD`] : undefined;
  const appPassword = decryptInboxPassword(fromDb) || fromKey || process.env.GMAIL2_APP_PASSWORD;
  if (!appPassword) {
    return { ok: false, error: `No app password found for ${inbox.email}`, retryable: false };
  }
  try {
    const nodemailer = await getNodemailer();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: inbox.email, pass: appPassword },
    });
    const info = await transporter.sendMail({
      from: built.from,
      to: built.to,
      replyTo: built.replyTo,
      subject: built.subject,
      text: built.bodyText,
      html: built.bodyHtml,
      headers: built.headers,
    });
    return { ok: true, messageId: built.messageId || info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'app-password send failed';
    // Treat 4xx SMTP responses + auth errors as non-retryable
    const retryable = !/authentication|invalid|550|551|553|554/i.test(msg);
    return { ok: false, error: msg, retryable };
  }
}

export async function sendOutreachEmail(built: BuiltEmail, inbox: OutreachInbox): Promise<SendResult> {
  if (inbox.type === 'oauth2') return sendOauth2(built);
  if (inbox.type === 'app_password') return sendAppPassword(built, inbox);
  return { ok: false, error: `Unknown inbox type: ${inbox.type}`, retryable: false };
}
