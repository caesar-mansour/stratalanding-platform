'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GradientText, SuccessCheck } from '@/app/portal/components/portal-ui';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('token'); // PayPal returns orderId as 'token'
  const paymentType = searchParams.get('type');

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      setError('No order ID found');
      return;
    }

    // Prevent double-capture from React strict mode
    let cancelled = false;

    const capturePayment = async () => {
      try {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (cancelled) return;
        const data = await res.json();

        if (res.ok && data.status === 'COMPLETED') {
          setStatus('success');
          setTimeout(() => {
            router.push('/portal');
          }, 3000);
        } else if (res.ok) {
          // Capture returned OK but status might vary
          setStatus('success');
          setTimeout(() => {
            router.push('/portal');
          }, 3000);
        } else {
          setStatus('error');
          setError(data.error?.message || data.error || 'Payment capture failed');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Payment capture error:', err);
        setStatus('error');
        setError('Failed to process payment');
      }
    };

    capturePayment();
    return () => { cancelled = true; };
  }, [orderId, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        className="max-w-md w-full rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md p-8 text-center shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18),inset_0_1px_0_0_rgba(255,255,255,0.7)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-full h-full border-4 border-gray-200 border-t-[var(--color-accent)] rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              <GradientText>Processing Payment...</GradientText>
            </h1>
            <p className="text-text-muted">
              Please wait while we confirm your payment with PayPal.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <SuccessCheck size={32} show color="#059669" />
            </motion.div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              <GradientText>Payment Successful!</GradientText>
            </h1>
            <p className="text-text-muted mb-6">
              {paymentType === 'deposit'
                ? "Thank you for your deposit! Your project is now in production. Check your chat for next steps."
                : "Thank you for your final payment! Your project is now ready for launch."
              }
            </p>
            <Link
              href="/portal"
              className="group inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg font-medium shadow-[0_12px_30px_-12px_rgba(8,145,178,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(8,145,178,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2"
            >
              Go to Dashboard
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-xs text-text-muted mt-4">
              Redirecting to dashboard in 3 seconds...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              <GradientText>Payment Issue</GradientText>
            </h1>
            <p className="text-text-muted mb-6">
              {error || 'There was an issue processing your payment. Please try again.'}
            </p>
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg font-medium shadow-[0_12px_30px_-12px_rgba(8,145,178,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(8,145,178,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2"
            >
              Back to Dashboard
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
