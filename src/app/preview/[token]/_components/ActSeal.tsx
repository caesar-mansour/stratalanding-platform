'use client';

/*
 * Act 0 — "The Seal". The dark navy theater the lead lands in.
 * PERF CONTRACT: the <h1> (practice name) is the LCP — it must render visible at
 * first paint. Only transform-only .pv-rise touches it; opacity entrances (.pv-up)
 * are reserved for small non-LCP elements. Zero images, zero Framer Motion here —
 * the whole act is server-renderable markup + CSS.
 */

import { NIGHT, BRIGHT, DK_TEXT, DK_MUTE, DK_LINE, SERIF, SANS, UI, IconLock } from './bits';

// ≤1KB film grain, inlined so it costs no request.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export default function ActSeal({ practiceName, expiresText }: { practiceName: string; expiresText: string | null }) {
  return (
    <section
      data-act="seal"
      className="relative flex min-h-[100svh] flex-col overflow-visible px-6 pb-10 pt-6 sm:px-10"
      style={{ background: `linear-gradient(180deg, ${NIGHT} 0%, #071022 48%, #0B1B3A 100%)`, fontFamily: SANS }}
    >
      {/* iOS rubber-band shield — the body is light, the hero is dark */}
      <div aria-hidden className="absolute inset-x-0 -top-[60vh] h-[60vh]" style={{ background: NIGHT }} />

      {/* Atmosphere — pure CSS: spotlight cone + breathing cyan halo + grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-28%] h-[75vh] w-[130vw] -translate-x-1/2"
          style={{ background: 'radial-gradient(closest-side, rgba(34,211,238,0.13), rgba(34,211,238,0.045) 52%, transparent 74%)' }}
        />
        <div
          className="sl-pulse absolute left-1/2 top-[30%] h-[40vh] w-[80vw] -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(8,145,178,0.22), transparent 70%)', ['--sl-dur' as string]: '5s', animationDuration: '5s' }}
        />
        <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: GRAIN, opacity: 0.05 }} />
      </div>

      {/* Top bar — wordmark + private pill */}
      <div className="pv-up relative z-10 flex items-center justify-between" style={{ ['--pv-delay' as string]: '0.05s' }}>
        <div className="text-[17px] font-bold tracking-tight" style={{ fontFamily: SERIF, color: DK_TEXT }}>
          Strata<span style={{ color: BRIGHT }}>Landing</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ fontFamily: UI, border: `1px solid ${DK_LINE}`, color: DK_MUTE, background: 'rgba(10,20,40,0.45)' }}
        >
          <IconLock /> Private preview
        </span>
      </div>

      {/* Center — the seal */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-14 text-center">
        <p
          className="pv-up text-[10.5px] font-bold uppercase tracking-[0.34em] sm:text-[11.5px]"
          style={{ fontFamily: UI, color: BRIGHT, ['--pv-delay' as string]: '0.12s' }}
        >
          A private preview · prepared for
        </p>

        {/* THE LCP — visible at first paint, transform-only entrance */}
        <h1
          className="pv-rise mt-5 max-w-[13ch] text-balance font-semibold leading-[1.02] tracking-[-0.028em]"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(42px, 9.5vw, 92px)',
            color: DK_TEXT,
            backgroundImage: 'linear-gradient(180deg, #FFFFFF 30%, #BFE4F2 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {practiceName}
        </h1>

        <div aria-hidden className="pv-up mt-7 flex items-center gap-2" style={{ ['--pv-delay' as string]: '0.28s' }}>
          <span className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${DK_LINE})` }} />
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRIGHT, boxShadow: `0 0 12px 2px rgba(34,211,238,0.55)` }} />
          <span className="h-px w-12" style={{ background: `linear-gradient(90deg, ${DK_LINE}, transparent)` }} />
        </div>

        <div className="pv-rise mt-7 max-w-[46ch]" style={{ ['--pv-delay' as string]: '0.1s' }}>
          <p className="text-[17.5px] font-semibold" style={{ fontFamily: UI, color: DK_TEXT }}>
            Hi {practiceName} <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-3 text-[15.5px] leading-relaxed sm:text-[16.5px]" style={{ color: DK_MUTE }}>
            Like I mentioned on our call, I built you a brand-new website — faster, mobile-first, with online booking
            baked in. This is your private space to see it before anyone else does. No pressure.
          </p>
        </div>

        <p
          className="pv-up mt-9 font-mono text-[9.5px] uppercase tracking-[0.16em] sm:text-[10.5px] sm:tracking-[0.22em]"
          style={{ color: DK_MUTE, opacity: 0.85, ['--pv-delay' as string]: '0.42s' }}
        >
          Edition 1 of 1 · private link{expiresText ? <> · active until {expiresText}</> : null}
        </p>
      </div>

      {/* Scroll cue */}
      <div className="pv-up relative z-10 flex flex-col items-center gap-2 pb-2" style={{ ['--pv-delay' as string]: '0.6s' }}>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.3em]" style={{ fontFamily: UI, color: DK_MUTE }}>
          Scroll
        </span>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ border: `1px solid ${DK_LINE}`, color: BRIGHT }}
        >
          <svg className="sl-bounce" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </section>
  );
}
