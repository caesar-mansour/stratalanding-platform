import { sendEmail } from '../email-transport';
import { escapeHtml } from '../html-utils';

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const EMAIL_FOOTER = `
  <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px;">
    <p style="color: #999; font-size: 12px; margin: 0 0 4px;">
      StrataLanding — Premium Landing Pages
    </p>
    <p style="color: #999; font-size: 11px; margin: 0;">
      <a href="mailto:dev@stratalanding.com?subject=unsubscribe" style="color: #999; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
`;

export async function sendMagicLinkEmail(email: string, token: string, redirectTo: string = '/portal') {
  const link = `${siteUrl()}/api/auth/verify-magic-link?token=${token}&redirectTo=${encodeURIComponent(redirectTo)}`;

  return sendEmail({
    to: email,
    subject: 'Your login link',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <p>Hi there,</p>

        <p>Here's your sign-in link. It expires in 15 minutes:</p>

        <p><a href="${escapeHtml(link)}">Sign in to StrataLanding</a></p>

        <p style="color: #999; font-size: 13px;">If you didn't request this, just ignore this email.</p>

        ${EMAIL_FOOTER}
      </div>
    `,
  });
}

export async function sendPreviewCodeEmail(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: `${code} is your StrataLanding code`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0B1B3A;">
        <p style="font-size: 15px; margin: 0 0 6px;">Here's your confirmation code — it expires in <b>10 minutes</b>:</p>
        <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; margin: 16px 0; color: #0B1B3A;">${escapeHtml(code)}</p>
        <p style="color: #667; font-size: 13px; margin: 0;">Type it into the page you already have open to continue. If you didn't request this, just ignore this email.</p>
        ${EMAIL_FOOTER}
      </div>
    `,
  });
}

// The exact content of the preview-link email — used by BOTH the real send and the
// admin "Preview" button, so what you preview is byte-for-byte what gets sent.
export function previewLinkEmailContent(practiceName: string, url: string) {
  const name = escapeHtml(practiceName);
  const link = escapeHtml(url);
  const subject = `${practiceName} — the new website I built you`;
  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0B1B3A;">
        <p style="font-size: 15px; margin: 0 0 14px;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
          Great talking with you. Like I said, I already built a new, faster version of your website — your logo,
          your colours, built for phones. Here's your private preview, free to look at:
        </p>
        <p style="margin: 22px 0;">
          <a href="${link}" style="display:inline-block; background:#0B1B3A; color:#fff; text-decoration:none; font-weight:700; padding:14px 26px; border-radius:12px; font-size:15px;">View your new website →</a>
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
          <b>Easiest test:</b> open it on your phone right next to your current site — you'll feel the difference in a few seconds.
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 6px; color:#33415a;">
          <b>Why it matters:</b> Google's own data shows most people leave a website that takes more than 3 seconds to load on a phone — so a slow site quietly loses patients to whoever loads first. This one's built to fix exactly that.
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 14px 0 6px; color:#33415a;"><b>If you're passing this to the doctor, the short version:</b></p>
        <ul style="font-size: 14px; line-height: 1.7; margin: 0 0 16px; padding-left: 18px; color:#33415a;">
          <li>Same practice — your logo, your colours — just faster, built for phones.</li>
          <li>Faster site = more of the people who Google you actually book.</li>
          <li>Already done, free to look, no obligation.</li>
        </ul>
        <p style="color: #667; font-size: 13px; line-height: 1.6; margin: 0;">
          No pressure at all — take a look whenever suits you. If you love it, there's a one-tap button on the page to get started.<br />
          — Caesar, StrataLanding
        </p>
        ${EMAIL_FOOTER}
      </div>
    `;
  return { subject, html };
}

// Sent ONLY when the founder clicks "Send email" in admin Phone Leads (i.e. the lead
// agreed on the call). Delivers their private preview link.
export async function sendPreviewLinkEmail(email: string, practiceName: string, url: string) {
  const { subject, html } = previewLinkEmailContent(practiceName, url);
  return sendEmail({ to: email, subject, html });
}

// The exact content of a FOLLOW-UP email — used by BOTH the real send and the admin
// "Preview the follow-up" button. `opened` picks the segment:
//   opened === true  → they had a look but never told us what they thought (nudge for a verdict)
//   opened === false → they never even opened the link (gentle re-send)
export function previewLinkFollowupEmailContent(practiceName: string, url: string, opened: boolean) {
  const name = escapeHtml(practiceName);
  const link = escapeHtml(url);
  const button = (label: string) =>
    `<p style="margin: 22px 0;"><a href="${link}" style="display:inline-block; background:#0B1B3A; color:#fff; text-decoration:none; font-weight:700; padding:14px 26px; border-radius:12px; font-size:15px;">${label}</a></p>`;
  const signoff = `<p style="color: #667; font-size: 13px; line-height: 1.6; margin: 18px 0 0;">— Caesar, StrataLanding</p>`;

  if (opened) {
    // Segment A — opened, no decision.
    const subject = `Re: ${practiceName} — what did you think?`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0B1B3A;">
        <p style="font-size: 15px; margin: 0 0 14px;">Hi ${name},</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
          Saw you got a moment to look at the new site I built for ${name} — hope it made a good first impression.
        </p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
          No rush at all, just wanted to check in: what did you think? If you liked it, there's a one-tap button
          on the page to get started. If something felt off, just reply and tell me — I'll change it, that's the
          whole point of showing you first.
        </p>
        ${button('Open your preview again →')}
        ${signoff}
        ${EMAIL_FOOTER}
      </div>
    `;
    return { subject, html };
  }

  // Segment B — never opened.
  const subject = `Re: ${practiceName} — did my preview reach you?`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0B1B3A;">
      <p style="font-size: 15px; margin: 0 0 14px;">Hi ${name},</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
        A few days back I sent over the new website I built for ${name} — your logo, your colours, built for phones.
        Looks like it hasn't been opened yet (these emails love the spam folder). Here it is again, free to look,
        no obligation:
      </p>
      ${button('View your new website →')}
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
        Takes about 20 seconds on your phone. If it's not for you, just say so and I'll stop — genuinely no pressure.
      </p>
      ${signoff}
      ${EMAIL_FOOTER}
    </div>
  `;
  return { subject, html };
}

// Sent when the founder clicks "Follow up" on a lead in admin Phone Leads. Delivers a
// segment-appropriate nudge with a fresh working preview link.
export async function sendPreviewLinkFollowupEmail(email: string, practiceName: string, url: string, opened: boolean) {
  const { subject, html } = previewLinkFollowupEmailContent(practiceName, url, opened);
  return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${siteUrl()}/auth/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <p>Hi there,</p>

        <p>We received a request to reset your password. Click below to choose a new one (expires in 1 hour):</p>

        <p><a href="${escapeHtml(link)}">Reset your password</a></p>

        <p style="color: #999; font-size: 13px;">If you didn't request this, you can ignore this email.</p>

        ${EMAIL_FOOTER}
      </div>
    `,
  });
}

export async function sendEmailVerificationEmail(email: string, token: string) {
  const link = `${siteUrl()}/api/auth/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Verify your email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <p>Hi there,</p>

        <p>Please verify your email address by clicking the link below:</p>

        <p><a href="${escapeHtml(link)}">Verify my email</a></p>

        <p style="color: #999; font-size: 13px;">If you didn't create an account, you can ignore this email.</p>

        ${EMAIL_FOOTER}
      </div>
    `,
  });
}

/**
 * Tell the account owner that a security-sensitive change just happened.
 *
 * AUDIT 2026-08-12 (P2): nothing was sent on password change, password reset completion, or MFA
 * enrolment. That silence is the problem — an attacker who has taken over an account changes the
 * password and the real owner learns about it only when they next fail to log in, by which point
 * the session is gone and so is the recovery window. A notification is often the ONLY signal a
 * victim gets, and it costs one email.
 *
 * Deliberately non-throwing: a failed notification must never fail the security action itself
 * (blocking a password change because email is down would be worse). Failures are recorded
 * durably by the transport in email_failures.
 */
export async function sendSecurityAlertEmail(
  email: string,
  change: 'password_changed' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled',
): Promise<void> {
  const copy: Record<typeof change, { subject: string; line: string }> = {
    password_changed: {
      subject: 'Your StrataLanding password was changed',
      line: 'The password on your StrataLanding account was just changed.',
    },
    password_reset: {
      subject: 'Your StrataLanding password was reset',
      line: 'Your StrataLanding password was just reset using an emailed reset link.',
    },
    mfa_enabled: {
      subject: 'Two-factor authentication enabled',
      line: 'Two-factor authentication was just switched on for your StrataLanding account.',
    },
    mfa_disabled: {
      subject: 'Two-factor authentication disabled',
      line: 'Two-factor authentication was just switched OFF for your StrataLanding account.',
    },
  };

  const { subject, line } = copy[change];

  try {
    await sendEmail({
      to: email,
      subject,
      context: `security-${change}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0B1B3A;">
          <p style="font-size: 16px; line-height: 1.6;">${line}</p>
          <p style="font-size: 16px; line-height: 1.6;">
            If this was you, no action is needed. <strong>If it wasn't</strong>, reply to this email
            immediately — someone may have access to your account.
          </p>
          <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
            ${new Date().toUTCString()}
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[SECURITY] alert email failed:', err);
  }
}
