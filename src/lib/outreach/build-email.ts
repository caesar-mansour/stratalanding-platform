// Compose an outreach email ready for send: injects tracking pixel, rewrites links
// through the click-tracking redirect, and computes the headers our worker + reply
// matcher need (Message-ID, List-Unsubscribe + one-click POST, Reply-To with plus-address token).
//
// Pure function — does not talk to a transport. The caller (send-adapter) takes the
// BuiltEmail, assembles MIME or hands off to Gmail API, and records message_id on success.

import crypto from 'crypto';
import {
  OUTREACH_SITE_URL,
  trackOpenUrl,
  trackClickUrl,
  unsubscribeUrl,
} from './config';

export interface BuildEmailInput {
  toEmail: string;
  toName?: string | null;
  fromEmail: string;
  fromDisplay: string;
  subject: string;
  bodyText: string;              // plain text body to send
  bodyHtml?: string | null;      // optional; if omitted we auto-derive from bodyText
  trackingToken: string;         // UUID — pixel + click URLs include this
  replyToToken: string;          // UUID — Reply-To uses plus-addressing <local+token@domain>
  followUpNumber?: number;       // 0 for initial send
  inReplyToMessageId?: string | null; // for threaded follow-ups
  referencesMessageIds?: string[];    // earlier message ids in the thread
}

export interface BuiltEmail {
  to: string;                    // display-formatted recipient
  from: string;                  // display-formatted sender
  replyTo: string;               // plus-addressed for reply matching
  subject: string;
  bodyText: string;
  bodyHtml: string;
  messageId: string;             // with angle brackets, ready for Message-ID header
  headers: Record<string, string>;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Basic text-to-HTML (preserve paragraphs + auto-link obvious URLs).
// Escape FIRST, then inject <br> tags. Reversing this order causes the
// injected <br> tags to be HTML-escaped to &lt;br&gt; and render as literal
// text in the recipient's inbox.
function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => htmlEscape(p).replace(/\n/g, '<br>'));
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
  return paragraphs
    .map((p) => `<p>${p.replace(urlPattern, (u) => `<a href="${u}">${u}</a>`)}</p>`)
    .join('\n');
}

// Rewrite every <a href="..."> in html to route through /track/click/[token].
// Skip mailto:, tel:, anchors, and already-routed links.
function rewriteLinksForTracking(html: string, trackingToken: string): string {
  return html.replace(/<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*)>/gi, (match, pre, quote, href, post) => {
    if (!href) return match;
    const lower = href.toLowerCase();
    if (
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('#') ||
      lower.startsWith('javascript:') ||
      lower.includes('/track/click/') ||
      lower.includes('/track/open/') ||
      lower.includes('/unsubscribe')
    ) {
      return match;
    }
    const tracked = trackClickUrl(trackingToken, href);
    return `<a ${pre}href=${quote}${tracked}${quote}${post}>`;
  });
}

function injectTrackingPixel(html: string, trackingToken: string): string {
  const pixelUrl = trackOpenUrl(trackingToken);
  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;border:0;outline:0;width:1px;height:1px;" />`;
  // Insert at end of body if present, else append.
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${pixel}</body>`);
  return html + pixel;
}

function appendUnsubscribeFooterHtml(html: string, email: string): string {
  const url = unsubscribeUrl(email);
  const footer = `<p style="font-size:11px;color:#94A3B8;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:12px;">
    Don't want these? <a href="${url}" style="color:#0891B2;">Unsubscribe</a>.
  </p>`;
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${footer}</body>`);
  return html + footer;
}

function formatAddress(email: string, display?: string | null): string {
  if (!display) return email;
  const safe = display.replace(/[<>"']/g, '');
  return `"${safe}" <${email}>`;
}

function generateMessageId(fromDomain: string): string {
  const rand = crypto.randomBytes(12).toString('hex');
  const ts = Date.now().toString(36);
  return `<${rand}.${ts}@${fromDomain}>`;
}

function plusAddress(email: string, token: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local}+${token}@${domain}`;
}

export function buildEmail(input: BuildEmailInput): BuiltEmail {
  const fromDomain = input.fromEmail.split('@')[1] || 'stratalanding.com';
  const messageId = generateMessageId(fromDomain);
  const replyToAddress = plusAddress(input.fromEmail, input.replyToToken);

  const rawHtml = input.bodyHtml ?? textToHtml(input.bodyText);
  const htmlWithFooter = appendUnsubscribeFooterHtml(rawHtml, input.toEmail);
  const htmlWithLinks = rewriteLinksForTracking(htmlWithFooter, input.trackingToken);
  const finalHtml = injectTrackingPixel(htmlWithLinks, input.trackingToken);

  // Append plain-text unsubscribe link so users viewing as plain text still have it.
  const finalText = `${input.bodyText}\n\n---\nDon't want these? Unsubscribe: ${unsubscribeUrl(input.toEmail)}`;

  const headers: Record<string, string> = {
    'Message-ID': messageId,
    'List-Unsubscribe': `<mailto:${input.fromEmail}?subject=unsubscribe>, <${unsubscribeUrl(input.toEmail)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'StrataLanding Outreach 1.0',
    'X-Entity-Ref-ID': crypto.randomBytes(8).toString('hex'),
  };

  if (input.inReplyToMessageId) {
    headers['In-Reply-To'] = input.inReplyToMessageId;
    const chain = [...(input.referencesMessageIds ?? []), input.inReplyToMessageId];
    headers['References'] = chain.join(' ');
  }

  return {
    to: formatAddress(input.toEmail, input.toName),
    from: formatAddress(input.fromEmail, input.fromDisplay),
    replyTo: replyToAddress,
    subject: input.subject,
    bodyText: finalText,
    bodyHtml: finalHtml,
    messageId,
    headers,
  };
}

// Allow our test helper / verification to assert a real pixel is present.
export function extractTrackingToken(html: string): string | null {
  const match = html.match(/\/track\/open\/([a-f0-9\-]{36})\.png/i);
  return match ? match[1] : null;
}

export { OUTREACH_SITE_URL };
