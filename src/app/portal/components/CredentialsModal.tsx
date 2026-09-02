'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CopyButton, SuccessCheck } from '@/app/portal/components/portal-ui';

type Creds = { email: string; password: string };

/**
 * Shown ONCE, the first time an auto-provisioned (phone-outreach) client lands in the
 * portal — handing them durable credentials (copy / download) to log back in.
 *
 * `fresh` is supplied by the server ONLY on the render where the password is minted.
 * We capture it into client state on first mount; that state survives the portal's
 * router.refresh() (AutoRefresh) without remounting, so no cross-request storage is
 * needed (a prior sessionStorage approach leaked an earlier account's credentials).
 * Worst case on a hard reload before saving: use the one-time login link / reset.
 */
export default function CredentialsModal({ fresh }: { fresh: Creds | null }) {
  const [creds] = useState<Creds | null>(fresh);
  const [open, setOpen] = useState<boolean>(!!fresh);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const reduce = useReducedMotion();

  if (!open || !creds) return null;
  const { email, password } = creds;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const block = `StrataLanding — your login\n\nSign in at: ${origin}/login\nEmail:    ${email}\nPassword: ${password}\n\nKeep this safe. You can change your password anytime in Settings.`;

  function copyAll() { navigator.clipboard?.writeText(block).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }
  function download() {
    const url = URL.createObjectURL(new Blob([block], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'stratalanding-login.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url); setDownloaded(true);
  }

  const NAVY = '#0B1B3A', CYAN = '#0891B2', LINE = 'rgba(11,27,58,0.10)';

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(11,27,58,0.45)', backdropFilter: 'blur(3px)' }} role="dialog" aria-modal="true" aria-labelledby="cred-title"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <motion.div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/70 p-6 sm:p-7 backdrop-blur-md shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18),inset_0_1px_0_0_rgba(255,255,255,0.7)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 280, damping: 24, mass: 0.7 }}>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ background: '#E4F3F0', color: '#0E7490' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h2 id="cred-title" className="text-[19px] font-bold" style={{ color: NAVY, fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}>Your account is ready</h2>
            <p className="text-[12.5px]" style={{ color: '#5B7290' }}>Save these — you&apos;ll use them to log back in.</p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <Field label="Email" value={email} />
          <Field label="Password" value={password} mono useCopyButton />
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <button onClick={copyAll}
            className="inline-flex flex-1 min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            style={{ background: `linear-gradient(180deg,#0aa6c9,${CYAN})`, boxShadow: '0 12px 26px -12px rgba(8,145,178,0.5)' }}>
            {copied && <SuccessCheck show size={16} color="#ffffff" />}
            {copied ? 'Copied' : 'Copy login'}
          </button>
          <button onClick={download}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            style={{ color: '#1A3A5A', border: `1px solid ${LINE}` }}>
            {downloaded ? 'Downloaded ✓' : 'Download'}
          </button>
        </div>

        <button onClick={() => setOpen(false)}
          className="mt-3 w-full rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors hover:bg-[#E9E7E1] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          style={{ color: NAVY, background: '#F1F0EC' }}>
          I&apos;ve saved it — continue
        </button>

        <p className="mt-4 text-center text-[12px] leading-relaxed" style={{ color: '#5B7290' }}>
          Lost it later? You can always get a one-time login link from the{' '}
          <span style={{ color: '#0E7490', fontWeight: 600 }}>sign-in page</span>, or change your password in Settings.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, mono, useCopyButton }: { label: string; value: string; mono?: boolean; useCopyButton?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#5B7290', fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}>{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: '#FAFBFC', border: '1px solid rgba(11,27,58,0.08)' }}>
        <code className={`flex-1 break-all text-[14.5px] ${mono ? 'tracking-wide' : ''}`} style={{ color: '#0B1B3A' }}>{value}</code>
        {useCopyButton ? (
          <CopyButton value={value} label="Copy" className="shrink-0 text-[11px] font-bold" size={14} />
        ) : (
          <button onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors hover:bg-[#D3ECE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
            style={{ background: '#E4F3F0', color: '#0E7490' }} aria-label={copied ? 'Copied' : `Copy ${label}`}>
            {copied ? (
              <SuccessCheck show size={13} color="#0E7490" />
            ) : (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
