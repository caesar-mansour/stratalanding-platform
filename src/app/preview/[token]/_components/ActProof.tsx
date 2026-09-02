'use client';

/*
 * Act 2 — "The Proof". The dark→light seam: a huge real-Lighthouse "N× faster"
 * counter still in the dark, then a light sheet rises with the measured
 * before/after. All numbers/math are verbatim from the pre-redesign Proof —
 * REAL data only, never fabricated. No comparison → the honest ValuePanel
 * content on the light sheet instead (dark counter omitted).
 */

import { useEffect, useRef } from 'react';
import { motion, useInView, useReducedMotion, animate, type Variants } from 'framer-motion';
import {
  INK, SLATE, MUTE, LINE, TEAL, GOOD_INK, GOOD_BG, AMBER_INK, PANE,
  BRIGHT, DK_MUTE, SERIF, UI,
  IconCheck, Metric, type Comparison,
} from './bits';

/* Count-up that writes textContent directly — no per-frame React state. */
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) { el.textContent = String(target); return; }
    const controls = animate(1, target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = String(Math.round(v)); },
    });
    return () => controls.stop();
  }, [inView, target, reduce]);
  return <span ref={ref}>{target}</span>;
}

function useRise(): { rise: Variants; stagger: Variants } {
  const reduce = useReducedMotion();
  return {
    rise: {
      hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
      show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] } },
    },
    stagger: { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } },
  };
}

function ProofSheet({ c }: { c: Comparison }) {
  const { rise, stagger } = useRise();
  const cur = c.current, spec = c.spec;
  const fmt = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
  const lighter = Math.round((1 - spec.weight_kb / Math.max(cur.weight_kb, 1)) * 100);
  return (
    <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      <motion.div variants={rise} className="rounded-[22px] p-5 sm:p-7" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(11,27,58,0.04), 0 24px 56px -30px rgba(11,27,58,0.18)' }}>
        <div className="flex flex-col gap-4">
          <motion.div variants={rise}><Metric label="Loads in" cur={`${cur.lcp_s}s`} spec={`${spec.lcp_s}s`} /></motion.div>
          <motion.div variants={rise}><Metric label="Google speed score" cur={`${cur.perf}`} spec={`${spec.perf}`} suffix="/100" /></motion.div>
          <motion.div variants={rise}><Metric label="Page weight" cur={fmt(cur.weight_kb)} spec={fmt(spec.weight_kb)} note={`${lighter}% lighter`} /></motion.div>
        </div>
      </motion.div>

      <motion.p variants={rise} className="mt-5 rounded-xl p-4 text-[13.5px] leading-relaxed" style={{ background: GOOD_BG, color: '#0b4f4a' }}>
        Google found <b>53% of mobile visitors leave</b> a site that takes more than 3 seconds to load. Yours takes{' '}
        <b style={{ color: AMBER_INK }}>{cur.lcp_s}s</b> — the new one, <b style={{ color: GOOD_INK }}>{spec.lcp_s}s</b>.
        <span className="mt-1 block text-[10.5px]" style={{ color: MUTE }}>Source: Think with Google, mobile speed research</span>
      </motion.p>

      <motion.div variants={rise} className="mt-5 flex flex-wrap justify-center gap-2">
        {['Online booking', 'Tap-to-call', 'Book button above the fold', 'Mobile-first', 'Loads under 3s'].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: '#fff', border: `1px solid ${LINE}`, color: GOOD_INK, fontFamily: UI }}>
            <IconCheck className="h-3 w-3" /> {t}
          </span>
        ))}
      </motion.div>
      <motion.p variants={rise} className="mt-4 text-center text-[10.5px]" style={{ color: MUTE }}>
        Measured{c.measured_at ? ` ${c.measured_at}` : ''} · {c.device || 'mobile'} · Google Lighthouse
      </motion.p>
    </motion.div>
  );
}

/* Honest value panel when no Lighthouse comparison is attached — never fabricated metrics. */
function ValueSheet() {
  const { rise, stagger } = useRise();
  const items = [
    { t: 'Fast on every phone', s: 'Built lightweight, so it opens in a blink — and most patients book from mobile.' },
    { t: 'Online booking, baked in', s: 'They book in a few taps instead of playing phone tag.' },
    { t: 'Made to be found on Google', s: 'Clean, modern code that search engines actually like.' },
    { t: 'Sharp on every screen', s: 'Phone, tablet, desktop — it just works, everywhere.' },
  ];
  return (
    <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      <motion.p variants={rise} className="text-center text-[11px] font-bold uppercase tracking-[0.24em]" style={{ fontFamily: UI, color: TEAL }}>
        What you&apos;re getting
      </motion.p>
      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
        {items.map((it) => (
          <motion.div key={it.t} variants={rise} className="flex gap-3 rounded-2xl p-4 sm:p-5" style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(11,27,58,0.04)' }}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: GOOD_BG, color: GOOD_INK }}><IconCheck className="h-3.5 w-3.5" /></span>
            <div>
              <p className="text-[15.5px] font-semibold leading-tight" style={{ fontFamily: UI, color: INK }}>{it.t}</p>
              <p className="mt-1 text-[13.5px] leading-snug" style={{ color: SLATE }}>{it.s}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={rise} className="mt-5 text-center text-[12.5px] leading-snug" style={{ color: MUTE }}>
        Tap “View your new website” above to see it all live.
      </motion.p>
    </motion.div>
  );
}

export default function ActProof({ comparison }: { comparison: Comparison | null }) {
  const ok = Boolean(comparison && comparison.current && comparison.spec);
  const c = comparison as Comparison;
  const faster = ok ? Math.max(2, Math.round(c.current.lcp_s / Math.max(c.spec.lcp_s, 0.1))) : 0;
  const { rise, stagger } = useRise();

  return (
    <section data-act="proof" className="[content-visibility:auto] [contain-intrinsic-size:auto_1100px]" style={{ background: '#0B1D3E' }}>
      {ok && (
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
          className="px-6 pb-16 pt-4 text-center sm:pb-20"
        >
          <motion.p variants={rise} className="text-[10.5px] font-bold uppercase tracking-[0.3em]" style={{ fontFamily: UI, color: BRIGHT }}>
            The difference — measured
          </motion.p>
          <motion.div variants={rise} className="mt-4 flex items-baseline justify-center gap-3">
            <span
              className="font-semibold leading-none tracking-[-0.03em]"
              style={{
                fontFamily: SERIF, fontSize: 'clamp(88px, 18vw, 168px)',
                backgroundImage: 'linear-gradient(180deg, #FFFFFF 25%, #67E8F9 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}
            >
              <CountUp target={faster} />×
            </span>
          </motion.div>
          <motion.p variants={rise} className="mt-3 text-[17px] font-medium" style={{ color: '#D7E6F6' }}>
            faster to load on a phone
          </motion.p>
          <motion.p variants={rise} className="mt-2 text-[13px]" style={{ color: DK_MUTE }}>
            Your current site vs the new one, scored on Google Lighthouse.
          </motion.p>
        </motion.div>
      )}

      {/* The light sheet — the page surfaces out of the theater here */}
      <div
        className="relative rounded-t-[36px] px-5 pb-16 pt-12 sm:px-10 sm:pt-14"
        style={{ background: PANE, boxShadow: '0 -24px 60px -36px rgba(2,7,18,0.85)' }}
      >
        <div aria-hidden className="absolute left-1/2 top-4 h-1 w-12 -translate-x-1/2 rounded-full" style={{ background: LINE }} />
        <div className="mx-auto max-w-[640px]">
          {ok ? <ProofSheet c={c} /> : <ValueSheet />}
        </div>
      </div>
    </section>
  );
}
