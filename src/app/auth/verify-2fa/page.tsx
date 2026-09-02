'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getMFAFactors, challengeMFA, verifyMFA, signInWithMagicLink, getUser } from '@/lib/auth';
import { safeClientPath } from '@/lib/safe-redirect';
import { Button, OTPInput } from '@/components/ui';

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // SECURITY (audit F77): validate the redirect target to an allowlisted same-origin path.
  const redirectTo = safeClientPath(searchParams.get('redirectTo'));

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  useEffect(() => {
    async function initializeMFA() {
      try {
        // Get current user
        const { user } = await getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || null);

        // Get MFA factors
        const { factors } = await getMFAFactors();
        if (factors.length === 0) {
          // No MFA enrolled, redirect to portal
          router.push(redirectTo);
          return;
        }

        // Use the first TOTP factor
        const factor = factors[0];
        setFactorId(factor.id);

        // Create a challenge
        const { data: challengeData, error: challengeError } = await challengeMFA(factor.id);
        if (challengeError) {
          setError('Failed to initialize 2FA. Please try logging in again.');
          return;
        }

        setChallengeId(challengeData?.id || null);
      } catch {
        setError('An error occurred. Please try logging in again.');
      } finally {
        setIsInitializing(false);
      }
    }

    initializeMFA();
  }, [router, redirectTo]);

  const handleVerify = async () => {
    if (!factorId || !challengeId || code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await verifyMFA(factorId, challengeId, code);

      if (verifyError) {
        setError('Invalid code. Please try again.');
        setCode('');

        // Create a new challenge for retry
        const { data: newChallenge } = await challengeMFA(factorId);
        setChallengeId(newChallenge?.id || null);
        return;
      }

      // Success — smart redirect based on role (mirror password-login flow)
      let dest = redirectTo;
      if (data) {
        const d = data as { isAffiliate?: boolean; isClient?: boolean };
        if (d.isClient) dest = '/portal';
        else if (d.isAffiliate) dest = '/partner-portal';
      }
      router.push(dest);
      router.refresh();
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!userEmail) return;

    setSendingMagicLink(true);
    setError(null);

    try {
      const { error: magicLinkError } = await signInWithMagicLink(userEmail, redirectTo);

      if (magicLinkError) {
        setError(magicLinkError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleCodeComplete = (completedCode: string) => {
    setCode(completedCode);
    // Auto-submit when code is complete
    if (completedCode.length === 6 && factorId && challengeId) {
      handleVerify();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-lg p-8 border border-[var(--border)] text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Check your email
            </h1>
            <p className="text-[var(--text-muted)] mb-4">
              We&apos;ve sent a magic link to <strong className="text-[var(--text-primary)]">{userEmail}</strong>
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Click the link in your email to sign in without 2FA.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-lg p-8 border border-[var(--border)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-[var(--text-muted)]">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="space-y-6">
            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={handleCodeComplete}
              error={error || undefined}
              disabled={isLoading}
            />

            {error && !code && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-red-700 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--surface)] px-2 text-[var(--text-muted)]">
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={sendingMagicLink}
              className="w-full text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
            >
              {sendingMagicLink ? 'Sending...' : 'Lost access? Send magic link instead'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          <a href="/login" className="text-[var(--accent)] hover:underline">
            Back to login
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}
