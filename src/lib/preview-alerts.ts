/**
 * Hot-lead alerts for phone-outreach preview links.
 *
 * Emails the founder the moment a prospect crosses a funnel milestone — first open,
 * first visit to their spec site, tapping "I love it", or saying yes to the proposal —
 * so he can strike while the lead is hot instead of discovering it later in the
 * dashboard. Callers fire these inside `after()` (or fire-and-forget with .catch), so
 * they never add latency to the beacon/API response the prospect is waiting on.
 */

import { sendEmail } from '@/lib/email-transport';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';
import { escapeHtml } from '@/lib/html-utils';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'stratalanding@gmail.com';
const dashboardUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/preview-links`;

function alertHtml(practiceName: string, lines: string[]) {
  const name = escapeHtml(practiceName);
  const items = lines.map((l) => `<li style="margin: 0 0 4px;">${escapeHtml(l)}</li>`).join('');
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0B1B3A;">
      <p style="font-size: 15px; margin: 0 0 10px;"><b>${name}</b> — just now:</p>
      <ul style="font-size: 14px; line-height: 1.6; margin: 0 0 16px; padding-left: 18px;">${items}</ul>
      <p style="font-size: 13px; margin: 0;">
        <a href="${escapeHtml(dashboardUrl())}" style="color: #0891B2;">Open Phone Leads →</a>
      </p>
    </div>
  `;
}

/**
 * Engagement milestones from the public track beacon (first open / first site visit /
 * like / booking-demo test). Capped per link so a hyperactive prospect can't flood the
 * inbox: the open/site/like transitions latch once server-side anyway, so the durable
 * cap mainly bounds repeat booking-demo submits and any concurrent-beacon race.
 */
export async function sendEngagementAlert(vid: string, practiceName: string, moments: string[]): Promise<void> {
  try {
    if (moments.length === 0) return;
    if (!(await rateLimitDurable(`hot-alert:${vid}`, { max: 4, windowSeconds: 86_400 })).allowed) return;
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `🔥 ${practiceName} ${moments[0]}`,
      html: alertHtml(practiceName, moments),
    });
  } catch (e) {
    console.error('hot-lead alert failed', e);
  }
}

/**
 * The prospect submitted their email for the proposal — the yes is now recorded even
 * if they never complete the 6-digit code. One send per link (the caller's
 * `yes_at IS NULL` latch), so no cap needed here.
 */
export async function sendYesAlert(practiceName: string, email: string): Promise<void> {
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `❤ ${practiceName} SAID YES — proposal requested`,
      html: alertHtml(practiceName, [
        `Said yes and asked for the proposal at: ${email}`,
        'They still need to enter the email code to reach the portal — if they stall, send the proposal manually to that address.',
      ]),
    });
  } catch (e) {
    console.error('yes alert failed', e);
  }
}
