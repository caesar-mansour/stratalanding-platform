// IMAP poller for one inbox.
// Pulls new messages since the last-seen UID, hands each one to a caller-
// supplied onMessage callback, and persists the high-water UID to
// outreach_inboxes.notes (as JSON) so we don't re-fetch the same messages.
//
// Uses imapflow (already installed). Works with Gmail IMAP for both OAuth2
// (Gmail API alternative, but we stick to app-password IMAP for simplicity)
// and app-password inboxes — since Gmail supports IMAP for both.
//
// For OAuth2 inboxes, we use XOAUTH2 SASL with the same refresh token as
// the send-adapter — imapflow accepts this.

import { ImapFlow } from 'imapflow';
import type { OutreachInbox } from './types';

export interface InboundMessage {
  uid: number;
  headers: {
    messageId: string | null;
    inReplyTo: string | null;
    references: string | null;
    from: string | null;
    to: string | null;
    subject: string | null;
    date: Date | null;
    returnPath: string | null;
  };
  bodyText: string;
  bodyHtml: string | null;
}

export interface PollResult {
  ok: boolean;
  fetched: number;
  lastUidProcessed: number;
  error?: string;
}

async function oauth2AccessToken(): Promise<string | null> {
  if (!process.env.GMAIL_REFRESH_TOKEN) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

function parseLastUid(notes: string | null): number {
  if (!notes) return 0;
  try {
    const parsed = JSON.parse(notes);
    const n = Number(parsed?.imap?.last_uid ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function mergeLastUid(notes: string | null, lastUid: number): string {
  let existing: Record<string, unknown> = {};
  if (notes) {
    try { existing = JSON.parse(notes); } catch { /* keep empty */ }
  }
  const imap = (existing.imap as Record<string, unknown>) ?? {};
  return JSON.stringify({ ...existing, imap: { ...imap, last_uid: lastUid, last_poll_at: new Date().toISOString() } });
}

export async function pollInbox(inbox: OutreachInbox, onMessage: (msg: InboundMessage) => Promise<void>): Promise<PollResult> {
  const lastUid = parseLastUid(inbox.notes);
  const result: PollResult = { ok: false, fetched: 0, lastUidProcessed: lastUid };

  // Build auth config per inbox type.
  let client: ImapFlow;
  if (inbox.type === 'oauth2') {
    const accessToken = await oauth2AccessToken();
    if (!accessToken) { return { ...result, error: 'oauth2 access token unavailable' }; }
    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: inbox.email, accessToken },
      logger: false,
    });
  } else {
    const appPassword = process.env.GMAIL2_APP_PASSWORD;
    if (!appPassword) { return { ...result, error: 'GMAIL2_APP_PASSWORD missing' }; }
    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: inbox.email, pass: appPassword },
      logger: false,
    });
  }

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailboxUidNext: number = (client.mailbox as { uidNext?: number })?.uidNext ?? 0;
      if (!mailboxUidNext) { return { ...result, ok: true }; }

      // First run: start from "now" to avoid pulling years of backlog.
      // Caller can reset by clearing inbox.notes.imap.last_uid.
      const fromUid = lastUid > 0 ? lastUid + 1 : Math.max(1, mailboxUidNext - 50);
      const range = `${fromUid}:*`;

      let highest = lastUid;
      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        source: true,
        bodyStructure: true,
        bodyParts: ['HEADER', 'TEXT'],
      })) {
        if (typeof msg.uid === 'number' && msg.uid > highest) highest = msg.uid;
        if (typeof msg.uid !== 'number' || msg.uid <= lastUid) continue;

        const env = msg.envelope;
        const raw = msg.source?.toString('utf8') ?? '';
        const { bodyText, bodyHtml } = extractBodies(raw);
        const returnPath = extractHeader(raw, 'return-path');

        const inbound: InboundMessage = {
          uid: msg.uid,
          headers: {
            messageId: env?.messageId ?? null,
            inReplyTo: env?.inReplyTo ?? null,
            references: extractHeader(raw, 'references'),
            from: env?.from?.[0]?.address ?? null,
            to: env?.to?.[0]?.address ?? null,
            subject: env?.subject ?? null,
            date: env?.date ?? null,
            returnPath,
          },
          bodyText,
          bodyHtml,
        };

        try {
          await onMessage(inbound);
          result.fetched++;
        } catch (err) {
          console.error(`[imap-poller] onMessage failed for uid ${msg.uid}:`, err);
        }
      }

      result.lastUidProcessed = highest;
    } finally {
      lock.release();
    }
    result.ok = true;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'imap fetch failed';
    return result;
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

/**
 * Persist the new high-water UID to the inbox row. Call after pollInbox
 * returns ok=true AND the caller has safely persisted all fetched messages.
 */
export function buildUpdatedNotes(inbox: OutreachInbox, newLastUid: number): string {
  return mergeLastUid(inbox.notes, newLastUid);
}

// --- Internal MIME helpers ------------------------------------------------

function extractHeader(raw: string, name: string): string | null {
  const lines = raw.split(/\r?\n/);
  const lower = name.toLowerCase();
  const collected: string[] = [];
  let active = false;
  for (const line of lines) {
    if (line === '') break;
    if (/^[^\s]/.test(line)) {
      active = line.toLowerCase().startsWith(`${lower}:`);
      if (active) collected.push(line.slice(line.indexOf(':') + 1).trim());
    } else if (active) {
      collected.push(line.trim());
    }
  }
  return collected.length ? collected.join(' ').trim() : null;
}

function extractBodies(raw: string): { bodyText: string; bodyHtml: string | null } {
  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd < 0) return { bodyText: raw, bodyHtml: null };
  const body = raw.slice(headerEnd).trimStart();
  const htmlMatch = body.match(/<html[\s\S]*?<\/html>/i);
  const bodyHtml = htmlMatch ? decodeBodyText(htmlMatch[0]) : null;
  const withoutHtml = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return { bodyText: decodeBodyText(withoutHtml), bodyHtml };
}

/**
 * Decode Quoted-Printable + base64 email bodies so they render as human-readable text.
 *
 * Gmail/Apple Mail default to QP for messages with non-ASCII characters
 * (smart quotes, em-dashes, emoji). The raw body will contain sequences like
 * `=E2=80=99` (right single quote), `=20` (space), and `=\n` (soft line break).
 *
 * We also handle base64-encoded bodies (Content-Transfer-Encoding: base64) —
 * rarer in practice but shows up for some automated responders.
 *
 * Safe to run on already-clean ASCII text: the regexes require well-formed
 * patterns (`=` followed by exactly 2 hex chars OR `=` at end of line), so
 * stray `=` in regular text won't be misinterpreted.
 */
export function decodeBodyText(input: string): string {
  if (!input) return input;

  // Step 1: if the whole body looks like base64 (long unbroken run of base64 chars + padding),
  // try decoding. Covers simple single-part base64 bodies.
  const trimmed = input.trim();
  if (trimmed.length > 40 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.includes('=')) {
    try {
      const decoded = Buffer.from(trimmed.replace(/\s/g, ''), 'base64').toString('utf8');
      // Only use the decoded version if it contains mostly printable chars
      const printable = decoded.split('').filter((c) => {
        const code = c.charCodeAt(0);
        return code >= 32 || code === 9 || code === 10 || code === 13;
      }).length;
      if (printable / decoded.length > 0.85) return decoded;
    } catch { /* fall through */ }
  }

  // Step 2: Quoted-Printable. Remove soft line breaks, then decode =XX byte sequences.
  const withoutSoftBreaks = input.replace(/=\r?\n/g, '');

  // Walk through and build a byte array, since QP encodes individual UTF-8 BYTES
  // (not codepoints). We collect bytes and decode as UTF-8 at the end.
  const bytes: number[] = [];
  let i = 0;
  while (i < withoutSoftBreaks.length) {
    const ch = withoutSoftBreaks[i];
    if (ch === '=' && i + 2 < withoutSoftBreaks.length) {
      const hex = withoutSoftBreaks.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    // Multi-byte char from JS string: encode this codepoint as UTF-8 bytes
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else {
      // Non-ASCII char in the source (rare for QP but possible) — push its UTF-8 bytes
      for (const b of Buffer.from(ch, 'utf8')) bytes.push(b);
    }
    i++;
  }
  return Buffer.from(bytes).toString('utf8');
}
