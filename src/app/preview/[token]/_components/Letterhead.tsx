'use client';

/*
 * Letterhead — the gate as a hand-delivered letter (concept bake-off winner
 * 2026-07-13; ultra craft pass same day: 4 parallel lanes — paper & light,
 * the photograph, type & the human hand, motion — merged onto one clock).
 *
 * The argument: the DEMO SITE is the dark cinematic show — a daylight gate
 * makes clicking "View your new website" feel like the house lights going
 * down. And a 50-something practice owner trusts typeset paper on sight.
 *
 * What it is now: a top-lit sheet of stationery placed on a warm desk (a
 * second sheet peeking beneath, engraved hairline frame, 2.8% paper tooth),
 * the practice name as THEIR letterhead masthead over a drawn Scotch rule,
 * a pressed-ink postmark that stamps down, a fanned pair of photographs of
 * their new site (desktop + phone) that DEVELOP like instant film, real
 * Lighthouse numbers printed as a ruled lab-result strip, the question as
 * the letter's closing ask, and a Fraunces-italic signature whose flourish
 * draws itself like a pen stroke. Full timeline in globals.css (lh-*).
 *
 * LOAD-BEARING (verbatim funnel contract — do not rename):
 *  - onViewSite / onLike / onNotForMe handlers and their tracking labels
 *  - data-act="decision" (StickyBar hides near it; the return nudge targets it)
 *  - the h1 practice name is the LCP: SSR-visible, transform-only entrance
 *  - proof numbers are REAL Lighthouse only; no comparison → honest value line
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Magnetic } from '@/components/motion/liquid';
import {
  INK, SLATE, MUTE, TEAL, CYAN, SERIF, SANS, UI,
  IconArrow, IconCheck, IconHeart, IconLock,
  type Comparison,
} from './bits';

const UMBRELLA_ORIGIN = 'https://previews.example.com';

const DESK = '#EFECE7';   // warm desk the sheet sits on
const PAPER = '#FCFBF9';  // the sheet
const RULE = 'rgba(11,27,58,0.12)';
// Fraunces — loaded globally in src/app/layout.tsx as --font-display with true
// italics enabled for this letter's signature (synthesized oblique reads fake).
const SCRIPT = "var(--font-display, 'Fraunces', Georgia, serif)";

interface Props {
  practiceName: string;
  expiresText: string | null;
  slug: string;
  hasShot: boolean;
  siteHref: string;
  siteViewed: boolean;
  comparison: Comparison | null;
  pulseKey: number;
  onViewSite: () => void;
  onLike: () => void;
  onNotForMe: () => void;
}

/* ---------- the postmark: privacy + expiry wearing an analog costume ---------- */

function Postmark({ expiresText }: { expiresText: string | null }) {
  const ring = `PRIVATE LINK${expiresText ? ` · ACTIVE UNTIL ${expiresText.toUpperCase()}` : ''} · `;
  return (
    <svg
      viewBox="0 0 120 120"
      className="lh-stamp h-[76px] w-[76px] sm:h-[96px] sm:w-[96px]"
      aria-label={`Private link${expiresText ? `, active until ${expiresText}` : ''}, edition one of one`}
      role="img"
    >
      <defs>
        <path id="lh-ring" d="M 60,60 m -47,0 a 47,47 0 1,1 94,0 a 47,47 0 1,1 -94,0" />
        {/* Pressed-ink filter: micro-displacement wobbles every edge, then a second
            noise field erodes faint pinholes out of the ink. Static — renders once.
            Vector-perfect edges are the one thing real rubber stamps never have. */}
        <filter id="lh-ink" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.38" numOctaves="2" seed="7" result="wobble" />
          <feDisplacementMap in="SourceGraphic" in2="wobble" scale="1.7" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="23" result="paper" />
          <feColorMatrix in="paper" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 8 -1.2" result="press" />
          <feComposite in="rough" in2="press" operator="in" />
        </filter>
      </defs>
      <g filter="url(#lh-ink)">
        <circle cx="60" cy="60" r="56" fill="none" stroke={CYAN} strokeWidth="2.5" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={CYAN} strokeWidth="1.5" />
        <text fontSize="10.5" fontWeight="700" letterSpacing="1.8" fill={CYAN} style={{ fontFamily: 'Inter, sans-serif' }}>
          <textPath href="#lh-ring">{ring}</textPath>
        </text>
        <text x="60" y="57" textAnchor="middle" fontSize="15" fontWeight="800" fill={CYAN} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>1 OF 1</text>
        <text x="60" y="72" textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing="1.5" fill={CYAN} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>EDITION</text>
      </g>
    </svg>
  );
}

/* ---------- the photographs: their site, developing on the desk ---------- */

/* Washi tape — a translucent strip of paper tape holding the photo to the
   letter. Torn ends via clip-path, faint fiber striping, and the page reading
   through the tape is what sells it as a real object. */
function WashiTape({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-[2] block h-[22px] w-[72px] sm:h-[26px] sm:w-[88px] ${className}`}
      style={{
        background:
          'repeating-linear-gradient(105deg, rgba(11,27,58,0.03) 0 1px, rgba(255,255,255,0) 1px 5px), linear-gradient(180deg, rgba(246,242,235,0.72), rgba(234,228,217,0.78))',
        boxShadow: '0 1px 2px rgba(11,27,58,0.12)',
        clipPath:
          'polygon(0% 8%, 3.5% 0%, 96.5% 3%, 100% 12%, 98% 50%, 100% 88%, 96% 100%, 4.5% 97%, 0% 90%, 2% 48%)',
      }}
    />
  );
}

const GLOSS = 'linear-gradient(118deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.04) 58%, rgba(255,255,255,0) 66%)';

function Polaroid({ slug, hasShot, practiceName, siteHref, onViewSite }: {
  slug: string; hasShot: boolean; practiceName: string; siteHref: string; onViewSite: () => void;
}) {
  // Static resting transforms live inline so the tilt survives reduced-motion
  // (keyframes override them while running; fill-mode lands on the same values).
  // No inline opacity:0 — hiding lives in the .lh-lay/.lh-lay-back classes so
  // reduced-motion renders the prints instead of hiding them forever.
  return (
    <div className="lh-lay relative" style={{ transform: 'rotate(-2deg)', ['--lh-delay' as string]: '0.7s' }}>
      <a
        href={siteHref}
        onClick={onViewSite}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the new ${practiceName} website in a new tab`}
        className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
        style={{ ['--tw-ring-color' as string]: CYAN, ['--tw-ring-offset-color' as string]: PAPER }}
      >
        {/* The second print: the phone shot resting in the stack behind (desktop
            only), set down a beat later, fanned the other way. Its wrapper
            carries a filled animation, so the hover fan-out lives on the CHILD.
            Whole group is one link — clicking either print opens the site. */}
        {hasShot && (
          <div
            aria-hidden="true"
            className="lh-lay-back absolute -right-7 -top-7 z-0 hidden w-[34%] lg:block"
            style={{ transform: 'rotate(7deg)', ['--lh-delay' as string]: '1s' }}
          >
            <div
              className="rounded-[5px] bg-white p-2 pb-3.5 transition-transform duration-500 group-hover:translate-x-1.5 group-hover:rotate-[2.5deg] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:rotate-0"
              style={{ boxShadow: '0 1px 3px rgba(11,27,58,0.10), 0 16px 32px -16px rgba(11,27,58,0.24)' }}
            >
              <div className="lh-develop relative overflow-hidden rounded-[2px]" style={{ background: '#0E1B33', aspectRatio: '9 / 14', ['--lh-delay' as string]: '1.3s' }}>
                <Image
                  src={`/preview-shots/${slug}-m.webp`}
                  alt=""
                  width={780}
                  height={1688}
                  unoptimized
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: GLOSS }} />
              </div>
            </div>
          </div>
        )}

        {/* The front print. Hover lift lives HERE (child of the keyframed element) —
            animation fill beats hover on the parent. The tapes hold this photo to
            the letter, so they live ON the card and travel with it. */}
        <div
          className="relative z-[1] rounded-[6px] bg-white p-3.5 pb-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-0"
          style={{ boxShadow: '0 1px 2px rgba(11,27,58,0.12), 0 8px 16px -8px rgba(11,27,58,0.14), 0 24px 52px -18px rgba(11,27,58,0.28)' }}
        >
          <div className="lh-develop relative overflow-hidden rounded-[3px]" style={{ background: '#0E1B33', ['--lh-delay' as string]: '0.95s' }}>
            {hasShot ? (
              <>
                {/* Desktop paper: the wide shot. Mobile paper: the phone shot reads truer. */}
                <Image
                  src={`/preview-shots/${slug}-d.webp`}
                  alt={`Photograph of the new ${practiceName} website`}
                  width={1792}
                  height={1120}
                  unoptimized
                  loading="eager"
                  className="hidden w-full transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:block"
                />
                <Image
                  src={`/preview-shots/${slug}-m.webp`}
                  alt={`Photograph of the new ${practiceName} website`}
                  width={780}
                  height={1688}
                  unoptimized
                  loading="eager"
                  className="max-h-[420px] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:hidden"
                />
              </>
            ) : (
              <div className="skeleton w-full" style={{ aspectRatio: '1792 / 1120', borderRadius: 0 }} />
            )}
            {/* print gloss — one static diagonal highlight, light on the emulsion */}
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: GLOSS }} />
          </div>
          {/* Pen note under the print — the same hand that signs the letter */}
          <p
            className="mt-3.5 text-center text-[15px] italic leading-snug"
            style={{ color: SLATE, fontFamily: SCRIPT, fontWeight: 400, transform: 'rotate(-0.6deg)', letterSpacing: '0.01em' }}
          >
            {practiceName} — built, and live today
          </p>
          <WashiTape className="-left-6 -top-2 rotate-[-45deg] sm:-left-8 sm:-top-3" />
          <WashiTape className="-right-6 -bottom-2 rotate-[-45deg] sm:-right-8 sm:-bottom-3" />
        </div>
      </a>
    </div>
  );
}

/* ---------- proof printed like a ruled lab-result strip (real numbers only) ---------- */

function fmtMeasured(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/* lab cells print one at a time — 2.10 / 2.22 / 2.34 — as the photo finishes developing */
const CELL_BEATS = ['2.1s', '2.22s', '2.34s'];

function Cell({ label, first, delay, children }: { label: string; first?: boolean; delay: string; children: React.ReactNode }) {
  return (
    <div
      className={`pv-up ${first ? 'pr-3 sm:pr-4' : 'px-3 sm:px-4'}`}
      style={{ ...(first ? {} : { borderLeft: `1px solid ${RULE}` }), ['--pv-delay' as string]: delay }}
    >
      <p className="whitespace-nowrap text-[9.5px] font-bold uppercase" style={{ fontFamily: UI, color: MUTE, letterSpacing: '0.16em' }}>
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-[13.5px] font-semibold tabular-nums sm:text-[15px]" style={{ fontFamily: UI, color: INK }}>
        {children}
      </p>
    </div>
  );
}

function ProofLine({ comparison }: { comparison: Comparison | null }) {
  const ok = Boolean(comparison && comparison.current && comparison.spec);
  if (!ok) {
    return (
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5 border-y py-3" style={{ borderColor: RULE }}>
        {['Fast on every phone', 'Online booking, baked in', 'Made to be found on Google'].map((t, i) => (
          <span key={t} className="pv-up inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ fontFamily: UI, color: INK, ['--pv-delay' as string]: CELL_BEATS[i] }}>
            <span style={{ color: TEAL }}><IconCheck className="h-3 w-3" /></span>
            {t}
          </span>
        ))}
      </div>
    );
  }
  const c = comparison as Comparison;
  const cur = c.current, spec = c.spec;
  // Same math as every gate before it — verbatim, real Lighthouse only.
  const faster = Math.max(2, Math.round(cur.lcp_s / Math.max(spec.lcp_s, 0.1)));
  return (
    <div className="mt-4">
      <div className="flex overflow-x-auto border-y py-3" style={{ borderColor: RULE }}>
        <Cell first label="Result" delay={CELL_BEATS[0]}>
          <span style={{ color: TEAL }}>{faster}× faster</span>
        </Cell>
        <Cell label="Load time" delay={CELL_BEATS[1]}>
          <span style={{ color: MUTE }}>{cur.lcp_s}s</span>
          <span aria-hidden="true" style={{ color: MUTE }}> → </span>
          <span className="sr-only"> to </span>
          {spec.lcp_s}s
        </Cell>
        <Cell label="Lighthouse" delay={CELL_BEATS[2]}>
          <span style={{ color: MUTE }}>{cur.perf}</span>
          <span aria-hidden="true" style={{ color: MUTE }}> → </span>
          <span className="sr-only"> to </span>
          {spec.perf}
          <span style={{ color: MUTE }}>/100</span>
        </Cell>
      </div>
      <p className="pv-up mt-2 text-[10.5px] uppercase" style={{ color: MUTE, fontFamily: UI, letterSpacing: '0.14em', ['--pv-delay' as string]: '2.42s' }}>
        Your site vs the new one{c.measured_at ? <> · measured {fmtMeasured(c.measured_at)}</> : null} · Google Lighthouse
      </p>
    </div>
  );
}

/* ---------- the letter ---------- */

export default function Letterhead({
  practiceName, expiresText, slug, hasShot, siteHref, siteViewed, comparison, pulseKey,
  onViewSite, onLike, onNotForMe,
}: Props) {
  const warmed = useRef(false);
  const [spot, setSpot] = useState(false);          // return-from-tab "lit ink" beat
  const lastPulse = useRef(pulseKey);

  // Preconnect + warm the confetti chunk off the critical path.
  useEffect(() => {
    if (warmed.current) return;
    warmed.current = true;
    for (const rel of ['preconnect', 'dns-prefetch']) {
      if (document.head.querySelector(`link[rel="${rel}"][href="${UMBRELLA_ORIGIN}"]`)) continue;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = UMBRELLA_ORIGIN;
      document.head.appendChild(link);
    }
    const t = setTimeout(() => { import('./burst').catch(() => {}); }, 1400);
    return () => clearTimeout(t);
  }, []);

  // pulseKey increments when they return from the demo tab: dim the letter for a
  // beat so the question is the only "lit ink" on the page, then release.
  useEffect(() => {
    if (pulseKey === lastPulse.current) return;
    lastPulse.current = pulseKey;
    setSpot(true);
    const t = setTimeout(() => setSpot(false), 1600);
    return () => clearTimeout(t);
  }, [pulseKey]);

  const dateline = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div
      className="flex min-h-[100svh] items-center justify-center px-3 py-6 sm:px-6 sm:py-10"
      style={{
        // One soft light source above the desk: brightest where the sheet sits,
        // falling to a gentle vignette. Static gradient — paints once.
        background: `radial-gradient(1100px 780px at 50% 22%, #F6F3ED 0%, ${DESK} 52%, #E6E2DA 100%)`,
        fontFamily: SANS,
      }}
    >
      {/* The sheet arrives (transform-only WRAPPER — the section itself stays
          transform-free so its -z-10 under-sheet never loses its stacking home
          and the h1 LCP inside paints at frame one) */}
      <div className="lh-sheet relative w-full max-w-[1080px]">
        <section
          data-spot={spot ? '1' : '0'}
          className="relative w-full rounded-[20px] p-6 pb-24 sm:p-10 lg:p-14 lg:pb-14"
          style={{
            // Top-lit paper: a whisper brighter along the top, then true paper —
            // agrees with the desk's light source above.
            background: `linear-gradient(180deg, #FDFDFB 0%, ${PAPER} 130px)`,
            boxShadow: [
              'inset 0 1.5px 0 rgba(255,255,255,0.9)',   // light catching the top edge of the sheet
              'inset 0 0 0 1px rgba(11,27,58,0.035)',    // the cut edge of the paper itself
              '0 1px 2px rgba(11,27,58,0.09)',           // contact shadow — where sheet meets desk
              '0 3px 9px -2px rgba(11,27,58,0.07)',      // contact bleed
              '0 34px 80px -30px rgba(11,27,58,0.20)',   // ambient occlusion — the room's light
              '0 90px 160px -70px rgba(11,27,58,0.13)',  // far ambient falloff
            ].join(', '),
          }}
        >
          {/* The stack: a second sheet of the same stationery beneath, a half-degree
              off square — correspondence, not a UI card. Static. Paints behind the
              section's own background via -z-10 (the section has no transform/filter,
              so it is NOT a stacking context — keep it that way). */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-[20px]"
            style={{
              transform: 'rotate(0.6deg) translateY(7px)',
              background: '#F5F1EA',
              boxShadow: '0 2px 5px rgba(11,27,58,0.07), 0 18px 44px -22px rgba(11,27,58,0.22)',
            }}
          />
          {/* Engraved rule: one hairline printed frame just inside the sheet's edge,
              like letterpress stationery. The postmark deliberately overlaps it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[10px] rounded-[13px] sm:inset-[14px]"
            style={{ border: '1px solid rgba(11,27,58,0.07)' }}
          />

          {/* Postmark — stamps down 0.08–0.40s (scale 1.28 → 0.97 slam → 1);
              trust chrome is settled before anything else moves */}
          <div className="lh-dim absolute right-4 top-4 sm:right-8 sm:top-8">
            <Postmark expiresText={expiresText} />
          </div>

          {/* ── Letterhead masthead: THEIR name ─────────────────────────── */}
          <div className="lh-dim">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ fontFamily: UI, color: TEAL }}>
              Private · prepared for
            </p>
            {/* THE LCP — in-flow, opaque at first paint, transform-only settle.
                Optical size: display type wants tighter tracking than text type. */}
            <h1
              className="lh-settle mt-2.5 max-w-[16ch] pr-20 text-balance font-semibold leading-[1.04] tracking-[-0.026em] sm:pr-28"
              style={{ fontFamily: SERIF, fontSize: 'clamp(38px, 5.2vw, 68px)', color: INK }}
            >
              {practiceName}
            </h1>
            {/* Scotch rule — the classic stationery double rule, drawn left → right */}
            <div className="lh-rule mt-6" aria-hidden="true">
              <div style={{ height: 2, background: INK }} />
              <div className="mt-[3px] h-px" style={{ background: RULE }} />
            </div>
            {/* Dateline row: sender flush left, date set right in tracked small caps */}
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <p className="text-[14px]" style={{ color: SLATE }}>
                From <b style={{ color: INK }}>Caesar</b> at StrataLanding
              </p>
              <p
                className="shrink-0 text-[12.5px] font-semibold"
                style={{ color: SLATE, fontVariantCaps: 'small-caps', letterSpacing: '0.14em' }}
              >
                {dateline}
              </p>
            </div>
          </div>

          {/* ── Body: letter left · photographs right ───────────────────── */}
          <div className="mt-8 grid gap-10 sm:mt-10 lg:grid-cols-[52fr_44fr] lg:gap-14">

            {/* The letter */}
            <div className="order-2 lg:order-1">
              <div
                className="lh-dim max-w-[56ch] space-y-[1.1em] text-[16.5px] leading-[1.72] sm:text-[17.5px] sm:leading-[1.74]"
                style={{ color: INK, ['textWrap' as string]: 'pretty' }}
              >
                <p className="pv-up" style={{ ['--pv-delay' as string]: '0.45s' }}>
                  Hi <span aria-hidden="true">👋</span> — like I said on our call, I went ahead and built{' '}
                  {practiceName} a brand-new website. It&apos;s not a mockup — it&apos;s{' '}
                  <b>live right now</b>, one tap away.
                </p>
                <p className="pv-up" style={{ ['--pv-delay' as string]: '0.62s' }}>
                  Easiest test: open it on your phone next to your current site. You&apos;ll feel the
                  difference in a few seconds.
                </p>
                <p className="pv-up" style={{ ['--pv-delay' as string]: '0.79s' }}>
                  Anything you see can be changed — the design, the photos, the words. That&apos;s the
                  point of showing you first.
                </p>
              </div>

              {/* The question — the letter's closing ask. data-act is load-bearing. */}
              <div data-act="decision" className="relative mt-8">
                <p className="pv-up text-[21px] font-semibold sm:text-[22px]" style={{ fontFamily: SERIF, color: INK, ['--pv-delay' as string]: '2.5s' }}>
                  {/* the return-from-tab +2% breath lives on a CHILD span — swapping an
                      animation on the filled pv-up node would restart its entrance */}
                  <span className={spot ? 'lh-askpulse' : undefined}>One question when you&apos;re back:</span>
                </p>
                {/* Lit-ink underline draws when they return from the demo tab */}
                {spot && (
                  <span aria-hidden className="lh-underline absolute -bottom-1 left-0 block h-[3px] w-56 rounded-full" style={{ background: CYAN }} />
                )}
                <div className="pv-up mt-4 flex flex-col gap-2.5 sm:flex-row" style={{ ['--pv-delay' as string]: '2.62s' }}>
                  <Magnetic className="sm:flex-1" strength={0.2}>
                    <button
                      type="button"
                      onClick={onLike}
                      className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15.5px] font-bold transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      style={{
                        fontFamily: UI,
                        background: siteViewed ? `linear-gradient(180deg, #0aa6c9, ${CYAN})` : '#fff',
                        color: siteViewed ? '#fff' : TEAL,
                        border: siteViewed ? 'none' : `1.5px solid ${CYAN}`,
                        boxShadow: siteViewed ? '0 14px 30px -12px rgba(8,145,178,0.5)' : 'none',
                        ['--tw-ring-color' as string]: CYAN,
                      }}
                    >
                      <IconHeart /> I love it — let&apos;s do it
                    </button>
                  </Magnetic>
                  <button
                    type="button"
                    onClick={onNotForMe}
                    className="min-h-[50px] rounded-full px-6 text-[14.5px] font-semibold transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2"
                    style={{ fontFamily: UI, color: SLATE, border: `1px solid ${RULE}`, background: 'transparent', ['--tw-ring-color' as string]: CYAN }}
                  >
                    Not for me
                  </button>
                </div>
                <p className="pv-up mt-3.5 flex items-start gap-1.5 text-[12.5px] leading-snug" style={{ fontFamily: UI, color: SLATE, ['--pv-delay' as string]: '2.74s' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: TEAL }}><IconLock /></span>
                  <span>Saying yes costs nothing today — you only pay after you approve the finished site.</span>
                </p>
              </div>

              {/* Sign-off — a real hand: Fraunces italic signature, flourish drawn like
                  a pen stroke after everything settles. pv-up sits on INNER divs —
                  never on the lh-dim element itself, or the filled opacity animation
                  would override the data-spot dim. */}
              <div className="lh-dim mt-9 border-t pt-5" style={{ borderColor: RULE }}>
                <div className="pv-up inline-block" style={{ ['--pv-delay' as string]: '2.9s' }}>
                  <p
                    aria-hidden="true"
                    className="text-[31px] leading-none"
                    style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontWeight: 500, color: INK, transform: 'rotate(-2.5deg)', letterSpacing: '0.015em' }}
                  >
                    Caesar
                  </p>
                  <svg
                    className="mt-1 block" width="126" height="12" viewBox="0 0 126 12" fill="none" aria-hidden="true"
                    style={{ transform: 'rotate(-2deg)' }}
                  >
                    <path
                      className="lh-sign"
                      d="M2 8.5 C 24 2.5, 52 11.5, 78 6.5 C 92 3.8, 106 6.8, 124 3.5"
                      stroke={INK} strokeWidth="1.3" strokeLinecap="round"
                      pathLength={1} strokeDasharray="1"
                    />
                  </svg>
                </div>
                <div className="pv-up mt-3.5 flex items-center gap-3" style={{ ['--pv-delay' as string]: '3s' }}>
                  <Image src="/brand/stratalanding.png" alt="" width={22} height={23} className="object-contain" />
                  <div>
                    <p className="text-[13.5px] font-semibold" style={{ fontFamily: UI, color: SLATE }}>— Caesar, StrataLanding</p>
                    <p className="text-[12.5px]" style={{ color: MUTE }}>Async studio · no sales calls · questions? Text me back on the number that called you.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* The photographs — dim with the letter during the lit-ink beat */}
            <div className="lh-dim order-1 lg:order-2">
              <Polaroid slug={slug} hasShot={hasShot} practiceName={practiceName} siteHref={siteHref} onViewSite={onViewSite} />
              <ProofLine comparison={comparison} />
              <div className="pv-up mt-5" style={{ ['--pv-delay' as string]: '2.35s' }}>
                {siteViewed ? (
                  <a
                    href={siteHref}
                    onClick={onViewSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[14.5px] font-semibold underline underline-offset-4 transition-opacity hover:opacity-75"
                    style={{ fontFamily: UI, color: TEAL }}
                  >
                    <IconCheck className="h-4 w-4" /> Open it again — it stays live
                  </a>
                ) : (
                  <a
                    href={siteHref}
                    onClick={onViewSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex min-h-[52px] w-full items-center justify-between gap-3 overflow-hidden rounded-full px-6 text-[16px] font-bold transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    style={{
                      fontFamily: UI,
                      background: `linear-gradient(180deg, #0aa6c9, ${CYAN})`,
                      color: '#fff',
                      boxShadow: '0 16px 34px -14px rgba(8,145,178,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                      ['--tw-ring-color' as string]: CYAN,
                      ['--tw-ring-offset-color' as string]: PAPER,
                    }}
                  >
                    {/* one soft sheen pass after the whole letter has gone still */}
                    <span
                      aria-hidden
                      className="cs-shimmer pointer-events-none absolute inset-y-0 left-0 w-[35%]"
                      style={{ opacity: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', ['--cs-delay' as string]: '3.6s' }}
                    />
                    <span className="flex flex-col text-left leading-tight">
                      View your new website
                      <span className="text-[11.5px] font-semibold opacity-80">Opens in a new tab · it&apos;s live right now</span>
                    </span>
                    <IconArrow className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Paper tooth: tiled SVG turbulence at 2.8%, multiply, over EVERYTHING —
              headline, letter, photographs, buttons — so every element reads as
              printed on one physical sheet. Grayscaled (saturate 0) so it never
              tints the cyan. Static, painted once. pointer-events-none. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[20px]"
            style={{
              opacity: 0.028,
              mixBlendMode: 'multiply',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23p)'/%3E%3C/svg%3E")`,
              backgroundSize: '180px 180px',
            }}
          />
        </section>
      </div>
    </div>
  );
}
