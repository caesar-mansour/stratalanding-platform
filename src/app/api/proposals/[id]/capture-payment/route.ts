import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { capturePayPalOrderIdempotent, extractCapture } from '@/lib/paypal';
import { withProtection } from '@/lib/security/with-protection';
import {
  PROPOSAL_UUID_RE,
  proposalDepositCents,
  verifyDepositCapture,
} from '@/lib/proposal-payment';
import { isProposalCallerAuthorized } from '@/lib/proposal-payment-auth';
import { sendPortalAccessLink } from '@/lib/portal-access';

/**
 * Capture the deposit for a proposal and, ONLY on a verified successful capture, advance state.
 *
 * AUDIT 2026-08-12 — P0-3/P0-4/P0-5. Previously the PayPal redirect flow never called capture at
 * all, and `/proposal/[id]/success` marked the proposal accepted (and minted a `deposit_paid`
 * project) on a plain unauthenticated GET. A crawler, an Outlook SafeLinks scan, or anyone with
 * the URL could fabricate a paid client while the studio received $0.
 *
 * INVARIANT ENFORCED HERE:
 *   No transition to proposal `accepted`, `projects.status = 'deposit_paid'`, or paid portal
 *   access may occur without a PayPal-verified capture of the correct amount and currency,
 *   bound to this exact proposal's project.
 *
 * Every state change is downstream of `captureInfo.status === 'COMPLETED'` and an amount check
 * against the server-computed price. Nothing here trusts a query parameter, a redirect, or the
 * mere fact that a browser reached a URL.
 */
export const POST = withProtection(postHandler, {
  name: 'proposal-capture',
  rateLimit: { max: 15, windowSeconds: 3600 },
});

async function postHandler(
  request: Request,
  ctx: { params?: Promise<Record<string, string>> },
) {
  const proposalId = (await ctx.params)?.id ?? '';
  if (!PROPOSAL_UUID_RE.test(proposalId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { orderId?: unknown; t?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const token = typeof body.t === 'string' ? body.t : null;

  // PayPal order ids are short alphanumeric tokens; anything else is not worth an upstream call.
  if (!orderId || !/^[A-Z0-9-]{6,64}$/i.test(orderId)) {
    return NextResponse.json({ error: 'A valid PayPal order id is required' }, { status: 400 });
  }

  const [proposal] = await sql`
    SELECT id, status, package, custom_price_cents, project_id, client_email, valid_until
    FROM proposals WHERE id = ${proposalId} LIMIT 1
  `;
  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Same gate as the proposal page: signed email token, admin, or the owning client.
  if (!(await isProposalCallerAuthorized(proposalId, proposal.client_email as string, token))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!proposal.project_id) {
    return NextResponse.json({ error: 'No project linked to this proposal' }, { status: 400 });
  }

  // ── Capture (idempotent: an already-captured order reads back rather than erroring) ──────────
  let captured;
  try {
    captured = await capturePayPalOrderIdempotent(orderId);
  } catch (err) {
    console.error('PayPal capture failed for proposal', proposalId, err);
    return NextResponse.json(
      { error: 'We could not complete the payment with PayPal. You have not been charged twice — please try again or contact us.' },
      { status: 502 },
    );
  }

  const captureInfo = extractCapture(captured.order as Record<string, unknown>);

  // ── Verification gate. Everything below this point requires REAL money to have moved. ────────
  // Pure and shared so every adversarial case is covered by tests/payment-capture.test.ts.
  const verdict = verifyDepositCapture(captureInfo, {
    projectId: proposal.project_id as string,
    expectedCents: proposalDepositCents(proposal as never),
    fallbackCaptureId: orderId,
  });

  if (!verdict.ok) {
    console.error('Deposit capture rejected', { proposalId, reason: verdict.reason, detail: verdict.detail });
    const status = verdict.reason === 'not-completed' ? 402 : 409;
    const message =
      verdict.reason === 'not-completed'
        ? 'Payment was not completed.'
        : verdict.reason === 'short-amount'
          ? 'Payment amount did not match the proposal.'
          : verdict.reason === 'wrong-currency'
            ? 'Unexpected payment currency.'
            : 'This payment does not belong to this proposal.';
    return NextResponse.json({ error: message, reason: verdict.reason }, { status });
  }

  const { capturedCents, captureId } = verdict;
  const currency = String(captureInfo?.amount?.currency_code || 'USD').toUpperCase();

  // ── Record + advance, atomically. ────────────────────────────────────────────────────────────
  // The INSERT ... ON CONFLICT (paypal_capture_id) is the idempotency gate, shared with the
  // signature-verified webhook and the portal capture route. It makes duplicate webhooks, a page
  // refresh, a double-click and multiple tabs all converge on exactly one payments row.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alreadyRecorded = await sql.begin(async (tx: any) => {
      const [inserted] = await tx`
        INSERT INTO payments (project_id, type, amount_cents, currency, paypal_payment_status, paypal_capture_id)
        VALUES (${proposal.project_id}, 'deposit', ${capturedCents}, ${currency.toLowerCase()}, ${captureInfo?.status ?? 'COMPLETED'}, ${captureId})
        ON CONFLICT (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL DO NOTHING
        RETURNING id
      `;

      if (!inserted) return true; // this capture was already processed — nothing more to do

      // Deposit only advances a project that is genuinely awaiting one (audit F60).
      await tx`
        UPDATE projects SET status = 'deposit_paid'
        WHERE id = ${proposal.project_id} AND status = 'proposal_sent'
      `;

      await tx`
        UPDATE proposals
        SET status = 'accepted', accepted_at = ${new Date().toISOString()}
        WHERE id = ${proposalId} AND status <> 'accepted'
      `;

      return false;
    });

    // AUDIT 2026-08-12 (P1 U-03): the success screen promises "we'll send you a magic link to
    // access your client portal" and nothing ever sent one. Send it for real, but only on the run
    // that actually recorded the payment, so a refresh or a duplicate webhook doesn't re-send.
    // Never blocks or fails the payment response — the money is already recorded at this point.
    if (!alreadyRecorded && proposal.client_email) {
      void sendPortalAccessLink(proposal.client_email as string);
    }

    return NextResponse.json({
      success: true,
      alreadyRecorded,
      amountCents: capturedCents,
      captureId,
    });
  } catch (err) {
    // A DB failure AFTER PayPal took the money must be loud, never a silent 200 (audit P0-1).
    console.error(
      `CRITICAL: captured PayPal payment ${captureId} for proposal ${proposalId} but failed to record it`,
      err,
    );
    return NextResponse.json(
      {
        error: 'Your payment was received but we could not finish setting up your project. Please contact us and quote this reference.',
        reference: captureId,
        capturedButNotRecorded: true,
      },
      { status: 500 },
    );
  }
}
