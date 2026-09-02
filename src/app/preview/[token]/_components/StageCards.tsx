'use client';

/*
 * StageCards — every non-welcome state of the gate (proposal → code → done-*,
 * decline, expired, approved-revisit) as the focused centered light card.
 * The JSX, copy, handlers, and tracking labels here are moved VERBATIM from the
 * pre-redesign PreviewView (only the file was split). Do not rename click labels
 * or stage strings — the admin funnel + liked_at latch depend on them.
 */

import { motion, useReducedMotion, AnimatePresence, type Variants } from 'framer-motion';
import {
  INK, SLATE, MUTE, LINE, TEAL, CYAN, PANE, SERIF, SANS, UI,
  IconArrow, IconCheck, IconHeart, IconLock, IconMail, IconClock, IconWave, Spinner,
  ProgressRail, Medallion, OtpInput, Outcome, Primary, Secondary,
} from './bits';

export interface StageApi {
  stage: string;
  expired: boolean;
  approvedView: boolean;
  resent: boolean;
  emailed: boolean;
  busy: boolean;
  err: string;
  email: string;
  message: string;
  declineReason: string;
  otpLeft: number;
  resendLeft: number;
  otpKey: number;
  contactEmail: string;
  fmtTime: (s: number) => string;
  declineReasons: string[];
  setEmail: (v: string) => void;
  setMessage: (v: string) => void;
  setDeclineReason: (v: string) => void;
  setErr: (v: string) => void;
  goTo: (s: 'welcome' | 'proposal' | 'decline') => void;
  logClick: (label: string) => void;
  sendCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  resend: () => Promise<void>;
  resendLogin: () => Promise<void>;
  decline: (reason: 'not_for_me' | 'exploring', msg?: string) => Promise<void>;
}

export default function StageCards(a: StageApi) {
  const reduce = useReducedMotion();
  const {
    stage, expired, approvedView, resent, emailed, busy, err, email, message, declineReason,
    otpLeft, resendLeft, otpKey, contactEmail, fmtTime, declineReasons,
  } = a;

  const rise: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] } },
  };
  const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } };

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10"
      style={{ background: 'radial-gradient(1200px 680px at 50% -8%, #FFFFFF 0%, #F8FAFC 55%, #EEF2F7 100%)', color: INK, fontFamily: SANS }}>
      <div className="w-full max-w-[560px]">
        <motion.section
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[26px] p-6 sm:p-9"
          style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(11,27,58,0.04), 0 24px 60px -24px rgba(11,27,58,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[18px] font-bold tracking-tight" style={{ fontFamily: SERIF, color: INK }}>Strata<span style={{ color: CYAN }}>Landing</span></div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em]"
              style={{ fontFamily: UI, background: PANE, border: `1px solid ${LINE}`, color: TEAL }}><IconLock /> Private preview</span>
          </div>
          {!expired && !['decline', 'done-declined', 'done-exploring'].includes(stage) && <ProgressRail current={stage === 'welcome' ? 0 : 1} className="mt-7" />}

          <AnimatePresence mode="wait" initial={false}>
            {expired ? (
              <Outcome key="expired" rise={rise} stagger={stagger} tone="mute" icon={<IconClock />} title="This preview has expired">
                The link is no longer active. If you&apos;d still like to see your site, just reply to the text or email and I&apos;ll send a fresh one over.
              </Outcome>
            ) : approvedView ? (
              <Outcome key="approved" rise={rise} stagger={stagger} live icon={<IconCheck />} title="You're already in">
                {resent ? (
                  <>Sent — check your inbox{contactEmail ? <> at <b style={{ color: TEAL }}>{contactEmail}</b></> : ''} for your one-tap login link.</>
                ) : (
                  <>
                    <p>Your project space is open and waiting. I&apos;ll email you a one-tap link to get straight back in.</p>
                    <div className="mt-6"><Primary onClick={() => { a.logClick('resend_login'); a.resendLogin(); }} disabled={busy}>{busy ? <><Spinner /> Sending…</> : <>Email me my login link <IconArrow /></>}</Primary></div>
                  </>
                )}
              </Outcome>
            ) : stage === 'proposal' ? (
              <motion.div key="proposal" variants={stagger} initial="hidden" animate="show">
                <motion.div variants={rise} className="mt-7"><Medallion><IconHeart /></Medallion></motion.div>
                <motion.h1 variants={rise} className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.01em] sm:text-[36px]" style={{ fontFamily: SERIF, color: INK }}>
                  Love that — thank you <span aria-hidden="true">🎉</span>
                </motion.h1>
                <motion.p variants={rise} className="mt-3 text-[16.5px] leading-relaxed" style={{ color: SLATE }}>
                  Want me to send over a proposal so we can get started? No pressure at all — you only pay <b style={{ color: INK }}>after</b> you&apos;ve approved the finished site.
                </motion.p>
                <motion.form variants={rise} className="mt-6" onSubmit={(e) => { e.preventDefault(); a.logClick('send_proposal'); a.sendCode(); }}>
                  <label htmlFor="prop-email" className="mb-2 block text-[13px] font-semibold" style={{ fontFamily: UI, color: SLATE }}>Where should I send it?</label>
                  <input id="prop-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => a.setEmail(e.target.value)} placeholder="you@practice.com"
                    className="w-full rounded-xl px-4 py-3.5 text-[16px] outline-none transition-shadow focus-visible:ring-2"
                    style={{ background: '#fff', border: `1px solid ${err ? '#e11d48' : LINE}`, color: INK, ['--tw-ring-color' as string]: CYAN }}
                    aria-invalid={!!err} aria-describedby={err ? 'prop-email-err' : undefined} />
                  {err && <p id="prop-email-err" role="alert" className="mt-2 text-[13.5px]" style={{ color: '#e11d48' }}>{err}</p>}
                  <Primary type="submit" disabled={busy} className="mt-4 w-full">{busy ? <><Spinner /> Sending your code…</> : <>Yes — send the proposal <IconArrow /></>}</Primary>
                  <p className="mt-2.5 text-center text-[12.5px]" style={{ color: MUTE }}>I&apos;ll email a quick 6-digit code to confirm it&apos;s you — you stay right here.</p>
                </motion.form>
                <motion.button variants={rise} type="button" onClick={() => { a.logClick('exploring'); a.decline('exploring'); }} disabled={busy}
                  className="mx-auto mt-4 block rounded text-[14px] underline underline-offset-4 transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60"
                  style={{ color: MUTE, ['--tw-ring-color' as string]: CYAN }}>Just exploring for now</motion.button>
              </motion.div>
            ) : stage === 'code' ? (
              <motion.div key="code" variants={stagger} initial="hidden" animate="show">
                <motion.div variants={rise} className="mt-7"><Medallion><IconMail /></Medallion></motion.div>
                <motion.h1 variants={rise} className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[34px]" style={{ fontFamily: SERIF, color: INK }}>
                  Quick check — it&apos;s you?
                </motion.h1>
                <motion.p variants={rise} className="mt-3 text-[16px] leading-relaxed" style={{ color: SLATE }}>
                  I emailed a 6-digit code to <b style={{ color: INK }}>{email}</b>. Pop it in below — you&apos;ve got <b>10 minutes</b>, and you never have to leave this page.
                </motion.p>
                <motion.div variants={rise} className="mt-6">
                  <OtpInput key={otpKey} disabled={busy || otpLeft <= 0} onComplete={a.verifyCode} />
                </motion.div>
                {err && <motion.p variants={rise} role="alert" className="mt-3 text-center text-[13.5px]" style={{ color: '#e11d48' }}>{err}</motion.p>}
                <motion.div variants={rise} className="mt-5 flex items-center justify-between text-[13px]">
                  <span style={{ color: otpLeft > 0 ? MUTE : '#e11d48' }}>
                    {busy ? 'Checking…' : otpLeft > 0 ? `Code expires in ${fmtTime(otpLeft)}` : 'Code expired'}
                  </span>
                  <button type="button" onClick={() => { a.logClick('resend_code'); a.resend(); }} disabled={resendLeft > 0 || busy}
                    className="rounded font-semibold underline underline-offset-4 transition-colors disabled:no-underline disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                    style={{ color: resendLeft > 0 ? MUTE : TEAL, ['--tw-ring-color' as string]: CYAN }}>
                    {resendLeft > 0 ? `Resend in ${fmtTime(resendLeft)}` : 'Resend code'}
                  </button>
                </motion.div>
                <motion.button variants={rise} type="button" onClick={() => { a.setErr(''); a.goTo('proposal'); }}
                  className="mx-auto mt-5 block text-[13.5px] underline underline-offset-4 transition-colors hover:opacity-70" style={{ color: MUTE }}>
                  Wrong email? Go back
                </motion.button>
              </motion.div>
            ) : stage === 'decline' ? (
              <motion.div key="decline" variants={stagger} initial="hidden" animate="show">
                <motion.div variants={rise} className="mt-7"><Medallion><IconWave /></Medallion></motion.div>
                <motion.h1 variants={rise} className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.01em] sm:text-[36px]" style={{ fontFamily: SERIF, color: INK }}>
                  No worries at all <span aria-hidden="true">🙏</span>
                </motion.h1>
                <motion.p variants={rise} className="mt-3 text-[16.5px] leading-relaxed" style={{ color: SLATE }}>
                  Totally fine — thanks for taking a look. Mind sharing what made it a no? One tap, it just helps me get better.
                </motion.p>
                <motion.div variants={rise} className="mt-5 flex flex-wrap gap-2">
                  {declineReasons.map((r) => {
                    const on = declineReason === r;
                    return (
                      <button key={r} type="button" onClick={() => { const next = on ? '' : r; if (next) a.logClick('reason: ' + r); a.setDeclineReason(next); }}
                        className="rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
                        style={on
                          ? { background: CYAN, color: '#fff', border: `1px solid ${CYAN}`, ['--tw-ring-color' as string]: CYAN }
                          : { background: '#fff', color: SLATE, border: `1px solid ${LINE}`, ['--tw-ring-color' as string]: CYAN }}>
                        {r}
                      </button>
                    );
                  })}
                </motion.div>
                <motion.form variants={rise} className="mt-4" onSubmit={(e) => { e.preventDefault(); a.decline('not_for_me', [declineReason, message].filter(Boolean).join(' — ')); }}>
                  <textarea value={message} onChange={(e) => a.setMessage(e.target.value)} placeholder="Anything else? (optional)" rows={2} aria-label="Anything else? (optional)"
                    className="w-full resize-y rounded-xl px-4 py-3.5 text-[16px] outline-none transition-shadow focus-visible:ring-2"
                    style={{ background: '#fff', border: `1px solid ${LINE}`, color: INK, ['--tw-ring-color' as string]: CYAN }} />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Primary type="submit" disabled={busy} className="flex-1">{busy ? <><Spinner /> Sending…</> : 'Send'}</Primary>
                    <Secondary onClick={() => a.goTo('welcome')} disabled={busy} ariaLabel="Go back"><span className="inline-flex items-center gap-1.5"><IconArrow className="rotate-180" /> Back</span></Secondary>
                  </div>
                </motion.form>
                <motion.p variants={rise} className="mt-4 text-center text-[12.5px]" style={{ color: MUTE }}>
                  Your private preview stays live this week — change your mind anytime.
                </motion.p>
              </motion.div>
            ) : stage === 'done-emailed' ? (
              emailed ? (
                <Outcome key="emailed" rise={rise} stagger={stagger} live icon={<IconMail />} title="Check your email">
                  This preview was already approved, so for your security I sent a one-tap login link to <b style={{ color: TEAL }}>{email}</b>. Open it to step into your project space — your proposal is on its way too.
                </Outcome>
              ) : (
                <Outcome key="emailed" rise={rise} stagger={stagger} live icon={<IconCheck />} title="You're all set">
                  Your approval is locked in — nothing else to do here. I&apos;ll be in touch at your email shortly with the proposal.
                </Outcome>
              )
            ) : stage === 'done-exploring' ? (
              <Outcome key="exploring" rise={rise} stagger={stagger} live icon={<IconClock />} title="All good — take your time">
                Your preview stays live all week. Hold it up next to your current site whenever suits you, and just reply to my text or email when you&apos;re ready. No pressure, genuinely.
              </Outcome>
            ) : (
              <Outcome key="declined" rise={rise} stagger={stagger} live icon={<IconWave />} title="Thanks for looking">
                All set — and genuinely, good luck with the practice. If the timing ever changes, you&apos;ve got my number.
              </Outcome>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
      <div className="mt-5 flex w-full max-w-[560px] items-center gap-2.5 px-1">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: INK, color: '#fff', fontFamily: UI }}>C</span>
        <p className="text-[12.5px]" style={{ color: MUTE }}>Built personally by Caesar at StrataLanding · async studio, no sales calls</p>
      </div>
    </main>
  );
}
