'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Proposal } from '@/lib/types';
import { formatPrice } from '@/lib/types';
import { proposalDepositCents } from '@/lib/proposal-payment';
import { trackPurchase } from '@/lib/analytics';
import PaymentSuccess from './PaymentSuccess';

type Phase = 'capturing' | 'paid' | 'failed' | 'no-payment';

/**
 * Drives the deposit capture from PayPal's return, then renders the real outcome.
 *
 * AUDIT 2026-08-12 — P0-3/P0-4/P0-5. The success screen is no longer reachable by simply loading a
 * URL. It renders "paid" only when the server confirms a recorded `payments` row, which in turn
 * only exists after a PayPal-verified COMPLETED capture of the correct amount.
 *
 * Adversarial cases handled here:
 *  - direct URL access / crawler / SafeLinks with no `?token=` → 'no-payment', nothing mutated
 *  - refresh after a successful capture → server already reports depositAlreadyRecorded → 'paid'
 *  - double-click / multiple tabs → `didRun` guard + server-side ON CONFLICT idempotency
 *  - cancelled or failed payment → explicit failure state with a way forward
 */
export default function CaptureAndConfirm({
  proposal,
  orderId,
  proposalToken,
  depositAlreadyRecorded,
}: {
  proposal: Proposal;
  orderId: string | null;
  proposalToken: string | null;
  depositAlreadyRecorded: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(
    depositAlreadyRecorded ? 'paid' : orderId ? 'capturing' : 'no-payment',
  );
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  // StrictMode double-invokes effects in dev, and a fast double-click can race — capture once.
  const didRun = useRef(false);

  useEffect(() => {
    if (depositAlreadyRecorded || !orderId || didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/proposals/${proposal.id}/capture-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, t: proposalToken }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          // AUDIT 2026-08-12 (P2): trackPurchase had ZERO call sites, so no revenue event ever
          // fired and the acquisition->purchase funnel could not be reconstructed. Fire it ONLY on
          // a server-confirmed capture, and only when this run actually recorded the payment
          // (data.alreadyRecorded guards a refresh from double-counting revenue).
          if (!data.alreadyRecorded) {
            try {
              trackPurchase(
                proposal.package as 'starter' | 'growth' | 'scale',
                (data.amountCents ?? 0) / 100,
              );
            } catch { /* never let analytics break the success screen */ }
          }
          setPhase('paid');
          return;
        }
        if (data.capturedButNotRecorded) setReference(data.reference ?? null);
        setError(data.error || 'We could not confirm your payment.');
        setPhase('failed');
      } catch {
        setError('We could not reach our server to confirm your payment.');
        setPhase('failed');
      }
    })();
  }, [orderId, proposal.id, proposalToken, depositAlreadyRecorded]);

  if (phase === 'paid') return <PaymentSuccess proposal={proposal} />;

  const deposit = formatPrice(proposalDepositCents(proposal));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="max-w-lg w-full text-center space-y-6 py-16">
        {phase === 'capturing' && (
          <>
            <div
              className="w-12 h-12 mx-auto rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"
              role="status"
              aria-label="Confirming your payment"
            />
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Confirming your payment…
            </h1>
            <p className="text-[var(--text-muted)]">
              Please don&apos;t close this tab. This usually takes a few seconds.
            </p>
          </>
        )}

        {phase === 'no-payment' && (
          <>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              No payment to confirm
            </h1>
            <p className="text-[var(--text-muted)]">
              We haven&apos;t received a deposit for this proposal yet. If you meant to pay the{' '}
              {deposit} deposit, head back to your proposal and choose{' '}
              <span className="whitespace-nowrap">&ldquo;Accept &amp; Pay Deposit&rdquo;</span>.
            </p>
            <Link
              href={`/proposal/${proposal.id}${proposalToken ? `?t=${encodeURIComponent(proposalToken)}` : ''}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-[var(--accent)] text-white"
            >
              Back to your proposal
            </Link>
          </>
        )}

        {phase === 'failed' && (
          <>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              We couldn&apos;t confirm your payment
            </h1>
            <p className="text-[var(--text-muted)]">{error}</p>
            {reference && (
              <p className="text-sm text-[var(--text-muted)]">
                Reference: <code className="font-mono">{reference}</code> — please include this if
                you contact us.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href={`/proposal/${proposal.id}${proposalToken ? `?t=${encodeURIComponent(proposalToken)}` : ''}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-[var(--accent)] text-white"
              >
                Back to your proposal
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border border-[var(--accent)]/30 text-[var(--text-primary)]"
              >
                Contact us
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
