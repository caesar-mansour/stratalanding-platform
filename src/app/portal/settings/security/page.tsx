'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMFAFactors, enrollMFA, verifyMFA, challengeMFA, unenrollMFA } from '@/lib/auth';
import { Button, OTPInput } from '@/components/ui';
import Link from 'next/link';
import { GradientText, PortalButton, PortalPageHeader } from '../../components/portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

interface Factor {
  id: string;
  friendly_name: string;
  factor_type: string;
  status: string;
  created_at: string;
}

type SetupStep = 'idle' | 'qr' | 'verify' | 'success';

export default function SecuritySettingsPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Disable flow state
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableFactorId, setDisableFactorId] = useState<string | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [disableChallengeId, setDisableChallengeId] = useState<string | null>(null);

  // Password change
  const [hasPassword, setHasPassword] = useState(true);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    loadFactors();
    fetch('/api/auth/change-password').then((r) => r.json()).then((d) => setHasPassword(!!d.hasPassword)).catch(() => {});
  }, []);

  async function handleChangePassword() {
    setPwErr(''); setPwDone(false);
    if (newPw !== confirmPw) { setPwErr('New passwords do not match.'); return; }
    setPwBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error || 'Could not change password.'); setPwBusy(false); return; }
      setPwDone(true); setCurPw(''); setNewPw(''); setConfirmPw(''); setHasPassword(true);
    } catch { setPwErr('Network error. Try again.'); }
    setPwBusy(false);
  }

  async function loadFactors() {
    setIsLoading(true);
    const { factors: loadedFactors } = await getMFAFactors();
    setFactors(loadedFactors);
    setIsLoading(false);
  }

  async function handleEnableMFA() {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: enrollError } = await enrollMFA();

      if (enrollError) {
        setError(enrollError.message);
        return;
      }

      if (data) {
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setSetupStep('qr');
      }
    } catch {
      setError('Failed to initialize 2FA setup');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleProceedToVerify() {
    if (!factorId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: challengeError } = await challengeMFA(factorId);

      if (challengeError) {
        setError(challengeError.message);
        return;
      }

      setChallengeId(data?.id || null);
      setSetupStep('verify');
    } catch {
      setError('Failed to create verification challenge');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleVerifySetup() {
    if (!factorId || !challengeId || verifyCode.length !== 6) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: verifyError } = await verifyMFA(factorId, challengeId, verifyCode);

      if (verifyError) {
        setError('Invalid code. Please try again.');
        setVerifyCode('');

        // Create new challenge for retry
        const { data: newChallenge } = await challengeMFA(factorId);
        setChallengeId(newChallenge?.id || null);
        return;
      }

      setSetupStep('success');
      await loadFactors();
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStartDisable(factor: Factor) {
    setDisableFactorId(factor.id);
    setIsDisabling(true);
    setError(null);

    try {
      const { data, error: challengeError } = await challengeMFA(factor.id);

      if (challengeError) {
        setError(challengeError.message);
        setIsDisabling(false);
        return;
      }

      setDisableChallengeId(data?.id || null);
    } catch {
      setError('Failed to start disable process');
      setIsDisabling(false);
    }
  }

  async function handleConfirmDisable() {
    if (!disableFactorId || disableCode.length !== 6) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Verify code and disable in one call
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: disableFactorId, code: disableCode, action: 'disable' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code. Please try again.');
        setDisableCode('');
        return;
      }

      // Success
      setIsDisabling(false);
      setDisableFactorId(null);
      setDisableCode('');
      setDisableChallengeId(null);
      await loadFactors();
    } catch {
      setError('Failed to disable 2FA');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleCancelSetup() {
    setSetupStep('idle');
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setChallengeId(null);
    setVerifyCode('');
    setError(null);
  }

  function handleCancelDisable() {
    setIsDisabling(false);
    setDisableFactorId(null);
    setDisableCode('');
    setDisableChallengeId(null);
    setError(null);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-lg bg-[#0B1B3A]/10" />
          <div className={`${GLASS} p-6 space-y-3`}>
            <div className="h-5 w-1/4 rounded bg-[#0B1B3A]/10" />
            <div className="h-3 w-2/3 rounded bg-[#0B1B3A]/[0.07]" />
            <div className="h-10 w-full rounded-lg bg-[#0B1B3A]/[0.06]" />
            <div className="h-10 w-full rounded-lg bg-[#0B1B3A]/[0.06]" />
          </div>
          <div className={`${GLASS} p-6 space-y-3`}>
            <div className="h-5 w-1/3 rounded bg-[#0B1B3A]/10" />
            <div className="h-3 w-1/2 rounded bg-[#0B1B3A]/[0.07]" />
            <div className="h-16 w-full rounded-xl bg-[#0B1B3A]/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/portal/settings"
          className="inline-flex items-center gap-1 rounded-md text-sm text-text-muted transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </Link>
        <PortalPageHeader eyebrow="Account" title="Security" subtitle="Manage your account security settings" className="mb-0" />
      </div>

      {/* Password Section */}
      <div className={`${GLASS} p-6 mb-4`}>
        <h2 className="text-lg font-semibold text-text-primary">Password</h2>
        <p className="text-sm text-text-muted mt-1 mb-4">
          {hasPassword ? 'Update the password you use to sign in.' : 'Set a password so you can sign in without a magic link.'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-3 max-w-sm">
          {hasPassword && (
            <input type="password" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="Current password"
              className="w-full rounded-lg border border-border bg-white/80 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50" />
          )}
          <input type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password"
            className="w-full rounded-lg border border-border bg-white/80 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50" />
          <input type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password"
            className="w-full rounded-lg border border-border bg-white/80 px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50" />
          <p className="text-xs text-text-muted">At least 8 characters, with 3 of: uppercase, lowercase, number, symbol.</p>
          {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
          {pwDone && <p className="text-sm text-emerald-600">Password updated ✓</p>}
          <PortalButton type="submit" disabled={pwBusy || !newPw || !confirmPw}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50">
            {pwBusy ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
          </PortalButton>
        </form>
      </div>

      {/* 2FA Section */}
      <div className={`${GLASS} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Add an extra layer of security to your account using an authenticator app
            </p>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              factors.length > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {factors.length > 0 ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Idle State - No factors */}
          {setupStep === 'idle' && factors.length === 0 && !isDisabling && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-xl border border-white/60 bg-white/50 backdrop-blur-sm p-4 mb-4">
                <p className="text-sm text-text-muted">
                  Two-factor authentication adds an extra layer of security by requiring a code
                  from your authenticator app (like Google Authenticator or Authy) when you sign in.
                </p>
              </div>
              <Button onClick={handleEnableMFA} disabled={isProcessing}>
                {isProcessing ? 'Setting up...' : 'Enable 2FA'}
              </Button>
            </motion.div>
          )}

          {/* Idle State - Has factors */}
          {setupStep === 'idle' && factors.length > 0 && !isDisabling && (
            <motion.div
              key="enabled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/60 bg-white/50 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                      <svg
                        className="w-5 h-5 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {factor.friendly_name || 'Authenticator App'}
                      </p>
                      <p className="text-xs text-text-muted">
                        Added {new Date(factor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartDisable(factor)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </motion.div>
          )}

          {/* QR Code Step */}
          {setupStep === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="font-semibold text-text-primary mb-2">
                  Scan QR Code
                </h3>
                <p className="text-sm text-text-muted">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              {qrCode && (
                <div className="flex justify-center">
                  <div className="p-4 rounded-lg border border-white/60 bg-white/70 backdrop-blur-md">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              {secret && (
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-1">
                    Or enter this code manually:
                  </p>
                  <code className="px-3 py-1.5 rounded border border-white/60 bg-white/60 text-sm font-mono">
                    {secret}
                  </code>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCancelSetup} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleProceedToVerify} disabled={isProcessing} className="flex-1">
                  {isProcessing ? 'Loading...' : 'Next'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Verify Step */}
          {setupStep === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="font-semibold text-text-primary mb-2">
                  Verify Setup
                </h3>
                <p className="text-sm text-text-muted">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <OTPInput
                value={verifyCode}
                onChange={setVerifyCode}
                onComplete={(code) => {
                  setVerifyCode(code);
                  handleVerifySetup();
                }}
                error={error || undefined}
                disabled={isProcessing}
              />

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCancelSetup} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifySetup}
                  disabled={isProcessing || verifyCode.length !== 6}
                  className="flex-1"
                >
                  {isProcessing ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Success Step */}
          {setupStep === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                2FA Enabled Successfully!
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Your account is now protected with two-factor authentication.
              </p>
              <Button onClick={() => setSetupStep('idle')}>Done</Button>
            </motion.div>
          )}

          {/* Disable Flow */}
          {isDisabling && (
            <motion.div
              key="disable"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="font-semibold text-text-primary mb-2">
                  Disable 2FA
                </h3>
                <p className="text-sm text-text-muted">
                  Enter your authenticator code to confirm
                </p>
              </div>

              <OTPInput
                value={disableCode}
                onChange={setDisableCode}
                onComplete={(code) => {
                  setDisableCode(code);
                  handleConfirmDisable();
                }}
                error={error || undefined}
                disabled={isProcessing}
              />

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleCancelDisable} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDisable}
                  disabled={isProcessing || disableCode.length !== 6}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
