'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GradientText, SuccessCheck } from '@/app/portal/components/portal-ui';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => {
        render: (container: HTMLElement) => Promise<void>;
      };
    };
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId') || '';
  const paymentType = (searchParams.get('type') || 'deposit') as 'deposit' | 'final';

  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setStatus('error');
      setError('Missing project information.');
      return;
    }

    let cancelled = false;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setStatus('error');
      setError('Payment system not configured.');
      return;
    }

    const existing = document.getElementById('paypal-sdk');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&disable-funding=venmo,paylater,credit`;
    script.async = true;

    script.onload = () => {
      if (cancelled || !containerRef.current || !window.paypal) return;

      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          shape: 'rect',
          label: 'pay',
          height: 48,
          tagline: false,
        },

        createOrder: async () => {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, paymentType }),
          });
          const data = await res.json();
          if (!res.ok) {
            setStatus('error');
            setError(data.error || 'Failed to create order');
            throw new Error(data.error || 'Failed to create order');
          }
          return data.orderId;
        },

        onApprove: async (data: { orderID: string }) => {
          if (cancelled) return;
          setStatus('processing');

          try {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID }),
            });

            if (res.ok) {
              setStatus('success');
              setTimeout(() => router.push('/portal'), 3000);
            } else {
              const captureData = await res.json();
              setStatus('error');
              setError(captureData.error?.message || captureData.error || 'Payment capture failed');
            }
          } catch {
            setStatus('error');
            setError('Failed to process payment.');
          }
        },

        onCancel: () => {
          if (!cancelled) router.push('/portal');
        },

        onError: (err: Error) => {
          if (cancelled) return;
          console.error('PayPal error:', err);
          setStatus('error');
          setError('Something went wrong. Please try again.');
        },
      }).render(containerRef.current);

      if (!cancelled) setStatus('ready');
    };

    script.onerror = () => {
      if (!cancelled) {
        setStatus('error');
        setError('Failed to load payment system.');
      }
    };

    document.head.appendChild(script);
    return () => { cancelled = true; };
  }, [projectId, paymentType, router]);

  const isDeposit = paymentType === 'deposit';

  // AUDIT 2026-08-12 (P2): the page never showed the amount. Read it from the server, which uses
  // the same amountDueCents() that creates and validates the order, so the number on screen cannot
  // drift from the number charged.
  const [dueCents, setDueCents] = useState<number | null>(null);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/portal/amount-due?projectId=${encodeURIComponent(projectId)}&type=${paymentType}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && typeof d.dueCents === 'number') setDueCents(d.dueCents); })
      .catch(() => { /* the figure is informational; never block checkout on it */ });
    return () => { cancelled = true; };
  }, [projectId, paymentType]);

  return (
    <motion.div
      className="max-w-lg mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back link */}
      <motion.div variants={itemVariants}>
        <Link
          href="/portal"
          className="group inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-[var(--color-accent)] transition-colors mb-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
        >
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </motion.div>

      {/* Main Checkout Card */}
      <motion.div
        className="relative rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md overflow-hidden shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18),inset_0_1px_0_0_rgba(255,255,255,0.7)]"
        variants={itemVariants}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />

        {/* Header */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl grid place-items-center">
              <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                <GradientText>{isDeposit ? 'Pay Deposit' : 'Final Payment'}</GradientText>
              </h1>
              <p className="text-sm text-text-muted">
                {isDeposit ? '50% upfront to begin your project' : '50% remaining to launch your site'}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Payment Info Summary */}
        <div className="px-6 py-4 bg-[var(--color-accent)]/[0.03]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">
                {isDeposit ? 'Deposit (50%)' : 'Final Balance'}
              </span>
              <span className="text-base font-semibold text-text-primary">
                {dueCents === null
                  ? '—'
                  : `$${(dueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-medium rounded-full">
                {isDeposit ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Payment Methods */}
        <div className="p-6">
          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center py-10">
              <div className="w-9 h-9 border-[3px] border-gray-200 border-t-[var(--color-accent)] rounded-full animate-spin mb-3" />
              <p className="text-sm text-text-muted">Loading payment options...</p>
            </div>
          )}

          {/* Ready label */}
          {status === 'ready' && (
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">Choose a payment method</p>
          )}

          {/* PayPal buttons */}
          <div ref={containerRef} style={{ display: status === 'ready' ? 'block' : 'none' }} />

          {/* Processing */}
          {status === 'processing' && (
            <div className="flex flex-col items-center py-10">
              <div className="w-11 h-11 border-[3px] border-gray-200 border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
              <p className="font-semibold text-text-primary">Processing payment...</p>
              <p className="text-sm text-text-muted mt-1">Please don&apos;t leave this page</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="flex flex-col items-center py-10">
              <motion.div
                className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <SuccessCheck size={28} show color="#059669" />
              </motion.div>
              <p className="font-bold text-lg text-text-primary">
                <GradientText>Payment Successful!</GradientText>
              </p>
              <p className="text-sm text-text-muted mt-1">Redirecting to your dashboard...</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="font-semibold text-text-primary">
                <GradientText>Payment Issue</GradientText>
              </p>
              <p className="text-sm text-red-600 mt-1 text-center max-w-xs">{error}</p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A] text-white rounded-[var(--radius-md)] text-sm font-semibold shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </motion.button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Payments processed securely via PayPal
        </div>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        className="mt-4 flex items-center justify-center gap-4 text-xs text-text-muted"
        variants={itemVariants}
      >
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          SSL Encrypted
        </span>
        <span className="w-1 h-1 bg-border rounded-full" />
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          PayPal Buyer Protection
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto flex items-center justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
