// Template Purchase Fulfillment System
// Handles: download tokens, purchase recording, email delivery, auto account creation

import crypto from 'crypto';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/email-transport';
import { escapeHtml } from '@/lib/html-utils';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { downloadTokenKey } from '@/lib/security/keys';

// ── Download Token (HMAC-SHA256, 72h expiry) ─────────────────────────
// SECURITY (audit F12): keyed with a dedicated DOWNLOAD_TOKEN_KEY (falls back to AUTH_SECRET),
// not the shared AUTH_SECRET that also signs sessions.

export function generateDownloadToken(purchaseId: string, email: string): string {
  const exp = Math.floor(Date.now() / 1000) + 72 * 60 * 60; // 72 hours
  const payload = JSON.stringify({ pid: purchaseId, email, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', downloadTokenKey())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyDownloadToken(
  token: string
): { purchaseId: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;

    const expectedSig = crypto
      .createHmac('sha256', downloadTokenKey())
      .update(payloadB64)
      .digest('base64url');

    // Timing-safe comparison
    if (sig.length !== expectedSig.length) return null;
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, 'utf8'),
        Buffer.from(expectedSig, 'utf8')
      )
    )
      return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString()
    );
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { purchaseId: payload.pid, email: payload.email };
  } catch {
    return null;
  }
}

// ── Purchase Fulfillment ──────────────────────────────────────────────

interface FulfillmentInput {
  paypalOrderId: string;
  paypalCaptureId: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  buyerCompany?: string;
  templateId: string;
  plan: string;
  amountCents: number;
}

interface FulfillmentResult {
  purchaseId: string;
  downloadToken: string;
  alreadyProcessed: boolean;
  isNewAccount: boolean;
  buyerEmail: string;
  buyerName: string;
}

export async function fulfillTemplatePurchase(
  input: FulfillmentInput
): Promise<FulfillmentResult | null> {
  // Idempotent insert — ON CONFLICT returns nothing if already exists
  const result = await sql`
    INSERT INTO template_purchases (
      buyer_email, buyer_name, buyer_phone, buyer_company,
      template_id, plan, amount_cents, currency,
      paypal_order_id, paypal_capture_id, paypal_status
    ) VALUES (
      ${input.buyerEmail}, ${input.buyerName}, ${input.buyerPhone || null}, ${input.buyerCompany || null},
      ${input.templateId}, ${input.plan}, ${input.amountCents}, ${'usd'},
      ${input.paypalOrderId}, ${input.paypalCaptureId}, ${'COMPLETED'}
    )
    ON CONFLICT (paypal_capture_id) DO NOTHING
    RETURNING id
  `;

  // If no row returned, it was already processed
  if (result.length === 0) {
    const [existing] = await sql`
      SELECT id FROM template_purchases WHERE paypal_capture_id = ${input.paypalCaptureId} LIMIT 1
    `;
    if (!existing) return null;
    const token = generateDownloadToken(existing.id, input.buyerEmail);
    // Check if user needs activation (no password set or never logged in)
    const [existingUser] = await sql`SELECT id, password_hash FROM auth_users WHERE email = ${input.buyerEmail} LIMIT 1`;
    let needsActivation = !existingUser;
    if (existingUser && existingUser.password_hash) {
      const [session] = await sql`SELECT id FROM auth_sessions WHERE user_id = ${existingUser.id} LIMIT 1`;
      needsActivation = !session;
    } else if (existingUser) {
      needsActivation = true; // has account but no password
    }
    return { purchaseId: existing.id, downloadToken: token, alreadyProcessed: true, isNewAccount: needsActivation, buyerEmail: input.buyerEmail, buyerName: input.buyerName };
  }

  const purchaseId = result[0].id;
  const downloadToken = generateDownloadToken(purchaseId, input.buyerEmail);

  // Auto-create auth account if needed
  const { portalLoginUrl, isNewAccount } = await ensureBuyerAccount(input.buyerEmail, input.buyerName);

  // Send delivery email (async, don't block response)
  sendTemplateDeliveryEmail({
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    templateName: formatTemplateName(input.templateId),
    plan: input.plan,
    downloadToken,
    amount: (input.amountCents / 100).toFixed(2),
    portalLoginUrl,
  }).then((res) => {
    if (res.success) {
      sql`UPDATE template_purchases SET delivered_via_email = true WHERE id = ${purchaseId}`.catch(() => {});
    }
  }).catch((err) => console.error('Template delivery email failed:', err));

  return { purchaseId, downloadToken, alreadyProcessed: false, isNewAccount, buyerEmail: input.buyerEmail, buyerName: input.buyerName };
}

// ── Auto Account Creation ─────────────────────────────────────────────

async function ensureBuyerAccount(email: string, name: string): Promise<{ portalLoginUrl: string; isNewAccount: boolean }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Check if auth_users already exists
  const [existingUser] = await sql`
    SELECT id, password_hash FROM auth_users WHERE email = ${email} LIMIT 1
  `;

  if (existingUser) {
    // If user exists but never set a real password (old random password or NULL),
    // check if they've ever logged in (have sessions). If not, they need activation.
    const hasPassword = !!existingUser.password_hash;
    if (hasPassword) {
      // Check if they've ever actually logged in
      const [session] = await sql`SELECT id FROM auth_sessions WHERE user_id = ${existingUser.id} LIMIT 1`;
      if (session) {
        // Real user who has logged in before — send to login
        return { portalLoginUrl: `${siteUrl}/login?redirectTo=/portal/my-templates`, isNewAccount: false };
      }
    }
    // User exists but never logged in (random password from old code or NULL password)
    // Reset to NULL so they can activate properly
    await sql`UPDATE auth_users SET password_hash = ${null}, account_type = COALESCE(account_type, 'template_buyer') WHERE id = ${existingUser.id}`;
    return { portalLoginUrl: `${siteUrl}/login?redirectTo=/portal/my-templates`, isNewAccount: true };
  }

  // Create new auth_users record WITHOUT password (buyer sets it on activation page)
  await sql`
    INSERT INTO auth_users (email, password_hash, email_verified, account_type)
    VALUES (${email}, ${null}, ${true}, ${'template_buyer'})
    ON CONFLICT (email) DO NOTHING
  `;

  // Generate magic link for email fallback login
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for first login

  await sql`
    INSERT INTO auth_magic_links (email, token_hash, expires_at, redirect_to)
    VALUES (${email}, ${tokenHash}, ${expiresAt}, ${'/portal/my-templates'})
  `;

  return { portalLoginUrl: `${siteUrl}/api/auth/verify-magic-link?token=${token}&redirectTo=/portal/my-templates`, isNewAccount: true };
}

// ── Delivery Email ────────────────────────────────────────────────────

async function sendTemplateDeliveryEmail(data: {
  buyerEmail: string;
  buyerName: string;
  templateName: string;
  plan: string;
  downloadToken: string;
  amount: string;
  portalLoginUrl: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const downloadUrl = `${siteUrl}/api/templates/download?token=${data.downloadToken}`;
  const planLabel = data.plan.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return sendEmail({
    to: data.buyerEmail,
    subject: `Your Template is Ready — ${data.templateName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0891B2 0%, #06B6D4 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">📦</div>
          <h1 style="color: white; margin: 0; font-size: 22px;">Your Template is Ready!</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">Hi ${escapeHtml(data.buyerName)},</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Thank you for purchasing <strong>${escapeHtml(data.templateName)}</strong>. Your template source code is ready for download.
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #0891B2, #06B6D4); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 18px;">
              Download Your Template
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">This link expires in 72 hours</p>
          </div>

          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #0f172a; margin: 0 0 16px 0; font-size: 16px;">Purchase Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Template:</td><td style="padding: 8px 0; color: #0f172a; font-weight: 500; text-align: right;">${escapeHtml(data.templateName)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Tier:</td><td style="padding: 8px 0; color: #0f172a; text-align: right;">${escapeHtml(planLabel)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Amount Paid:</td><td style="padding: 8px 0; color: #059669; font-weight: 600; text-align: right;">$${escapeHtml(data.amount)}</td></tr>
            </table>
          </div>

          <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #0f172a; margin: 0 0 8px 0; font-size: 15px;">🔑 Access Your Templates Anytime</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">
              We've set up an account for you. You can re-download your template anytime from your portal — even if this email link expires.
            </p>
            <a href="${data.portalLoginUrl}" style="display: inline-block; background: #0B1B3A; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Login to My Templates
            </a>
          </div>

          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 15px;">Getting Started</h3>
            <ol style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Unzip the downloaded file</li>
              <li>Run <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">npm install</code> to install dependencies</li>
              <li>Run <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">npm run dev</code> to start developing</li>
              <li>Deploy to Vercel, Netlify, or any Node.js host</li>
            </ol>
          </div>

          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 24px;">
            Need help? Just reply to this email.<br><br>
            Best regards,<br>
            <strong style="color: #0f172a;">The StrataLanding Team</strong>
          </p>
        </div>
        <div style="text-align: center; padding: 20px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">StrataLanding — Premium Landing Pages</p>
        </div>
      </div>
    `,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatTemplateName(templateId: string): string {
  return templateId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
