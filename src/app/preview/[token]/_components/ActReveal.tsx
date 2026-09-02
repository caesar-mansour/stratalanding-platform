'use client';

/*
 * Act 1 — "The Reveal". Their new website rises into a glowing device frame,
 * scrubbed by scroll (unpinned; transform/opacity only — no springs chained to
 * scroll, no blur animation). Mobile: phone frame. Desktop (lg+): browser frame
 * + floating phone duo.
 *
 * PERF: screenshots are below the fold — lazy, explicit dimensions (CLS 0),
 * pre-encoded WebP served as-is (`unoptimized`). A one-shot IntersectionObserver
 * preconnects to the umbrella host before the CTA is tapped. No screenshot for
 * this slug → .skeleton shimmer inside the same frame, same CTA.
 */

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { BRIGHT, DK_TEXT, DK_MUTE, DK_LINE, SERIF, UI, IconArrow, IconCheck } from './bits';

const UMBRELLA_ORIGIN = 'https://previews.example.com';

interface Props {
  slug: string;
  hasShot: boolean;
  practiceName: string;
  siteHref: string;
  onViewSite: () => void;
}

function Screen({ slug, hasShot, practiceName, variant }: { slug: string; hasShot: boolean; practiceName: string; variant: 'm' | 'd' }) {
  if (!hasShot) return <div className="skeleton h-full w-full" style={{ borderRadius: 0 }} />;
  const dims = variant === 'm' ? { width: 780, height: 1688 } : { width: 1440, height: 900 };
  return (
    <Image
      src={`/preview-shots/${slug}-${variant}.webp`}
      alt={`Preview of the new ${practiceName} website`}
      {...dims}
      unoptimized
      loading="lazy"
      className="h-full w-full object-cover object-top"
    />
  );
}

function PhoneFrame({ slug, hasShot, practiceName, className = '' }: { slug: string; hasShot: boolean; practiceName: string; className?: string }) {
  return (
    <div className={className}>
      <div
        className="rounded-[46px] p-[10px]"
        style={{
          background: 'linear-gradient(180deg, #17284a, #0A1730)',
          border: '1px solid rgba(147,167,196,0.28)',
          boxShadow:
            '0 50px 100px -34px rgba(2,7,18,0.9), 0 0 0 1px rgba(34,211,238,0.10), 0 0 90px -18px rgba(34,211,238,0.28)',
        }}
      >
        <div className="relative overflow-hidden rounded-[37px]" style={{ aspectRatio: '390 / 844', background: '#0E1B33' }}>
          <Screen slug={slug} hasShot={hasShot} practiceName={practiceName} variant="m" />
        </div>
      </div>
    </div>
  );
}

function BrowserFrame({ slug, hasShot, practiceName }: { slug: string; hasShot: boolean; practiceName: string }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        border: '1px solid rgba(147,167,196,0.24)',
        background: '#0A1730',
        boxShadow: '0 60px 120px -40px rgba(2,7,18,0.95), 0 0 0 1px rgba(34,211,238,0.08), 0 0 110px -22px rgba(34,211,238,0.24)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: `1px solid ${DK_LINE}`, background: 'rgba(8,16,34,0.85)' }}>
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28C840' }} />
        </span>
        <span
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-md px-3 py-1 font-mono text-[11px]"
          style={{ background: 'rgba(147,167,196,0.10)', color: DK_MUTE }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          previews.example.com/{slug}
        </span>
        <span className="w-10" aria-hidden />
      </div>
      <div className="relative" style={{ aspectRatio: '1440 / 900' }}>
        <Screen slug={slug} hasShot={hasShot} practiceName={practiceName} variant="d" />
      </div>
    </div>
  );
}

export default function ActReveal({ slug, hasShot, practiceName, siteHref, onViewSite }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Scroll-scrubbed entrance: the frame straightens + settles as it rises into view.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.28'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [72, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  // Desktop floating phone drifts on its own offset range.
  const phoneY = useTransform(scrollYProgress, [0, 1], [120, -12]);

  // Preconnect to the umbrella host the moment the reveal approaches the viewport,
  // so the "View your new website" tap starts warm.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        for (const rel of ['preconnect', 'dns-prefetch']) {
          const link = document.createElement('link');
          link.rel = rel;
          link.href = UMBRELLA_ORIGIN;
          document.head.appendChild(link);
        }
      },
      { rootMargin: '150% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      data-act="reveal"
      className="relative overflow-hidden px-5 pb-20 pt-14 sm:px-10 sm:pb-24"
      style={{ background: 'linear-gradient(180deg, #0B1B3A 0%, #0A1834 60%, #0B1D3E 100%)' }}
    >
      {/* Stage glow behind the frame */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[34%] h-[60vh] w-[120vw] -translate-x-1/2"
        style={{
          background: 'radial-gradient(closest-side, rgba(34,211,238,0.17), rgba(8,145,178,0.06) 55%, transparent 75%)',
          opacity: reduce ? 1 : glowOpacity,
        }}
      />

      <div className="relative mx-auto max-w-[1120px]">
        <div className="text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.3em]" style={{ fontFamily: UI, color: BRIGHT }}>
            Your new website
          </p>
          <p className="mt-2.5 text-[15px]" style={{ color: DK_MUTE }}>
            Built for <span className="font-semibold" style={{ color: DK_TEXT }}>{practiceName}</span> · live now
          </p>
        </div>

        {/* The frame — perspective parent, scrubbed child */}
        <div className="mt-10 sm:mt-14" style={{ perspective: 1300 }}>
          <motion.div style={reduce ? undefined : { rotateX, y, scale, transformStyle: 'preserve-3d' }}>
            {/* Mobile: phone is the hero */}
            <PhoneFrame slug={slug} hasShot={hasShot} practiceName={practiceName} className="mx-auto w-[min(320px,82vw)] lg:hidden" />
            {/* Desktop: browser + floating phone duo */}
            <div className="relative hidden lg:block">
              <div className="mx-auto max-w-[880px]">
                <BrowserFrame slug={slug} hasShot={hasShot} practiceName={practiceName} />
              </div>
              <motion.div className="absolute -right-2 bottom-[-56px] xl:right-6" style={reduce ? undefined : { y: phoneY }}>
                <PhoneFrame slug={slug} hasShot={hasShot} practiceName={practiceName} className="w-[188px]" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* CTA — same copy, same tracking, opens the real site in a new tab */}
        <div className="relative z-10 mx-auto mt-12 max-w-[460px] sm:mt-16">
          <a
            href={siteHref}
            onClick={onViewSite}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 rounded-2xl text-[17px] font-bold transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            style={{
              fontFamily: UI,
              background: 'linear-gradient(180deg, #22D3EE, #0891B2)',
              color: '#04121F',
              padding: '18px 24px',
              boxShadow: '0 20px 44px -16px rgba(34,211,238,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
              ['--tw-ring-color' as string]: BRIGHT,
            }}
          >
            <span className="flex flex-col text-left leading-tight">
              View your new website
              <span className="text-[12px] font-semibold opacity-70">Opens in a new tab</span>
            </span>
            <IconArrow className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
          </a>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12.5px]" style={{ color: DK_MUTE }}>
            <IconCheck className="h-3.5 w-3.5" />
            It&apos;s live right now — tap above
          </p>
        </div>
      </div>
    </section>
  );
}
