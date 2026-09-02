"use client";

/**
 * NLRoot — the one client island on the homepage.
 *
 * Mounts the ported scroll engine, and renders the fixed chrome the engine
 * drives: NLChrome (the one header, the intro curtain, the blueprint reveal),
 * the scroll progress bar, the numbered right rail, and the labelled cursor.
 * Everything else on the page is a server component.
 *
 * TWO GATES, not one. NLChrome renders at EVERY tier and in server HTML,
 * because it owns the homepage's only fixed header and the site's navigation
 * cannot be behind a JS gate. Everything else here is scene furniture and stays
 * tier B only.
 *
 * THE GATE. The engine mounts on tier B ONLY — desktop >=1025px, fine pointer,
 * motion enabled, device not low-end. On everything else it never loads, and
 * nl.css has already unpinned every stage into an ordinary stacked section. So
 * a phone runs this page with zero scroll JavaScript, which is the whole mobile
 * strategy: unpin, don't shrink.
 *
 * useLayoutEffect (client-only, guarded for SSR) rather than useEffect, so the
 * engine's first frame lands before paint. Stage layers render VISIBLE in SSR
 * and the engine sequences them from there; without that ordering the first
 * painted frame would show every act of every scene stacked on top of itself.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useStrataTier } from "@/components/strata/tier";
import { NLEngine } from "./engine/NLEngine";
import { NLChrome } from "./NLChrome";

/** The rail's entries. Order and labels match the sections in the page. */
const RAIL = [
  ["01", "Journey", "#what-we-build"],
  ["02", "System", "#system"],
  ["03", "Anatomy", "#proof"],
  ["04", "Compare", "#compare"],
  ["05", "Spine", "#spine"],
  ["06", "Portal", "#portal"],
  ["07", "Process", "#how-it-works"],
  ["08", "The math", "#math"],
  ["09", "Receipts", "#receipts"],
  ["10", "Pricing", "#pricing"],
  ["11", "Studio", "#start"],
] as const;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function NLRoot() {
  const tier = useStrataTier();
  const engineRef = useRef<NLEngine | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (tier !== "B") return;
    const engine = new NLEngine({
      /* THE SPEC'S VALUE, and it is load-bearing. collect() writes
         `760 * scrollPace` onto the journey stage — and only that stage; every
         other scene keeps the height its markup declares. The handoff README
         lists the default as 1.6, and the rendered reference measures 12.2
         viewport-heights for journey, which is 760 x 1.6. Passing 0.6 here ran
         the opening film at 456vh instead of 1216 and played the whole four-act
         sequence at a third of its intended length. The beats are keyed to
         scroll DISTANCE, not to a duration. */
      scrollPace: 1.6,
      // The engine has its own spring-damped wheel smoothing. Lenis is NOT
      // mounted on this route — two smoothing layers fight, and the engine's
      // is the one the scene timings were tuned against.
      smoothScroll: true,
      customCursor: true,
      showAnnotations: true,
    });
    engineRef.current = engine;
    engine.mount();
    return () => {
      try {
        engine.unmount();
      } catch {
        /* unmount is best-effort; a throw here must never break navigation */
      }
      engineRef.current = null;
    };
  }, [tier]);

  /* NLChrome needs the engine to close a blueprint reveal (setBlueprint is a
     latch and the engine is generated code). A live accessor, not the instance
     — engineRef is filled in the layout effect above, after NLChrome has
     already rendered and run its own effects. */
  const getEngine = useCallback(() => engineRef.current, []);

  return (
    <>
      {/* THE ONE FIXED HEADER, at every tier and in server HTML — plus the
          intro curtain and the blueprint reveal, which are tier B only.
          MarketingChrome no longer renders the global <Navbar> on `/`; see the
          header decision at the top of NLChrome.tsx. This must render OUTSIDE
          the tier gate below: tier resolves to "A" during SSR and on the first
          client render, so anything behind that gate is absent from the served
          HTML — which for the site's navigation is not acceptable. */}
      <NLChrome tier={tier} getEngine={getEngine} />

      {/* Everything below is desktop-scene furniture and ships on tier B only. */}
      {tier !== "B" ? null : (
        <>
      {/* Scroll progress — 2px, top edge, driven by scaleX. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[95] h-[2px]"
        style={{ background: "var(--nl-r06)" }}
      >
        <div
          data-anim="progbar"
          className="h-full origin-left"
          style={{ background: "var(--nl-accent)", transform: "scaleX(0)" }}
        />
      </div>

      {/* The right rail — 11 numbered entries. The engine lights the active one
          and grows its trailing line from 14px to 30px.

          THE HOOK IS `data-rail`, NOT `data-anim="railitem"`. Two different
          things in the engine share the word "rail":
            shell()    drives THIS rail from `[data-rail="<section id>"]` +
                       `[data-railline]`, picking the active entry off the same
                       45% reading line the session recorder uses.
            journey()  drives the FOUR in-scene entries of the opening film from
                       `[data-anim="railitem"]`, reading `data-a`/`data-b` off
                       each one.
          These entries carried the journey key and no data-a/data-b, so the
          moment the journey stage existed the film wrote all eleven of them
          every frame: parseFloat(undefined) is NaN, every window test fails,
          and the engine pinned them at opacity 0.3 and turned each label span
          (firstElementChild) into a 22px grey bar. Visible as a column of grey
          blocks down the right edge. Swapping to the hook shell() actually
          reads both removes the collision AND lights the rail, which had never
          worked. */}
      <nav
        aria-label="Section navigation"
        data-anim="rail"
        className="fixed right-6 top-1/2 z-[88] hidden -translate-y-1/2 flex-col items-end gap-[9px] xl:flex"
        style={{ opacity: 0 }}
      >
        {RAIL.map(([num, label, href]) => (
          <a
            key={num}
            href={href}
            data-rail={href.replace("#", "")}
            className="nl-mono-xs flex items-center gap-2"
            style={{ color: "var(--nl-meta)" }}
          >
            <span>
              {num} {label}
            </span>
            <span
              aria-hidden
              data-railline
              className="block h-px w-[14px]"
              style={{ background: "var(--nl-meta)", transition: "width .4s var(--nl-ease)" }}
            />
          </a>
        ))}
      </nav>

      {/* The labelled cursor. nl.css only reveals it on (pointer:fine) and
          >=1000px, so this markup is inert everywhere else. */}
      <div data-nlcursor="1" aria-hidden>
        <div
          data-anim="curdot"
          className="pointer-events-none fixed left-0 top-0 z-[212] h-[7px] w-[7px] rounded-full"
          style={{ background: "var(--nl-paper)", mixBlendMode: "difference" }}
        />
        <div
          data-anim="curring"
          className="pointer-events-none fixed left-0 top-0 z-[211] grid place-items-center"
        >
          <div
            data-anim="curringinner"
            className="grid h-10 w-10 place-items-center rounded-full border"
            style={{
              borderColor: "rgba(8,145,178,0.85)",
              margin: "-20px 0 0 -20px",
              transition: "all .35s var(--nl-ease)",
            }}
          >
            <span
              data-anim="curlabel"
              className="nl-mono-xs whitespace-nowrap"
              style={{ color: "var(--nl-ink-deep)" }}
            />
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}
