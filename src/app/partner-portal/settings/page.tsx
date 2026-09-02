'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, OTPInput } from '@/components/ui';
import { enrollMFA, verifyMFA, getMFAFactors } from '@/lib/auth';
import {
  RevealGroup,
  RevealItem,
  PortalButton,
  PortalPageHeader,
  CopyButton,
} from '@/app/portal/components/portal-ui';

interface AffData {
  name: string;
  company: string | null;
  website: string | null;
  paypalEmail: string | null;
  referralCode: string;
  email: string;
}

type MFAStep = 'idle' | 'qr' | 'verify' | 'success';

function useAffiliateData(): AffData | null {
  const [data, setData] = useState<AffData | null>(null);
  useEffect(() => {
    const el = document.getElementById('affiliate-data');
    if (el) setData(JSON.parse(el.textContent || '{}'));
  }, []);
  return data;
}

// Shared glass card recipe — matches the client portal exactly.
const GLASS =
  'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

// Inputs get a consistent cyan focus ring across the page.
const INPUT_RING = 'focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50';

// Accent (primary) and ghost button styles — no steel-blue gradient.
const ACCENT_BTN =
  'inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50';
const GHOST_BTN =
  'inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary hover:bg-[#0B1B3A]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50';

export default function SettingsPage() {
  const affiliate = useAffiliateData();
  const [form, setForm] = useState({ name: '', company: '', website: '', paypalEmail: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA
  const [mfaStep, setMfaStep] = useState<MFAStep>('idle');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  // Disable flow
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    if (affiliate) {
      setForm({ name: affiliate.name || '', company: affiliate.company || '', website: affiliate.website || '', paypalEmail: affiliate.paypalEmail || '' });
    }
  }, [affiliate]);

  // Check MFA status on mount
  useEffect(() => {
    getMFAFactors().then(({ factors }) => {
      setMfaEnabled(factors.length > 0);
    }).catch(() => {});
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch('/api/partner-portal/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: 'error', text: "Passwords don't match." }); return; }
    if (pwForm.newPw.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) { setPwMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed.' }); }
    finally { setPwSaving(false); }
  };

  // 2FA Setup
  const startMFASetup = async () => {
    setMfaLoading(true); setMfaError(null);
    try {
      const { data, error } = await enrollMFA();
      if (error || !data) throw new Error(error?.message || 'Failed to start setup');
      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaStep('qr');
    } catch (err) { setMfaError(err instanceof Error ? err.message : 'Failed'); }
    finally { setMfaLoading(false); }
  };

  const verifyMFASetup = async (code: string) => {
    if (code.length !== 6) return;
    setMfaVerifying(true); setMfaError(null);
    try {
      const { error } = await verifyMFA(mfaFactorId!, mfaFactorId!, code);
      if (error) throw new Error(error.message);
      setMfaStep('success');
      setMfaEnabled(true);
      setTimeout(() => setMfaStep('idle'), 3000);
    } catch (err) { setMfaError(err instanceof Error ? err.message : 'Invalid code'); }
    finally { setMfaVerifying(false); }
  };

  const disableMFA = async (code: string) => {
    if (code.length !== 6) return;
    setDisabling(true); setDisableError(null);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action: 'disable' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMfaEnabled(false);
      setShowDisable(false);
      setDisableCode('');
    } catch (err) { setDisableError(err instanceof Error ? err.message : 'Invalid code'); }
    finally { setDisabling(false); }
  };

  if (!affiliate) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <PortalPageHeader eyebrow="Partner" title="Settings" subtitle="Manage your partner profile, security, and payout details." />

      <RevealGroup className="space-y-6">
        {/* ═══ PROFILE ═══ */}
        <RevealItem>
          <div className={`${GLASS} p-5 sm:p-8`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent)]/10">
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Profile</h2>
                <p className="text-xs text-text-muted">Your partner account details</p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Name</label>
                  <Input className={INPUT_RING} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Email</label>
                  <Input className={INPUT_RING} value={affiliate.email} disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Company</label>
                  <Input className={INPUT_RING} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Website</label>
                  <Input className={INPUT_RING} value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">PayPal Email</label>
                <Input className={INPUT_RING} type="email" value={form.paypalEmail} onChange={e => setForm(p => ({ ...p, paypalEmail: e.target.value }))} required />
                <p className="text-xs text-text-muted mt-1.5">All commissions are paid to this PayPal address.</p>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

              <div className="flex items-center gap-3 pt-2">
                <PortalButton type="submit" disabled={saving} className={ACCENT_BTN}>{saving ? 'Saving...' : 'Save Changes'}</PortalButton>
                {saved && (
                  <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Saved
                  </motion.span>
                )}
              </div>
            </form>
          </div>
        </RevealItem>

        {/* ═══ PASSWORD ═══ */}
        <RevealItem>
          <div className={`${GLASS} p-5 sm:p-8`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 border border-amber-200/60">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Password</h2>
                <p className="text-xs text-text-muted">Change your account password</p>
              </div>
            </div>

            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Current Password</label>
                <Input className={INPUT_RING} type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">New Password</label>
                  <Input className={INPUT_RING} type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="Min. 8 characters" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">Confirm New</label>
                  <Input className={INPUT_RING} type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>

              {pwMsg && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className={`text-sm rounded-xl px-4 py-3 ${pwMsg.type === 'error' ? 'text-red-600 bg-red-50 border border-red-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                  {pwMsg.text}
                </motion.div>
              )}

              <div className="pt-2">
                <PortalButton type="submit" disabled={pwSaving} className={ACCENT_BTN}>{pwSaving ? 'Changing...' : 'Change Password'}</PortalButton>
              </div>
            </form>
          </div>
        </RevealItem>

        {/* ═══ TWO-FACTOR AUTH ═══ */}
        <RevealItem>
          <div className={`${GLASS} p-5 sm:p-8`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl border ${mfaEnabled ? 'bg-emerald-50 border-emerald-200/60' : 'bg-[#0B1B3A]/5 border-white/60'}`}>
                  <svg className={`w-5 h-5 ${mfaEnabled ? 'text-emerald-600' : 'text-[#1A3A5A]/55'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Two-Factor Authentication</h2>
                  <p className="text-xs text-text-muted">Protect your account with TOTP</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${mfaEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-[#0B1B3A]/5 text-text-muted border border-white/60'}`}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {/* IDLE — Not enabled */}
              {!mfaEnabled && mfaStep === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-[#0B1B3A]/[0.03] border border-white/60 rounded-2xl p-6 mb-5">
                    <p className="text-sm text-text-muted leading-relaxed">
                      Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.
                    </p>
                  </div>
                  <PortalButton onClick={startMFASetup} disabled={mfaLoading} className={ACCENT_BTN}>
                    {mfaLoading ? 'Starting...' : 'Enable 2FA'}
                  </PortalButton>
                  {mfaError && <p className="text-sm text-red-600 mt-3">{mfaError}</p>}
                </motion.div>
              )}

              {/* QR CODE STEP */}
              {mfaStep === 'qr' && mfaQrCode && (
                <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-center">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 inline-block mb-5 shadow-sm border border-white/70">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mfaQrCode} alt="Scan QR code" className="mx-auto w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]" />
                    </div>
                    <p className="text-sm text-text-primary font-semibold mb-2">Scan this QR code with your authenticator app</p>
                    <p className="text-xs text-text-muted mb-4">Or enter this code manually:</p>
                    <div className="bg-[#0B1B3A]/[0.03] border border-white/60 rounded-xl px-4 py-3 mb-6 inline-block max-w-full overflow-x-auto">
                      <code className="text-xs sm:text-sm font-mono font-bold text-text-primary tracking-wider select-all break-all">{mfaSecret}</code>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => { setMfaStep('idle'); setMfaCode(''); setMfaError(null); }} className={GHOST_BTN}>Cancel</button>
                    <PortalButton onClick={() => setMfaStep('verify')} className={ACCENT_BTN}>I&apos;ve scanned it</PortalButton>
                  </div>
                </motion.div>
              )}

              {/* VERIFY STEP */}
              {mfaStep === 'verify' && (
                <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-center">
                    <p className="text-sm text-text-primary font-semibold mb-2">Enter the 6-digit code from your app</p>
                    <p className="text-xs text-text-muted mb-6">This verifies your authenticator is set up correctly.</p>
                    <div className="flex justify-center mb-6">
                      <OTPInput
                        value={mfaCode}
                        onChange={setMfaCode}
                        onComplete={verifyMFASetup}
                        disabled={mfaVerifying}
                        error={mfaError || undefined}
                        autoFocus
                      />
                    </div>
                    {mfaError && <p className="text-sm text-red-600 mb-4">{mfaError}</p>}
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setMfaStep('qr'); setMfaCode(''); setMfaError(null); }} className={GHOST_BTN}>Back</button>
                      <PortalButton onClick={() => verifyMFASetup(mfaCode)} disabled={mfaVerifying || mfaCode.length !== 6} className={ACCENT_BTN}>
                        {mfaVerifying ? 'Verifying...' : 'Verify & Enable'}
                      </PortalButton>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SUCCESS */}
              {mfaStep === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 border border-emerald-200/60">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">2FA Enabled</h3>
                  <p className="text-sm text-text-muted">Your account is now protected with two-factor authentication.</p>
                </motion.div>
              )}

              {/* ENABLED — Show disable option */}
              {mfaEnabled && mfaStep === 'idle' && (
                <motion.div key="enabled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="bg-emerald-50/50 rounded-2xl p-6 mb-5 border border-emerald-200/40">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <p className="text-sm text-emerald-800">Two-factor authentication is active. A code is required every time you sign in.</p>
                    </div>
                  </div>

                  {!showDisable ? (
                    <button onClick={() => setShowDisable(true)} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 rounded-md">
                      Disable 2FA
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div className="bg-red-50/50 rounded-2xl p-6 border border-red-200/40">
                        <p className="text-sm text-red-800 font-semibold mb-1">Confirm Disable</p>
                        <p className="text-xs text-red-600 mb-4">Enter your current 2FA code to disable two-factor authentication.</p>
                        <div className="flex justify-center mb-4">
                          <OTPInput
                            value={disableCode}
                            onChange={setDisableCode}
                            onComplete={disableMFA}
                            disabled={disabling}
                            error={disableError || undefined}
                            autoFocus
                          />
                        </div>
                        {disableError && <p className="text-sm text-red-600 text-center mb-3">{disableError}</p>}
                        <div className="flex justify-center gap-3">
                          <button onClick={() => { setShowDisable(false); setDisableCode(''); setDisableError(null); }} className={GHOST_BTN}>Cancel</button>
                          <button onClick={() => disableMFA(disableCode)} disabled={disabling || disableCode.length !== 6}
                            className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50">
                            {disabling ? 'Disabling...' : 'Disable 2FA'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </RevealItem>

        {/* ═══ REFERRAL CODE ═══ */}
        <RevealItem>
          <div className={`${GLASS} p-6`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent)]/10">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">Referral Code</p>
                  <p className="text-xs text-text-muted">Permanent — cannot be changed</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xl font-bold font-mono text-[var(--color-accent)] tracking-wider">{affiliate.referralCode}</code>
                <CopyButton value={affiliate.referralCode} />
              </div>
            </div>
          </div>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
