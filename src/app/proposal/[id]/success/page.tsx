import sql from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Proposal } from '@/lib/types';
import { PROPOSAL_UUID_RE } from '@/lib/proposal-payment';
import { isProposalCallerAuthorized } from '@/lib/proposal-payment-auth';
import CaptureAndConfirm from './CaptureAndConfirm';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; t?: string; PayerID?: string }>;
}

/**
 * PayPal's return_url for a proposal deposit.
 *
 * AUDIT 2026-08-12 — P0-4/P0-5. This page used to mutate the database on a plain GET: it flipped
 * the proposal to `accepted` and, in one branch, inserted a project at `status = 'deposit_paid'`,
 * with no auth, no UUID guard and no payment check. Any crawler, link-prefetcher or mailbox
 * scanner that touched the URL minted a fully-unlocked "paying" client for free AND permanently
 * locked the real buyer out (create-payment then 400s on "already accepted"). It also rendered
 * "Payment Successful — Deposit Received $X" while the studio had been paid nothing, because the
 * redirect flow never captured the order.
 *
 * It is now READ-ONLY. It performs no writes. The capture is done by an explicit POST to
 * /api/proposals/[id]/capture-payment (see CaptureAndConfirm), and what this page displays is
 * derived from a real `payments` row — never from the fact that a browser reached this URL.
 */
export default async function PaymentSuccessPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token, t } = await searchParams;

  if (!PROPOSAL_UUID_RE.test(id)) notFound();

  const [proposal] = await sql`
    SELECT * FROM proposals WHERE id = ${id} LIMIT 1
  `;
  if (!proposal) notFound();

  // Same three-way gate as the proposal page — don't even confirm the id exists otherwise.
  if (!(await isProposalCallerAuthorized(id, proposal.client_email as string, t))) {
    notFound();
  }

  // Has a real, recorded deposit landed for this proposal's project?
  let depositPaid = false;
  if (proposal.project_id) {
    const [payment] = await sql`
      SELECT id FROM payments
      WHERE project_id = ${proposal.project_id} AND type = 'deposit'
      LIMIT 1
    `;
    depositPaid = !!payment;
  }

  return (
    <CaptureAndConfirm
      proposal={proposal as unknown as Proposal}
      orderId={typeof token === 'string' ? token : null}
      proposalToken={typeof t === 'string' ? t : null}
      depositAlreadyRecorded={depositPaid}
    />
  );
}
