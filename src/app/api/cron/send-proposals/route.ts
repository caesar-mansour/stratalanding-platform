import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendProposalToClient } from '@/lib/email';
import { packagePricing, type PackageType } from '@/lib/types';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { proposalPublicUrl } from '@/lib/proposal-token';

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

  // AUDIT 2026-08-12 (P2): CLAIM the rows atomically instead of selecting them.
  //
  // This was a plain SELECT ... WHERE status = 'pending', with the row only marked 'sent' ~90
  // lines later after the email had gone out. Two overlapping runs — or one slow run still
  // sending while the next fires — both saw the same pending rows and both emailed the prospect
  // the same proposal. That was survivable while nothing invoked this route; it is not now that
  // it runs every 15 minutes (netlify/functions/cron-send-proposals.mts).
  //
  // A single UPDATE ... RETURNING flips the row to 'sending' and hands it to exactly one caller.
  // A row left in 'sending' means that run died mid-flight — visible, and deliberately not
  // auto-retried, because the failure mode to avoid here is emailing a prospect twice.
  const dueProposals = await sql`
    UPDATE scheduled_proposals
    SET status = 'sending'
    WHERE id IN (
      SELECT id FROM scheduled_proposals
      WHERE status = 'pending' AND send_at <= ${new Date().toISOString()}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;

  if (!dueProposals || dueProposals.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sentCount = 0;

  for (const scheduled of dueProposals) {
    try {
      // Look for existing draft proposal (created at brief submission)
      const [existingProposal] = await sql`
        SELECT * FROM proposals
        WHERE project_id = ${scheduled.project_id} AND status = 'draft'
        LIMIT 1
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let proposal: any;
      let proposalUrl: string;

      if (existingProposal) {
        // Use existing draft — just mark it as sent with fresh validity
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        await sql`
          UPDATE proposals SET status = 'sent', valid_until = ${validUntil.toISOString()}
          WHERE id = ${existingProposal.id}
        `;
        proposal = { ...existingProposal, valid_until: validUntil.toISOString() };
        proposalUrl = existingProposal.deposit_payment_url || proposalPublicUrl(existingProposal.id);
      } else {
        // Fallback: create new proposal if no draft exists (legacy scheduled_proposals rows)
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        const proposalNote = `Thank you for your interest, ${scheduled.client_name}! We've reviewed your brief for ${scheduled.company_name} and put together this proposal based on your requirements. Everything is fixed-scope and fixed-price — no surprises. Once you accept and pay the deposit, we'll get started right away. You'll have direct chat access to our team through your client portal.`;

        const [newProposal] = await sql`
          INSERT INTO proposals (
            client_name, client_email, company_name, package,
            custom_price_cents, notes, valid_until, deposit_payment_url,
            status, project_id
          ) VALUES (
            ${scheduled.client_name}, ${scheduled.client_email}, ${scheduled.company_name},
            ${scheduled.package}, ${null}, ${proposalNote},
            ${validUntil.toISOString()}, ${null}, 'sent', ${scheduled.project_id}
          ) RETURNING *
        `;

        if (!newProposal) {
          console.error(`Failed to create proposal for ${scheduled.client_email}`);
          continue;
        }

        // AUDIT 2026-08-12 (P0-2): the proposal URL is for the EMAIL only — writing it into
        // `deposit_payment_url` makes create-payment hand it back as the PayPal approval URL,
        // which reloads the proposal page instead of charging the deposit.
        proposalUrl = proposalPublicUrl(newProposal.id);
        proposal = newProposal;
      }

      // Update project status
      await sql`
        UPDATE projects SET status = 'proposal_sent'
        WHERE id = ${scheduled.project_id} AND status = 'new'
      `;

      // Send proposal email
      const totalPrice = packagePricing[scheduled.package as PackageType] / 100;
      await sendProposalToClient({
        clientName: scheduled.client_name,
        clientEmail: scheduled.client_email,
        companyName: scheduled.company_name,
        packageType: scheduled.package,
        totalPrice,
        depositAmount: totalPrice / 2,
        proposalId: proposal.id,
        validUntil: proposal.valid_until,
        notes: proposal.notes,
        depositPaymentUrl: proposalUrl,
      });

      // Mark scheduled row as sent
      await sql`
        UPDATE scheduled_proposals SET status = 'sent'
        WHERE id = ${scheduled.id}
      `;

      sentCount++;
      console.log(`Auto-proposal sent (project: ${scheduled.project_id})`); // audit F65: no PII in logs
    } catch (err) {
      console.error(`Error processing scheduled proposal ${scheduled.id}:`, err);
    }
  }

  return NextResponse.json({ sent: sentCount });
}
