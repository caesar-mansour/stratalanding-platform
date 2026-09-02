import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmail } from '@/lib/email-transport';
import { escapeHtml } from '@/lib/html-utils';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { proposalPublicUrl } from '@/lib/proposal-token';

// Cron job: Send reminder emails for unpaid proposals (3 days old)
export async function GET(request: NextRequest) {
  // Verify cron secret (timing-safe)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find proposals that are "sent" status, not expired, and were sent 3+ days ago
    const staleProposals = await sql`
      SELECT p.*, pr.id as project_id
      FROM proposals p
      LEFT JOIN projects pr ON pr.id = p.project_id
      WHERE p.status = 'sent'
        AND p.valid_until > NOW()
        AND p.created_at < NOW() - INTERVAL '3 days'
        AND p.created_at > NOW() - INTERVAL '7 days'
    `;

    if (!staleProposals || staleProposals.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sentCount = 0;

    for (const proposal of staleProposals) {
      try {
        const proposalUrl = proposalPublicUrl(proposal.id); // signed token (audit F53)
        const validDate = new Date(proposal.valid_until).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });

        await sendEmail({
          to: proposal.client_email,
          subject: `Reminder: Your Proposal for ${proposal.company_name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0891B2 0%, #06B6D4 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Your Proposal is Waiting</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
                  Hi ${escapeHtml(proposal.client_name)},
                </p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                  Just a friendly reminder — your proposal for <strong>${escapeHtml(proposal.company_name)}</strong> is still available. We'd love to get started on your project!
                </p>
                <p style="color: #94a3b8; font-size: 14px;">
                  This proposal expires on ${validDate}.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${proposalUrl}" style="display: inline-block; background: #0891B2; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    View Proposal
                  </a>
                </div>
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 24px;">
                  Questions? Just reply to this email.<br><br>
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

        sentCount++;
        console.log(`Reminder sent for proposal ${proposal.id}`); // audit F65: no PII in logs
      } catch (err) {
        console.error(`Failed to send reminder for proposal ${proposal.id}:`, err);
      }
    }

    return NextResponse.json({ sent: sentCount });
  } catch (error) {
    console.error('Send reminders cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
