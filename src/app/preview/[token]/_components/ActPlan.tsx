'use client';

/*
 * Act 3 — "How it works". The three steps (copy verbatim) on a drawn timeline:
 * horizontal ScrollDrawLine on desktop, vertical rail on mobile. Step 3 carries
 * the risk-reversal emphasis ("You only pay after you approve it").
 */

import { useRef } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ScrollDrawLine } from '@/components/motion/liquid';
import { INK, MUTE, LINE, TEAL, CYAN, GOOD_BG, GOOD_INK, PANE, SERIF, UI, IconLock } from './bits';

const STEPS = [
  { n: '1', label: 'Preview your new site', sub: "It's live right now — tap above" },
  { n: '2', label: 'Tell me you love it', sub: "One tap, that's it" },
  { n: '3', label: 'We make it live in 7–10 days', sub: 'You only pay after you approve it', lock: true },
];

function Circle({ n }: { n: string }) {
  return (
    <span
      className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold"
      style={{ fontFamily: UI, background: '#fff', border: `1.5px solid ${CYAN}`, color: TEAL, boxShadow: `0 0 0 5px ${PANE}, 0 8px 20px -8px rgba(8,145,178,0.35)` }}
    >
      {n}
    </span>
  );
}

export default function ActPlan() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const rise: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] } },
  };
  const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.14 } } };

  return (
    <section
      ref={ref}
      data-act="plan"
      className="[content-visibility:auto] [contain-intrinsic-size:auto_640px] px-5 py-14 sm:px-10 sm:py-20"
      style={{ background: PANE }}
    >
      <div className="mx-auto max-w-[960px]">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.24em]" style={{ fontFamily: UI, color: TEAL }}>
          How it works
        </p>

        {/* Desktop — horizontal timeline */}
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
          className="relative mt-12 hidden grid-cols-3 gap-8 sm:grid"
        >
          <div className="absolute left-[16%] right-[16%] top-[22px]" aria-hidden>
            <ScrollDrawLine orientation="horizontal" targetRef={ref} color={CYAN} width={2} />
          </div>
          {STEPS.map((s) => (
            <motion.div key={s.n} variants={rise} className="flex flex-col items-center text-center">
              <Circle n={s.n} />
              <p className="mt-4 text-[17px] font-semibold leading-tight" style={{ fontFamily: SERIF, color: INK }}>{s.label}</p>
              {s.lock ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold" style={{ background: GOOD_BG, color: GOOD_INK, fontFamily: UI }}>
                  <IconLock /> {s.sub}
                </p>
              ) : (
                <p className="mt-1.5 text-[13.5px] leading-snug" style={{ color: MUTE }}>{s.sub}</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile — vertical rail */}
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
          className="relative mt-10 flex flex-col gap-9 pl-[64px] sm:hidden"
        >
          <div className="absolute bottom-8 left-[21px] top-3" aria-hidden>
            <ScrollDrawLine orientation="vertical" targetRef={ref} color={CYAN} width={2} className="h-full" />
          </div>
          {STEPS.map((s) => (
            <motion.div key={s.n} variants={rise} className="relative">
              <span className="absolute -left-[64px] top-0"><Circle n={s.n} /></span>
              <p className="text-[16.5px] font-semibold leading-tight" style={{ fontFamily: SERIF, color: INK }}>{s.label}</p>
              {s.lock ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: GOOD_BG, color: GOOD_INK, fontFamily: UI }}>
                  <IconLock /> {s.sub}
                </p>
              ) : (
                <p className="mt-1 text-[13.5px] leading-snug" style={{ color: MUTE }}>{s.sub}</p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div aria-hidden className="mx-auto mt-14 h-px max-w-[520px] sm:mt-20" style={{ background: `linear-gradient(90deg, transparent, ${LINE}, transparent)` }} />
    </section>
  );
}
