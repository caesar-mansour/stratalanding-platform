'use client';

/*
 * Shared pieces for the /preview gate ("The Premiere").
 * The funnel components here (OtpInput, Primary/Secondary, Outcome, ProgressRail,
 * Metric, Step, Connector, Medallion) are moved VERBATIM from the pre-redesign
 * PreviewView — their behavior is load-bearing (OTP flow, admin tracking labels).
 */

import { useState, useEffect, useRef } from 'react';
import { motion, type Variants } from 'framer-motion';

/* Real Lighthouse measurement (mobile) — stored on the preview link, never fabricated. */
export interface SiteScores {
  url?: string;
  perf: number; a11y: number; bp: number; seo: number;
  lcp_s: number; si_s: number; tti_s: number; tbt_ms: number; cls: number; weight_kb: number;
}
export interface Comparison {
  measured_at?: string;
  device?: string;
  current: SiteScores;
  spec: SiteScores;
}

/* ---------- StrataLanding brand palette (src/lib/brand.ts) ---------- */
export const INK = '#0B1B3A';        // brand primary (navy) — headings
export const SLATE = '#475569';      // body text (slate-600)
export const MUTE = '#94A3B8';       // captions (slate-400)
export const LINE = '#E2E8F0';       // brand border
export const TEAL = '#0E7490';       // accent text (legible dark cyan)
export const CYAN = '#0891B2';       // brand accent
export const AMBER_INK = '#64748B';  // "before" column — neutral slate (no off-brand amber)
export const AMBER_BG = '#F1F5F9';   // slate-100
export const GOOD_INK = '#0E7490';   // "after" column — brand cyan
export const GOOD_BG = '#E0F2F7';    // light cyan tint
export const CREAM = '#FFFFFF';      // brand surface
export const PANE = '#F8FAFC';       // brand off-white background

/* ---------- Premiere dark-act tokens (navy family only, no pure black) ---------- */
export const NIGHT = '#050A16';      // deepest canvas (hero top, theme-color)
export const NAVY = '#0B1B3A';       // brand navy — dark canvas floor
export const BRIGHT = '#22D3EE';     // luminous cyan — glows + dark-act accent
export const DK_TEXT = '#EAF2FC';    // primary text on dark
export const DK_MUTE = '#93A7C4';    // secondary text on dark
export const DK_LINE = 'rgba(147, 167, 196, 0.18)'; // hairlines on dark

// Brand fonts only: Outfit (headings) + Inter (body). No serif.
export const SERIF = "var(--font-heading, 'Outfit', 'Inter', system-ui, sans-serif)";
export const SANS = "var(--font-body, 'Inter', system-ui, -apple-system, sans-serif)";
export const UI = "var(--font-heading, 'Outfit', 'Inter', system-ui, sans-serif)";

/* ------------------------------------------------------------------ */
/* Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */
export function IconArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconHeart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20s-7-4.35-9.5-8.5C.9 8.7 2.2 5.5 5.3 5.5c1.9 0 3 1 3.7 2 .7-1 1.8-2 3.7-2 3.1 0 4.4 3.2 2.8 6C19 15.65 12 20 12 20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
export function IconLock({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
export function IconMail({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconClock({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconWave({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4v8M12 3v9M15 5v7M6.5 8.5L6 11c-1 4 2 9 6.5 9s6.5-3 6.5-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin motion-reduce:animate-none ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Funnel pieces (verbatim behavior)                                  */
/* ------------------------------------------------------------------ */
export function ProgressRail({ current, className = '' }: { current: number; className?: string }) {
  const steps = ['Preview', 'Approve', 'Go live'];
  return (
    <ol className={`flex items-center gap-2 ${className}`} aria-label="Project progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-colors duration-500" aria-current={active ? 'step' : undefined}
                style={{ fontFamily: UI, background: done ? CYAN : '#fff', border: done ? `1px solid ${CYAN}` : active ? `1.5px solid ${CYAN}` : `1px solid ${LINE}`, color: done ? '#fff' : active ? TEAL : MUTE, boxShadow: active ? `0 0 0 4px ${GOOD_BG}` : 'none' }}>
                {done ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ fontFamily: UI, color: active ? INK : MUTE }}>{label}</span>
            </div>
            {i < steps.length - 1 && <span aria-hidden="true" className="mb-5 h-px flex-1 transition-colors duration-500" style={{ background: i < current ? CYAN : LINE }} />}
          </li>
        );
      })}
    </ol>
  );
}

export function Metric({ label, cur, spec, note, suffix }: { label: string; cur: string; spec: string; note?: string; suffix?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]" style={{ color: MUTE, fontFamily: UI }}>
        <span>{label}{suffix ? <span style={{ opacity: 0.6 }}> {suffix}</span> : ''}</span>
        {note && <span style={{ color: GOOD_INK, fontWeight: 600 }}>{note}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex-1 rounded-lg px-3 py-2 text-center text-[14px] font-bold" style={{ background: AMBER_BG, color: AMBER_INK }}>{cur}</span>
        <span className="flex-shrink-0" style={{ color: MUTE }}><IconArrow /></span>
        <span className="flex-1 rounded-lg px-3 py-2 text-center text-[14px] font-bold" style={{ background: GOOD_BG, color: GOOD_INK }}>{spec}</span>
      </div>
    </div>
  );
}

export function Step({ n, label, sub, active }: { n: string; label: string; sub?: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3" style={{ opacity: active ? 1 : 0.66 }}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ fontFamily: UI, background: active ? CYAN : '#fff', color: active ? '#fff' : MUTE, border: active ? 'none' : `1px solid ${LINE}` }}>
        {active ? <IconCheck /> : n}
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-semibold leading-tight" style={{ color: INK, fontFamily: UI }}>{label}</span>
        {sub && <span className="mt-0.5 text-[13px] leading-snug" style={{ color: MUTE }}>{sub}</span>}
      </span>
    </div>
  );
}

export function Connector() {
  return <div aria-hidden="true" className="ml-3.5 h-3 w-px" style={{ background: LINE }} />;
}

export function Medallion({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: GOOD_BG, color: TEAL, border: `1px solid ${LINE}` }}>{children}</span>;
}

export function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const [vals, setVals] = useState<string[]>(['', '', '', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  function setAt(i: number, raw: string) {
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = [...vals]; next[i] = d; setVals(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    const code = next.join('');
    if (code.length === 6 && next.every(Boolean)) onComplete(code);
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !vals[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    if (disabled) return;
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!d) return;
    e.preventDefault();
    const next = [...d.split(''), '', '', '', '', '', ''].slice(0, 6);
    setVals(next);
    refs.current[Math.min(d.length, 5)]?.focus();
    if (d.length === 6) onComplete(d);
  }
  return (
    <div className="flex justify-center gap-2" onPaste={onPaste}>
      {vals.map((v, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={v} disabled={disabled}
          onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric" autoComplete="one-time-code" maxLength={1} aria-label={`Digit ${i + 1}`}
          className="h-14 w-11 rounded-xl text-center text-[24px] font-bold outline-none transition-shadow focus:ring-2 disabled:opacity-50 sm:w-12"
          style={{ background: '#fff', border: `1px solid ${LINE}`, color: INK, ['--tw-ring-color' as string]: CYAN }} />
      ))}
    </div>
  );
}

export function Outcome({ title, children, rise, stagger, icon, live, tone }: {
  title: string; children: React.ReactNode; rise: Variants; stagger: Variants; icon?: React.ReactNode; live?: boolean; tone?: 'mute';
}) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" {...(live ? { role: 'status', 'aria-live': 'polite' as const } : {})}>
      {icon && <motion.div variants={rise} className="mb-4"><span className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: tone === 'mute' ? '#F1F0EC' : GOOD_BG, color: tone === 'mute' ? MUTE : TEAL, border: `1px solid ${LINE}` }}>{icon}</span></motion.div>}
      <motion.h1 variants={rise} className="text-[30px] font-semibold leading-tight tracking-[-0.01em] sm:text-[36px]" style={{ fontFamily: SERIF, color: INK }}>{title}</motion.h1>
      <motion.div variants={rise} className="mt-3 text-[16.5px] leading-relaxed" style={{ color: SLATE }}>{children}</motion.div>
    </motion.div>
  );
}

export function Primary({ children, onClick, disabled, className = '', type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15.5px] font-bold transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
      style={{ fontFamily: UI, background: `linear-gradient(180deg, #0aa6c9, ${CYAN})`, color: '#fff', boxShadow: '0 12px 28px -12px rgba(8,145,178,0.55)', ['--tw-ring-color' as string]: CYAN }}>
      {children}
    </button>
  );
}

export function Secondary({ children, onClick, disabled, className = '', ariaLabel }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; ariaLabel?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`inline-flex min-h-[50px] items-center justify-center rounded-xl px-6 py-3.5 text-[15px] font-semibold transition-colors duration-200 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      style={{ fontFamily: UI, color: SLATE, background: '#fff', border: `1px solid ${LINE}`, ['--tw-ring-color' as string]: CYAN }}>
      {children}
    </button>
  );
}
