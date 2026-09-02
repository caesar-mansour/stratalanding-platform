import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email-transport';

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const affiliates = await sql`
      SELECT
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rc.id,
              'commission_cents', rc.commission_cents,
              'status', rc.status,
              'created_at', rc.created_at,
              'paid_at', rc.paid_at,
              'project_id', rc.project_id,
              'company_name', (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = rc.project_id LIMIT 1),
              'package', (SELECT p.package FROM projects p WHERE p.id = rc.project_id LIMIT 1)
            )
          ) FILTER (WHERE rc.id IS NOT NULL),
          '[]'
        ) as conversions
      FROM affiliates a
      LEFT JOIN referral_conversions rc ON rc.affiliate_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;

    return NextResponse.json({ affiliates });
  } catch (error) {
    console.error('Admin affiliates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { affiliateId, status, conversionId, markPaid } = body;

    // Mark conversion as paid
    if (conversionId && markPaid) {
      const [conversion] = await sql`
        SELECT affiliate_id, commission_cents FROM referral_conversions WHERE id = ${conversionId} LIMIT 1
      `;
      if (!conversion) {
        return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
      }
      await sql`
        UPDATE referral_conversions
        SET status = 'paid', paid_at = NOW()
        WHERE id = ${conversionId}
      `;
      await sql`
        UPDATE affiliates
        SET total_paid_cents = total_paid_cents + ${conversion.commission_cents}
        WHERE id = ${conversion.affiliate_id}
      `;
      return NextResponse.json({ success: true });
    }

    // Update affiliate status
    if (affiliateId && status) {
      const validStatuses = ['pending', 'active', 'paused', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const [prior] = await sql`
        SELECT name, email, referral_code, status FROM affiliates WHERE id = ${affiliateId} LIMIT 1
      `;
      await sql`
        UPDATE affiliates SET status = ${status}, updated_at = NOW()
        WHERE id = ${affiliateId}
      `;

      // Transition emails: pending→active (approval), paused→active (reactivation), active→paused (pause)
      if (prior && prior.status !== status && process.env.GMAIL_REFRESH_TOKEN) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratalanding.com';
        const firstName = (prior.name || '').trim().split(' ')[0] || 'Partner';
        const refLink = `${siteUrl}?ref=${prior.referral_code}`;
        const domain = siteUrl.replace(/^https?:\/\//, '');

        type Variant = {
          subject: string;
          heading: string;
          subheading: string;
          body: string;
          ctaLabel: string;
          ctaUrl: string;
          showCode: boolean;
        };

        let variant: Variant | null = null;

        if (prior.status === 'pending' && status === 'active') {
          variant = {
            subject: `You're in — StrataLanding Partner access activated`,
            heading: `You're in, ${firstName}.`,
            subheading: `Your StrataLanding Partner account is now active.`,
            body: `Your application is approved and your referral link is live. Share it anywhere — every paid project that comes through earns you 20% commission, paid via PayPal.`,
            ctaLabel: 'Open Partner Portal',
            ctaUrl: `${siteUrl}/partner-portal`,
            showCode: true,
          };
        } else if (prior.status === 'paused' && status === 'active') {
          variant = {
            subject: `Your StrataLanding Partner account is active again`,
            heading: `Welcome back, ${firstName}.`,
            subheading: `Your account has been reactivated.`,
            body: `Your referral link is tracking again. Any clicks or conversions from here on count toward your commission.`,
            ctaLabel: 'Open Partner Portal',
            ctaUrl: `${siteUrl}/partner-portal`,
            showCode: true,
          };
        } else if (prior.status === 'active' && status === 'paused') {
          variant = {
            subject: `Your StrataLanding Partner account has been paused`,
            heading: `Heads up, ${firstName}.`,
            subheading: `Your partner account is paused.`,
            body: `Your referral link won't track new clicks or conversions while paused. Any commissions already earned stay yours. If this is a surprise, just reply — we'll sort it out.`,
            ctaLabel: 'View Partner Portal',
            ctaUrl: `${siteUrl}/partner-portal`,
            showCode: false,
          };
        }

        if (variant) {
          const codeBlock = variant.showCode ? `
                <div style="background: rgba(8,145,178,0.1); border: 1px solid rgba(8,145,178,0.3); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 28px;">
                  <p style="color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Your Referral Code</p>
                  <p style="color: #22D3EE; font-size: 36px; font-weight: 800; letter-spacing: 3px; margin: 0 0 12px;">${prior.referral_code}</p>
                  <p style="color: #64748B; font-size: 13px; margin: 0;">
                    <a href="${refLink}" style="color: #0891B2; text-decoration: none;">${domain}?ref=${prior.referral_code}</a>
                  </p>
                </div>` : '';

          sendEmail({
            to: prior.email,
            subject: variant.subject,
            html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #0B1120;">
              <div style="background: linear-gradient(135deg, #0B1B3A 0%, #122548 50%, #0891B2 100%); padding: 48px 32px; text-align: center;">
                <h1 style="color: #F8FAFC; margin: 0 0 8px; font-size: 28px;">${variant.heading}</h1>
                <p style="color: #94A3B8; margin: 0; font-size: 15px;">${variant.subheading}</p>
              </div>
              <div style="padding: 32px;">
                <p style="color: #CBD5E1; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                  ${variant.body}
                </p>${codeBlock}
                <div style="text-align: center; margin: 0 0 32px;">
                  <a href="${variant.ctaUrl}"
                     style="display: inline-block; background: linear-gradient(135deg, #0891B2, #22D3EE); color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">
                    ${variant.ctaLabel}
                  </a>
                </div>
                <p style="color: #64748B; font-size: 12px; line-height: 1.6; margin: 0;">
                  Questions? Just reply to this email.
                </p>
              </div>
              <div style="text-align: center; padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06);">
                <p style="color: #475569; font-size: 11px; margin: 0;">StrataLanding Partner Program</p>
              </div>
            </div>
          `,
          }).catch(err => console.error(`Affiliate ${prior.status}->${status} email failed:`, err));
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Admin affiliates PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliateId');

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId required' }, { status: 400 });
    }

    await sql`UPDATE affiliates SET status = 'rejected', updated_at = NOW() WHERE id = ${affiliateId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin affiliates DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
