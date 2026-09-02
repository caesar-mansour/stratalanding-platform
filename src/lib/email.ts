import { sendEmail } from './email-transport';
import { escapeHtml, escapeHtmlWithLineBreaks, sanitizeEmail } from './html-utils';
import { generateSignedUrl } from './price-override';
import { proposalPublicUrl } from './proposal-token';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'stratalanding@gmail.com';

// Footer for all client-facing emails.
//
// AUDIT 2026-08-12 (P2): this was labelled "CAN-SPAM compliant" but carried NO physical postal
// address, which CAN-SPAM requires for commercial mail — and the unsubscribe pointed at
// dev@stratalanding.com, a different address from the one the business actually monitors.
// The address is now emitted from BUSINESS_POSTAL_ADDRESS when set. It is deliberately NOT
// hardcoded: inventing an address would be worse than omitting one, and which address to publish
// is the founder's call. Set it before sending commercial (not transactional) mail.
const EMAIL_FOOTER = `
  <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">
      StrataLanding — Premium Landing Pages
    </p>
    <p style="color: #94a3b8; font-size: 11px; margin: 0 0 4px;">
      You're receiving this because you submitted a project inquiry at stratalanding.com.
    </p>
    ${process.env.BUSINESS_POSTAL_ADDRESS ? `<p style="color: #94a3b8; font-size: 11px; margin: 0 0 4px;">${process.env.BUSINESS_POSTAL_ADDRESS}</p>` : ''}
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      <a href="mailto:${process.env.ADMIN_EMAIL || 'stratalanding@gmail.com'}?subject=unsubscribe" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
`;

interface BriefNotificationData {
  clientName: string;
  clientEmail: string;
  companyName: string;
  industry: string;
  packageType: string;
  demoReference?: string;
  notes?: string;
  projectId: string;
}

// Send notification to admin when new brief is submitted
export async function sendBriefNotificationToAdmin(data: BriefNotificationData) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const packageLabels: Record<string, string> = {
    starter: 'Presence Page ($2,400)',
    growth: 'Lead Page ($4,800)',
    scale: 'Purchase Page ($9,600)',
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const adminUrl = `${siteUrl}/admin`;
  const demoUrl = data.demoReference ? `${siteUrl}/demos/${data.demoReference}` : '';
  const submittedAt = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  try {
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      // AUDIT 2026-08-12 (P2): reply goes to the PROSPECT, not back to our own inbox.
      replyTo: data.clientEmail,
      context: 'brief-admin-notification',
      // AUDIT 2026-08-12 (P3): do NOT escapeHtml a SUBJECT line — it is plain text, so a company
      // called "Smith & Jones" arrived as "Smith &amp; Jones" in the inbox. sanitizeHeader in the
      // transport already strips CRLF, which is the actual header-injection risk.
      subject: `New Brief: ${data.companyName} — ${packageLabels[data.packageType] || data.packageType}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #0B1120;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0B1B3A 0%, #122548 50%, #0891B2 100%); padding: 40px 32px 32px; text-align: center;">
            <div style="display: inline-block; background: rgba(8,145,178,0.15); border: 1px solid rgba(8,145,178,0.3); border-radius: 20px; padding: 6px 16px; margin-bottom: 16px;">
              <span style="color: #22D3EE; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">New Project Brief</span>
            </div>
            <h1 style="color: #F8FAFC; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${escapeHtml(data.companyName)}</h1>
            <p style="color: #94A3B8; margin: 8px 0 0; font-size: 14px;">${submittedAt}</p>
          </div>

          <!-- Package Badge -->
          <div style="padding: 0 32px;">
            <div style="background: linear-gradient(135deg, #0891B2 0%, #0E7490 100%); border-radius: 12px; padding: 20px 24px; margin-top: -16px; position: relative; text-align: center;">
              <span style="color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Selected Package</span>
              <div style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin-top: 4px;">${escapeHtml(packageLabels[data.packageType] || data.packageType)}</div>
            </div>
          </div>

          <!-- Client Details -->
          <div style="padding: 32px;">
            <h2 style="color: #E2E8F0; margin: 0 0 20px; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Client Details</h2>

            <div style="background: #111827; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; width: 110px; border-bottom: 1px solid #1E293B;">Name</td>
                  <td style="padding: 16px 20px; color: #F1F5F9; font-size: 15px; font-weight: 600; border-bottom: 1px solid #1E293B;">${escapeHtml(data.clientName)}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #1E293B;">Email</td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #1E293B;">
                    <a href="mailto:${sanitizeEmail(data.clientEmail)}" style="color: #22D3EE; font-size: 15px; text-decoration: none;">${escapeHtml(data.clientEmail)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #1E293B;">Company</td>
                  <td style="padding: 16px 20px; color: #F1F5F9; font-size: 15px; font-weight: 600; border-bottom: 1px solid #1E293B;">${escapeHtml(data.companyName)}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; ${data.demoReference ? 'border-bottom: 1px solid #1E293B;' : ''}">Industry</td>
                  <td style="padding: 16px 20px; color: #CBD5E1; font-size: 15px; ${data.demoReference ? 'border-bottom: 1px solid #1E293B;' : ''}">
                    <span style="display: inline-block; background: #1E293B; padding: 4px 12px; border-radius: 6px; font-size: 13px; color: #94A3B8;">${escapeHtml(data.industry)}</span>
                  </td>
                </tr>
                ${data.demoReference ? `
                <tr>
                  <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500;">Demo</td>
                  <td style="padding: 16px 20px;">
                    <a href="${escapeHtml(demoUrl)}" style="color: #A78BFA; font-size: 15px; text-decoration: none; font-weight: 500;">${escapeHtml(data.demoReference)}</a>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${data.notes ? `
            <h2 style="color: #E2E8F0; margin: 28px 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Project Notes</h2>
            <div style="background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 20px;">
              <p style="color: #CBD5E1; margin: 0; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtmlWithLineBreaks(data.notes)}</p>
            </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${escapeHtml(adminUrl)}"
                 style="display: inline-block; background: linear-gradient(135deg, #0891B2 0%, #0E7490 100%); color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
                Open Admin Dashboard
              </a>
            </div>

            <!-- Project ID -->
            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #1E293B;">
              <span style="color: #475569; font-size: 11px; font-family: 'SF Mono', Monaco, monospace; letter-spacing: 0.5px;">ID: ${data.projectId}</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 32px 28px; text-align: center; border-top: 1px solid #1E293B;">
            <p style="color: #475569; font-size: 12px; margin: 0;">StrataLanding — Premium Landing Pages</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send admin notification:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send confirmation email to client
export async function sendBriefConfirmationToClient(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `Re: ${data.companyName} — brief received`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p>Thanks for submitting your brief for <strong>${escapeHtml(data.companyName)}</strong> — we got it and we're reviewing everything now.</p>

          <p>Next step: create your account in our client portal so you can complete a quick interview (10 questions, about 15 minutes). Once that's done, we'll generate your proposal automatically.</p>

          <p>No payment required until you're ready to move forward.</p>

          <p>Questions? Just reply to this email.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send client confirmation:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send onboarding invite email — tells client to complete AI interview before proposal is sent
export async function sendOnboardingInviteEmail(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const signupUrl = `${siteUrl}/login`;

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `Your ${data.companyName} project — next steps`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p>Thanks for submitting your brief for <strong>${escapeHtml(data.companyName)}</strong>. We're reviewing it now.</p>

          <p>To get your proposal, here's what to do:</p>

          <p>1. Create your account at <a href="${signupUrl}">${signupUrl}</a><br>
          2. Verify your email<br>
          3. Complete the interview (10 questions, ~15 min)</p>

          <p>Once the interview is done, your proposal gets generated automatically.</p>

          <p>Questions? Just reply here.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send onboarding invite:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Onboarding invite email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send interview reminder to clients who signed up but haven't completed the onboarding interview
export async function sendInterviewReminderEmail(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const portalUrl = `${siteUrl}/portal`;

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `Re: ${data.companyName} — quick follow-up`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p>Just following up on your ${escapeHtml(data.companyName)} project. We still need your interview answers before we can put your proposal together.</p>

          <p>It's 10 questions, takes about 15 minutes. Once you're done, your proposal gets generated right away.</p>

          <p>Log in here to finish: <a href="${portalUrl}">${portalUrl}</a></p>

          <p>Let me know if you have any questions.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send interview reminder:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Interview reminder email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send checklist download email to subscriber (and optionally notify admin)
export async function sendChecklistEmail(data: { email: string; notifyAdmin?: boolean }) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  try {
    if (data.notifyAdmin) {
      const result = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Checklist Download: ${sanitizeEmail(data.email)}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3A6A8A 0%, #9ABCD8 100%); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">New Checklist Download</h1>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #475569; margin: 0;">
                <strong>${escapeHtml(data.email)}</strong> downloaded the landing page checklist via the exit-intent popup.
              </p>
            </div>
          </div>
        `,
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true };
    }

    // Send checklist to the subscriber
    const result = await sendEmail({
      to: data.email,
      subject: 'Your landing page checklist',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
          <p>Here's your landing page checklist — 10 things that make the biggest difference in conversions:</p>

          <ol style="padding-left: 20px; line-height: 1.9;">
            <li><strong>Clear, benefit-driven headline</strong> — speak to your visitor's #1 pain point</li>
            <li><strong>Single, focused CTA</strong> — one action per page, no distractions</li>
            <li><strong>Social proof above the fold</strong> — logos, testimonials, or stats visible immediately</li>
            <li><strong>Fast load time (&lt;3s)</strong> — every second of delay kills 7% of conversions</li>
            <li><strong>Mobile-first design</strong> — 60%+ of traffic is mobile</li>
            <li><strong>Visual hierarchy</strong> — guide the eye from headline to CTA naturally</li>
            <li><strong>Objection handling</strong> — FAQs, guarantees, or trust badges</li>
            <li><strong>Urgency or scarcity</strong> — give visitors a reason to act now</li>
            <li><strong>Minimal form fields</strong> — only ask for what you truly need</li>
            <li><strong>Thank-you page with next step</strong> — keep momentum after conversion</li>
          </ol>

          <p>If you'd like us to build a page that checks all these boxes, you can <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://stratalanding.com'}/brief" style="color: #0891B2;">start a project brief here</a>.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send checklist email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Checklist email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Package-specific deliverables for status emails
const packageDeliverables: Record<string, { pages: string; sections: string; tracking: string; integrations: string; revisions: string; delivery: string; support: string }> = {
  starter: {
    pages: '1 landing page',
    sections: '5-7 sections',
    tracking: 'StrataMetrics page_view tracking',
    integrations: 'None',
    revisions: '6 revision rounds',
    delivery: '7-10 business days',
    support: 'Email support during build',
  },
  growth: {
    pages: '1 landing page + 1 thank-you page',
    sections: '8-12 sections',
    tracking: 'StrataMetrics events (cta_click, form_start, form_submit, thank_you_view)',
    integrations: 'Lead form connected to your email tool or CRM',
    revisions: 'Unlimited revision rounds',
    delivery: '10-14 business days',
    support: 'Email support during build',
  },
  scale: {
    pages: '3-5 page conversion flow',
    sections: '15-20 sections',
    tracking: 'StrataMetrics funnel events (cta_click, form_start, form_submit, begin_checkout, purchase, thank_you_view)',
    integrations: 'Payment integration + webhooks spec',
    revisions: 'Unlimited revision rounds',
    delivery: '14-21 business days',
    support: '14-day post-launch support (bug fixes + minor adjustments)',
  },
};

// Send status change notification to client
export async function sendStatusChangeEmail(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
  newStatus: string;
  previewUrl?: string | null;
  finalPaymentUrl?: string | null;
  portalUrl?: string;
  packageType?: string;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const portalUrl = data.portalUrl || `${siteUrl}/portal`;
  const pkg = packageDeliverables[data.packageType || 'starter'] || packageDeliverables.starter;
  const packageNames: Record<string, string> = { starter: 'Presence Page', growth: 'Lead Page', scale: 'Purchase Page' };
  const packageName = packageNames[data.packageType || 'starter'] || 'Presence Page';
  const isPurchaseTier = data.packageType === 'scale';

  // Status-specific content
  const statusContent: Record<string, { emoji: string; heading: string; message: string; color: string; extraHtml?: string; cta?: { label: string; url: string } }> = {
    proposal_sent: {
      emoji: '📋',
      heading: 'Your Proposal is Ready',
      message: 'We\'ve prepared a custom proposal for your project. Please review it and let us know if you\'d like to proceed.',
      color: '#0891B2',
      cta: { label: 'View Proposal', url: portalUrl },
    },
    deposit_paid: {
      emoji: '✅',
      heading: 'Deposit Received — Thank You!',
      message: 'Your 50% deposit has been received and your project is now active. Here\'s what happens next:',
      color: '#059669',
      extraHtml: `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin: 0 0 16px 0; font-size: 16px;">Your Project Roadmap</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 12px; color: #059669; font-weight: 600; width: 32px; vertical-align: top;">1.</td>
              <td style="padding: 10px 0;">
                <strong style="color: #0f172a;">Research &amp; Strategy</strong>
                <div style="color: #64748b; font-size: 14px; margin-top: 2px;">We analyze your industry, competitors, and audience to plan the messaging and layout.</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; color: #059669; font-weight: 600; vertical-align: top;">2.</td>
              <td style="padding: 10px 0;">
                <strong style="color: #0f172a;">Wireframe &amp; Messaging</strong>
                <div style="color: #64748b; font-size: 14px; margin-top: 2px;">You'll review and approve the page structure and headlines before we build.</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; color: #059669; font-weight: 600; vertical-align: top;">3.</td>
              <td style="padding: 10px 0;">
                <strong style="color: #0f172a;">Design &amp; Build</strong>
                <div style="color: #64748b; font-size: 14px; margin-top: 2px;">We design, develop, and integrate everything. You'll see a full preview before launch.</div>
              </td>
            </tr>
          </table>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              <strong style="color: #0f172a;">Estimated delivery:</strong> ${escapeHtml(pkg.delivery)} from today
            </p>
          </div>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400E; margin: 0 0 8px 0; font-weight: 600; font-size: 15px;">Upload Your Assets</p>
          <p style="color: #78350F; margin: 0 0 12px 0; font-size: 14px;">
            To get started, we need a few things from you:
          </p>
          <ul style="color: #78350F; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li><strong>Logo</strong> (SVG or PNG, transparent background preferred)</li>
            <li><strong>Brand colors</strong> (hex codes if you have them)</li>
            <li><strong>Photos or images</strong> you'd like us to use</li>
            <li><strong>Copy or content</strong> (product descriptions, testimonials, etc.)</li>
          </ul>
        </div>
      `,
      cta: { label: 'Upload Assets in Your Portal', url: `${portalUrl}/uploads` },
    },
    in_production: {
      emoji: '🚀',
      heading: 'Your Project is In Production',
      message: 'Our team is actively designing and building your landing page. Here\'s where things stand:',
      color: '#7C3AED',
      extraHtml: `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Package:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 500; text-align: right;">${escapeHtml(packageName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Estimated delivery:</td>
              <td style="padding: 8px 0; color: #7C3AED; font-weight: 500; text-align: right;">${escapeHtml(pkg.delivery)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Revisions:</td>
              <td style="padding: 8px 0; color: #0f172a; text-align: right;">${escapeHtml(pkg.revisions)}</td>
            </tr>
          </table>
        </div>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          You'll receive checkpoint notifications as we hit key milestones. We'll ask for your approval on the wireframe and messaging before moving to the full build. You can message us anytime through your portal.
        </p>
      `,
      cta: { label: 'View Your Portal', url: portalUrl },
    },
    ready_for_final_payment: {
      emoji: '🎉',
      heading: 'Your Project is Complete!',
      message: 'Great news — your landing page is built and ready for your review.',
      color: '#D97706',
      extraHtml: `
        ${data.previewUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(data.previewUrl)}"
             style="display: inline-block; background: #0891B2; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px;">
            Preview Your Page
          </a>
          <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">
            ${escapeHtml(data.previewUrl)}
          </p>
        </div>
        ` : ''}

        <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #9A3412; margin: 0 0 8px 0; font-weight: 600;">Before you approve:</p>
          <ul style="color: #9A3412; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Review on <strong>desktop</strong> and <strong>mobile</strong></li>
            <li>Check all text, images, and links</li>
            <li>Test any forms or buttons</li>
            <li>Send all feedback in one round for fastest turnaround</li>
          </ul>
        </div>

        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Once you're happy with the preview, pay the remaining 50% and we'll launch within 24-48 hours.
        </p>
      `,
      cta: data.finalPaymentUrl
        ? { label: 'Pay Final Balance & Launch', url: data.finalPaymentUrl }
        : { label: 'View in Portal', url: portalUrl },
    },
    paid_in_full: {
      emoji: '💰',
      heading: 'Payment Complete',
      message: 'All payments received! Your project launch/handoff will be scheduled within 24-48 hours. We\'ll be in touch shortly.',
      color: '#059669',
    },
    launched: {
      emoji: '🌐',
      heading: 'Your Landing Page is Live!',
      message: `Congratulations — your ${escapeHtml(packageName)} for <strong>${escapeHtml(data.companyName)}</strong> is officially live. Here's a summary of everything we delivered:`,
      color: '#0891B2',
      extraHtml: `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin: 0 0 16px 0; font-size: 16px;">What We Delivered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Pages:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${escapeHtml(pkg.pages)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Sections:</td>
              <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(pkg.sections)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Tracking:</td>
              <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(pkg.tracking)}</td>
            </tr>
            ${pkg.integrations !== 'None' ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Integrations:</td>
              <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(pkg.integrations)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Performance:</td>
              <td style="padding: 8px 0; color: #0f172a;">Core Web Vitals optimized (LCP &lt;2.5s, CLS &lt;0.1, INP &lt;200ms)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Mobile:</td>
              <td style="padding: 8px 0; color: #0f172a;">Fully responsive, mobile-first design</td>
            </tr>
          </table>
        </div>

        ${data.previewUrl ? `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${escapeHtml(data.previewUrl)}"
             style="display: inline-block; background: #0891B2; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            View Your Live Page
          </a>
        </div>
        ` : ''}

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; margin: 0 0 8px 0; font-weight: 600;">Analytics are active</p>
          <p style="color: #15803D; margin: 0; font-size: 14px;">
            StrataMetrics tracking is live on your page. You can monitor visits, events, and conversions in your portal's analytics dashboard.
          </p>
        </div>

        ${isPurchaseTier ? `
        <div style="background: #EFF6FF; border: 1px solid #93C5FD; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #1E40AF; margin: 0 0 8px 0; font-weight: 600;">14-Day Post-Launch Support</p>
          <p style="color: #1D4ED8; margin: 0; font-size: 14px;">
            Your Purchase Page includes 14 days of post-launch support. If you find any bugs or need minor adjustments, message us through your portal and we'll handle it.
          </p>
        </div>
        ` : ''}

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px;">What We Recommend Next</h3>
          <ol style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 2;">
            <li><strong>Start driving traffic</strong> — Share the link, run ads, post on social</li>
            <li><strong>Monitor analytics</strong> — Check your portal dashboard after the first week to see what's working</li>
            <li><strong>Use UTM parameters</strong> — Add ?utm_source=... to your links so you can track which channels convert best</li>
          </ol>
        </div>

        <div style="background: #FAFAFA; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #0f172a; margin: 0 0 8px 0; font-weight: 500;">One small ask</p>
          <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
            If you're happy with the result, a quick 2-3 sentence review would mean the world to us. Just reply to this email with your thoughts — we'll feature it on our site (with your permission, of course).
          </p>
        </div>
      `,
    },
    not_interested: {
      emoji: '👋',
      heading: 'Project Closed',
      message: 'Your project has been closed. If you change your mind or have questions in the future, don\'t hesitate to reach out. We\'re always here to help.',
      color: '#64748B',
    },
  };

  const content = statusContent[data.newStatus];
  if (!content) {
    // Don't send email for 'new' status (that's handled by brief confirmation)
    return { success: true };
  }

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `${content.heading} — ${data.companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p><strong>${content.heading}</strong></p>

          <p>${content.message}</p>

          ${content.extraHtml || ''}

          ${content.cta ? `
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(content.cta.url)}"
               style="display: inline-block; background: #0891B2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              ${content.cta.label}
            </a>
          </p>
          ` : ''}

          <p>If you have questions, just reply to this email.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send status change email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Status change email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send payment confirmation/receipt email to client
export async function sendPaymentConfirmationEmail(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
  paymentType: 'deposit' | 'final';
  amountCents: number;
  currency: string;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const amount = (data.amountCents / 100).toFixed(2);
  const currencySymbol = data.currency === 'USD' ? '$' : data.currency;
  const isDeposit = data.paymentType === 'deposit';

  const heading = isDeposit ? 'Deposit Received' : 'Payment Complete';
  const message = isDeposit
    ? `Your 50% deposit of ${currencySymbol}${amount} for <strong>${escapeHtml(data.companyName)}</strong> has been received. Your project is now active and we&apos;ll begin work shortly.`
    : `Your final payment of ${currencySymbol}${amount} for <strong>${escapeHtml(data.companyName)}</strong> has been received. Your project will be launched within 24-48 hours.`;
  const color = '#059669';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `Payment received — ${currencySymbol}${amount} for ${data.companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p>${message}</p>

          <p><strong>Payment summary:</strong></p>
          <ul style="padding-left: 20px;">
            <li>Type: ${isDeposit ? '50% Deposit' : 'Final Balance'}</li>
            <li>Amount: ${currencySymbol}${amount}</li>
            <li>Project: ${escapeHtml(data.companyName)}</li>
          </ul>

          <p>
            <a href="${siteUrl}/portal" style="display: inline-block; background: #0891B2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Your Portal</a>
          </p>

          <p>If you have questions, just reply to this email.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send payment confirmation:', result.error);
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error('Payment email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send proposal email to client
export async function sendProposalToClient(data: {
  clientName: string;
  clientEmail: string;
  companyName: string;
  packageType: string;
  totalPrice: number;
  depositAmount: number;
  proposalId: string;
  validUntil: string;
  notes?: string | null;
  depositPaymentUrl?: string | null;
}) {
  if (!process.env.GMAIL_REFRESH_TOKEN) {
    console.log('GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const packageLabels: Record<string, string> = {
    starter: 'Presence Page',
    growth: 'Lead Page',
    scale: 'Purchase Page',
  };

  // SECURITY (audit F53): prospect link carries a signed, expiring token (the page is gated).
  const proposalUrl = proposalPublicUrl(data.proposalId);
  const validDate = new Date(data.validUntil).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject: `Your proposal for ${data.companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
          <p>Hi ${escapeHtml(data.clientName)},</p>

          <p>Your proposal for ${escapeHtml(data.companyName)} is ready.</p>

          <p><strong>Summary:</strong></p>
          <ul style="padding-left: 20px;">
            <li>Package: ${packageLabels[data.packageType] || data.packageType}</li>
            <li>Total: $${data.totalPrice.toLocaleString()}</li>
            <li>Deposit to start (50%): $${data.depositAmount.toLocaleString()}</li>
          </ul>

          ${data.notes ? `<p><em>Note from our team:</em> ${escapeHtmlWithLineBreaks(data.notes)}</p>` : ''}

          <p style="margin: 24px 0;">
            <a href="${proposalUrl}" style="display: inline-block; background: #0891B2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              View Full Proposal
            </a>
          </p>

          <p style="color: #666; font-size: 13px;">This proposal is valid until ${validDate}.</p>

          <p>Review it at your convenience. When you're ready, click "Accept Proposal" and pay the 50% deposit to get started.</p>

          <p>Questions? Just reply to this email.</p>

          <p>Best,<br>The StrataLanding Team</p>

          ${EMAIL_FOOTER}
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send proposal email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send price override approval email to CEO
export async function sendPriceOverrideApprovalEmail(data: {
  overrideId: string;
  projectName: string;
  clientName: string;
  packageType: string;
  originalCents: number;
  overrideCents: number;
  reason: string;
  requestedBy: string;
}) {
  const ceoEmail = process.env.CEO_EMAIL;
  if (!ceoEmail || !process.env.GMAIL_REFRESH_TOKEN) {
    console.log('CEO_EMAIL or GMAIL_REFRESH_TOKEN not configured - skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const approveUrl = generateSignedUrl(data.overrideId, 'approve', data.overrideCents);
  const rejectUrl = generateSignedUrl(data.overrideId, 'reject', data.overrideCents);
  const originalPrice = `$${(data.originalCents / 100).toLocaleString()}`;
  const newPrice = `$${(data.overrideCents / 100).toLocaleString()}`;
  const pkgLabels: Record<string, string> = {
    starter: 'Presence Page',
    growth: 'Lead Page',
    scale: 'Purchase Page',
  };

  try {
    const result = await sendEmail({
      to: sanitizeEmail(ceoEmail),
      // AUDIT 2026-08-12 (P3): subjects are plain text — escaping turns & into &amp; in the inbox.
      subject: `Price Override Request: ${data.projectName} — ${newPrice}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #0B1120;">
          <div style="background: linear-gradient(135deg, #0B1B3A 0%, #122548 50%, #0891B2 100%); padding: 40px 32px 32px; text-align: center;">
            <div style="display: inline-block; background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 6px 16px; margin-bottom: 16px;">
              <span style="color: #FBBF24; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Price Override Request</span>
            </div>
            <h1 style="color: #F8FAFC; margin: 0; font-size: 28px; font-weight: 700;">${escapeHtml(data.projectName)}</h1>
            <p style="color: #94A3B8; margin: 8px 0 0; font-size: 14px;">Requested by ${escapeHtml(data.requestedBy)}</p>
          </div>
          <div style="padding: 0 32px;">
            <table style="width: 100%; background: #111827; border: 1px solid #1E293B; border-radius: 12px; margin-top: -16px; border-collapse: collapse;">
              <tr>
                <td style="padding: 20px; text-align: center; border-right: 1px solid #1E293B; width: 50%;">
                  <span style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; display: block;">Current Price</span>
                  <div style="color: #94A3B8; font-size: 24px; font-weight: 700; margin-top: 4px; text-decoration: line-through;">${originalPrice}</div>
                </td>
                <td style="padding: 20px; text-align: center; width: 50%;">
                  <span style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; display: block;">New Price</span>
                  <div style="color: #22D3EE; font-size: 24px; font-weight: 700; margin-top: 4px;">${newPrice}</div>
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; background: #111827; border: 1px solid #1E293B; border-radius: 12px; border-collapse: collapse;">
              <tr>
                <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; width: 110px; border-bottom: 1px solid #1E293B;">Client</td>
                <td style="padding: 16px 20px; color: #F1F5F9; font-size: 15px; font-weight: 600; border-bottom: 1px solid #1E293B;">${escapeHtml(data.clientName)}</td>
              </tr>
              <tr>
                <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #1E293B;">Package</td>
                <td style="padding: 16px 20px; color: #CBD5E1; font-size: 15px; border-bottom: 1px solid #1E293B;">${escapeHtml(pkgLabels[data.packageType] || data.packageType)}</td>
              </tr>
              <tr>
                <td style="padding: 16px 20px; color: #64748B; font-size: 13px; font-weight: 500;">Reason</td>
                <td style="padding: 16px 20px; color: #CBD5E1; font-size: 15px; line-height: 1.6;">${escapeHtmlWithLineBreaks(data.reason)}</td>
              </tr>
            </table>
            <div style="margin-top: 28px; text-align: center;">
              <a href="${approveUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #FFFFFF; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; margin-right: 12px;">Approve</a>
              <a href="${rejectUrl}" style="display: inline-block; background: #1E293B; border: 1px solid #334155; color: #94A3B8; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">Reject</a>
            </div>
            <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 16px;">These links expire in 72 hours. You can also approve/reject from the admin panel.</p>
          </div>
          <div style="text-align: center; padding: 20px; border-top: 1px solid #1E293B;">
            <p style="color: #64748B; font-size: 12px; margin: 0;">StrataLanding — Price Override System</p>
          </div>
        </div>
      `,
    });

    if (!result.success) {
      console.error('Failed to send price override email:', result.error);
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error('Price override email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
