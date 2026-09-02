import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createPayPalOrder } from '@/lib/paypal';
import type { PackageType } from '@/lib/types';
import { withProtection } from '@/lib/security/with-protection';
import { PROPOSAL_UUID_RE } from '@/lib/proposal-payment';

/**
 * True only for an off-site payment link. A same-origin URL (or anything unparseable) is rejected,
 * so the proposal page can never masquerade as its own payment link (audit 2026-08-12 P0-2).
 */
function isExternalPaymentUrl(url: string): boolean {
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:') return false;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site && target.host === new URL(site).host) return false;
    return true;
  } catch {
    return false;
  }
}

// SECURITY (audit L-proposals-auth): this route is guarded only by the unguessable proposal UUID
// and previously had NO rate limit — cap it per-IP + add the CSRF/Origin guard so a leaked
// proposal link can't be abused to spin up PayPal orders / disclose the deposit URL at volume.
// The charged amount is derived server-side, so no price tampering is possible.
export const POST = withProtection(postHandler, { name: 'proposal-pay', rateLimit: { max: 10, windowSeconds: 3600 } });

async function postHandler(
  request: Request,
  ctx: { params?: Promise<Record<string, string>> }
) {
  const proposalId = (await ctx.params)?.id ?? '';
  if (!PROPOSAL_UUID_RE.test(proposalId)) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // The prospect arrives from an emailed link and is not logged in, so the signed proposal token
  // travels with the request and is threaded into the return URL for the capture step.
  let proposalToken: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.t === 'string') proposalToken = body.t;
  } catch {
    /* no body is fine — an authenticated owner or admin doesn't need the token */
  }

  // Fetch proposal
  const [proposal] = await sql`
    SELECT * FROM proposals WHERE id = ${proposalId} LIMIT 1
  `;

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.status === 'accepted') {
    return NextResponse.json({ error: 'Proposal already accepted' }, { status: 400 });
  }

  if (new Date(proposal.valid_until) < new Date()) {
    return NextResponse.json({ error: 'Proposal has expired' }, { status: 400 });
  }

  // A pre-set EXTERNAL deposit link (e.g. a PayPal.me URL an admin pasted in) is used directly.
  // AUDIT 2026-08-12 (P0-2): this must never match a same-origin URL. The generator used to store
  // the proposal's own page URL here, so every proposal short-circuited and "Accept & Pay Deposit"
  // navigated back to the proposal page — a reload loop that made deposits impossible to collect.
  if (proposal.deposit_payment_url && isExternalPaymentUrl(proposal.deposit_payment_url)) {
    return NextResponse.json({ approvalUrl: proposal.deposit_payment_url });
  }

  if (!proposal.project_id) {
    return NextResponse.json({ error: 'No project linked to this proposal' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const returnQs = proposalToken ? `?t=${encodeURIComponent(proposalToken)}` : '';

  try {
    const order = await createPayPalOrder({
      projectId: proposal.project_id,
      packageType: proposal.package as PackageType,
      paymentType: 'deposit',
      // Single source of truth with the capture step (src/lib/proposal-payment.ts): the order is
      // created for exactly the amount capture-payment will validate against.
      customPriceCents: proposal.custom_price_cents ?? undefined,
      returnUrl: `${baseUrl}/proposal/${proposalId}/success${returnQs}`,
      cancelUrl: `${baseUrl}/proposal/${proposalId}${returnQs ? `${returnQs}&` : '?'}cancelled=true`,
    });

    const approvalUrl = order.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve'
    )?.href;

    if (!approvalUrl) {
      console.error('No approval URL in PayPal response:', order);
      return NextResponse.json(
        { error: 'Failed to get payment URL from PayPal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ approvalUrl });
  } catch (err) {
    console.error('Failed to create PayPal order:', err);
    return NextResponse.json(
      { error: 'Failed to create payment. Please try again.' },
      { status: 500 }
    );
  }
}
