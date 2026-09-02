import { getProposalPrice, type Proposal } from '@/lib/types';

/**
 * Shared primitives for the proposal → deposit payment path.
 *
 * AUDIT 2026-08-12 (P0-2/3/4/5, P1 "two sources of truth for price"): order creation and capture
 * validation used to derive the charged amount from different places, and the return URL mutated
 * state on a plain GET. Everything on that path now funnels through this module so the amount
 * that is charged, the amount that is validated, and the amount shown in the UI cannot diverge.
 */

// `proposals.id` is a uuid column — reject garbage before it reaches Postgres (a non-uuid string
// throws "invalid input syntax for uuid", i.e. a 500 where a 404 belongs, and wakes Neon).
export const PROPOSAL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * THE authoritative deposit amount for a proposal, in cents (50% of the proposal total).
 *
 * Single source of truth. `create-payment` charges this, `capture-payment` validates against this,
 * and ProposalView displays this. An order can therefore never be created for one amount and
 * accepted against another.
 */
export function proposalDepositCents(proposal: Pick<Proposal, 'custom_price_cents' | 'package'>): number {
  const totalCents = getProposalPrice(proposal as Proposal);
  return Math.round(totalCents / 2);
}

export type CaptureLike = {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
  custom_id?: string;
} | null;

export type CaptureVerdict =
  | { ok: true; capturedCents: number; captureId: string }
  | { ok: false; reason: 'not-completed' | 'wrong-project' | 'wrong-type' | 'wrong-currency' | 'short-amount'; detail: string };

/**
 * THE gate. Pure, so every adversarial case is directly testable (tests/payment-capture.test.ts).
 *
 * Returns ok:true only when real money of the right size, in the right currency, bound to the
 * right project, has actually moved. Nothing about a redirect, a query parameter, or the fact that
 * a browser reached a URL can produce ok:true.
 */
export function verifyDepositCapture(
  capture: CaptureLike,
  expected: { projectId: string; expectedCents: number; fallbackCaptureId: string },
): CaptureVerdict {
  if (!capture || capture.status !== 'COMPLETED') {
    return { ok: false, reason: 'not-completed', detail: `status=${capture?.status ?? 'NONE'}` };
  }

  let meta: { project_id?: string; payment_type?: string } = {};
  try {
    meta = JSON.parse(capture.custom_id || '{}');
  } catch {
    meta = {};
  }

  if (meta.project_id !== expected.projectId) {
    return { ok: false, reason: 'wrong-project', detail: `custom_id project=${meta.project_id ?? 'none'}` };
  }
  if (meta.payment_type !== 'deposit') {
    return { ok: false, reason: 'wrong-type', detail: `payment_type=${meta.payment_type ?? 'none'}` };
  }

  const currency = String(capture.amount?.currency_code || '').toUpperCase();
  if (currency !== 'USD') {
    return { ok: false, reason: 'wrong-currency', detail: currency || 'none' };
  }

  const capturedCents = Math.round(parseFloat(capture.amount?.value || '0') * 100);
  if (!expected.expectedCents || capturedCents < expected.expectedCents) {
    return {
      ok: false,
      reason: 'short-amount',
      detail: `captured=${capturedCents} expected=${expected.expectedCents}`,
    };
  }

  return { ok: true, capturedCents, captureId: capture.id || expected.fallbackCaptureId };
}
