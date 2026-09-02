"use client";

/**
 * NLCHROME — the fixed chrome: the one header, the intro curtain, the blueprint
 * reveal.
 *
 * ─── THE HEADER DECISION (stated, because the brief demanded a decision) ─────
 * The site ships a global <Navbar> (components/layout/Navbar.tsx) that
 * MarketingChrome renders on every route. Two fixed bars on one page is not a
 * style question, it is a bug. THE CALL: this component OWNS the bar on `/`,
 * and MarketingChrome no longer renders <Navbar> there (its OWN_HEADER_ROUTES
 * list — the same mechanism that already suppresses the global <Footer>
 * because Start.tsx is the footer). There is exactly one fixed header on the
 * homepage at every tier and at every scroll offset.
 *
 * Why own it rather than tag the global bar:
 *   1. The engine writes background / backdrop-filter / border-bottom-color /
 *      transform on [data-anim="nav"] EVERY FRAME. Navbar.tsx writes the same
 *      four properties from React state. Handing the engine that element makes
 *      two writers for one element, which is the exact law the port contract
 *      and nl-audit exist to enforce.
 *   2. The blueprint toggle is a nav control. Injecting a homepage-only,
 *      engine-only control into the global navigation is worse than owning a
 *      homepage bar.
 *   3. The page's whole grammar is a 34px full-bleed gutter. The global bar is
 *      a centred max-w-6xl well. It reads as a different document.
 *
 * What survived, non-negotiably: navigation.main, the /login portal link, and
 * cta.primary — label and href straight from brand.ts, never retyped.
 *
 * ─── THE ENGINE CONTRACT (see chrome(), shell(), wireBlueprint(),
 *     setBlueprint() in engine/NLEngine.ts) ────────────────────────────────
 *   data-anim="nav"       the <header>. chrome() writes background /
 *                         backdropFilter / borderBottomColor from this.frameDark
 *                         (recomputed every frame from whichever [data-tone="dark"]
 *                         band crosses y=46). shell() writes the hide-on-scroll-down
 *                         transform: translateY(-104%).
 *   data-anim="navmark"   the wordmark. colour only: #fbf9f4 dark / #071022 light.
 *   data-anim="navsub"    the mono sub-label. Cached, never written — present
 *                         because the source caches it and a future engine
 *                         revision may reach for it.
 *   data-anim="navlink"   EVERY nav link. colour only: #9aa7bd / #5a6a85.
 *   data-anim="bptoggle"  wireBlueprint() binds click here, and binds G globally.
 *   data-anim="bpgrid"    opacity 0/1.
 *   data-anim="bpdot"     background <- acc().
 *   data-anim="bplabel"   colour <- acc().
 *   data-anim="intro"     display:none at t0+2800ms.
 *   data-anim="introcount" textContent 00..100 over 1520ms, eased out.
 *
 * ONE WRITER PER ELEMENT. Everything the engine writes is authored here as a
 * CSS *class*, never as an inline style — an inline style React re-applies on
 * every render would fight the loop. The engine's inline writes then outrank
 * the class, so on tier B the engine is the only writer and on tier A the class
 * is the only writer. The one thing that needs a JS writer on tier A — the
 * dark-band inversion the engine does from frameDark — runs as an
 * IntersectionObserver that is HARD-GATED OFF on tier B. Never both.
 *
 * ─── THE VISIBILITY CONTRACT ────────────────────────────────────────────────
 * The header renders in server HTML, fully styled, at every tier. The intro
 * curtain and the blueprint grid are the two deliberate exceptions and they are
 * exceptions in the SAFE direction: they are mounted client-side on tier B
 * ONLY, so they do not exist in server HTML at all. A curtain that cannot exist
 * cannot trap a reader behind it. See the four independent lifts below.
 *
 * ─── WHAT WAS REMOVED FROM THE SOURCE, AND WHY ──────────────────────────────
 *   "NORTHLINE" wordmark        -> brand.name. Fictional studio.
 *   "Madison, WI" (intro meta)  -> "100% async · remote". Northline is a
 *                                  fictional Wisconsin studio; inventing a
 *                                  headquarters is a claim about a real
 *                                  business. nl-audit rule 8 fails on it.
 *   "Book a call" (nav CTA)     -> cta.primary ("Start your brief"). The studio
 *                                  takes no calls; that is the differentiator.
 *   nav links System/Receipts/  -> navigation.main. The design's links were
 *   Portal/The math                anchors into a demo page. This is a real site.
 *   America/Chicago footer clock-> cut here, replaced by NLClock.tsx (the
 *                                  reader's own timezone). See that file.
 *   Persistent blueprint HUD    -> momentary. The permanent version was built
 *                                  and cut on this project ("what tf is that
 *                                  shit"). The engine's setBlueprint is a latch;
 *                                  BP_HOLD below closes it for you.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { brand, cta, navigation } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import type { StrataTier } from "@/components/strata/tier";

/**
 * How long a blueprint reveal stays up before it closes itself, ms.
 *
 * LOAD-BEARING, and it is the whole difference between the version that
 * shipped and the version that got killed. The engine's setBlueprint() is a
 * plain latch — click once and the dashed outlines stay on every heading for
 * the rest of the session, which is what "what tf is that shit" was about. The
 * grid is a momentary X-ray: press, look, gone. Do not turn this into a
 * persistent mode, and do not raise it past ~3s.
 */
const BP_HOLD = 2200;

/**
 * The curtain's own lift, ms. The engine sets display:none at t0+2800 and the
 * CSS lift finishes at 2500. This unmounts at 2900 — deliberately LAST, so the
 * React removal can never be what the reader sees.
 */
const INTRO_KILL = 2900;

/** Past this much time since navigation start, do not curtain at all. */
const INTRO_LATE = 1500;

const CSS = `
/* ── THE BAR ──────────────────────────────────────────────────────────────
   Every property the engine writes lives here as a class, so tier A is styled
   and tier B is overridden by inline writes. 17px/34px is the source's own
   padding and it is what puts the bar on the same 34px gutter as every
   full-bleed row on the page. */
[data-nl] .nlc-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 17px 34px;
  border-bottom: 1px solid rgba(11, 27, 58, 0.14);
  background: rgba(246, 243, 236, 0.86);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: background .5s ease, border-color .5s ease, color .5s ease;
}
/* Tier-A inversion only. On tier B this attribute is never set — frameDark is. */
[data-nl] .nlc-bar[data-nl-deep] {
  background: rgba(10, 23, 48, 0.86);
  border-bottom-color: rgba(251, 249, 244, 0.16);
}
[data-nl] .nlc-bar[data-nl-deep] .nlc-mark { color: #fbf9f4; }
[data-nl] .nlc-bar[data-nl-deep] .nlc-sub { color: rgba(251, 249, 244, 0.56); }
[data-nl] .nlc-bar[data-nl-deep] .nlc-link { color: #9aa7bd; }
[data-nl] .nlc-bar[data-nl-deep] .nlc-burger span { background: #fbf9f4; }

[data-nl] .nlc-brand { display: flex; align-items: baseline; gap: 11px; min-width: 0; }
[data-nl] .nlc-mark {
  font-family: var(--font-nl-display), var(--font-heading), system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.035em;
  font-size: 18px;
  line-height: 1;
  color: #071022;
  white-space: nowrap;
}
/* The sub-label's colour MUST live here, not in a React inline style. The
   engine never writes navsub, so the ground rule above is its only re-tone —
   and an inline style would outrank it and pin the label to ink on every
   ground. It shipped that way and read 1.05:1 on all five navy bands. */
[data-nl] .nlc-sub { color: var(--nl-meta); transition: color .5s ease; }
[data-nl] .nlc-nav { display: flex; align-items: center; gap: 26px; }
[data-nl] .nlc-link { font-size: 14px; font-weight: 500; color: #5a6a85; transition: color .3s ease; }
[data-nl] .nlc-link:hover { color: var(--nl-accent); }

/* ── THE BLUEPRINT TOGGLE ─────────────────────────────────────────────────
   A real <button>: the engine binds 'click', which a keyboard fires on a
   button and does not fire on the source's <span>. */
[data-nl] .nlc-bp {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(11, 27, 58, 0.2);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: border-color .3s ease, background-color .3s ease;
}
[data-nl] .nlc-bp:hover { border-color: var(--nl-accent); }
[data-nl] .nlc-bar[data-nl-deep] .nlc-bp { border-color: rgba(251, 249, 244, 0.24); }
/* bpdot / bplabel carry no inline colour, so the ground can tone them while the
   control is idle. setBlueprint() writes both inline the moment it is used —
   the engine's acc() is ground-aware too, so it lands on the same answer. */
[data-nl] .nlc-bpdot { width: 6px; height: 6px; border-radius: 50%; background: #6b7a92; display: block; transition: background-color .3s ease; }
[data-nl] .nlc-bplabel { color: #5a6a85; transition: color .3s ease; }
[data-nl] .nlc-bar[data-nl-deep] .nlc-bpdot { background: #7f93b3; }
[data-nl] .nlc-bar[data-nl-deep] .nlc-bplabel { color: #9aa7bd; }

/* ── THE CTA ──────────────────────────────────────────────────────────────
   Ink pill, accent dot. 2px radius: the browser frame is the only rounded
   thing on this page, everything else is square or nearly so. */
[data-nl] .nlc-cta {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: var(--nl-ink);
  color: var(--nl-paper);
  padding: 11px 18px;
  border-radius: 2px;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color .3s ease;
}
[data-nl] .nlc-cta:hover { background: var(--nl-accent); color: var(--nl-ink-deep); }
[data-nl] .nlc-cta i { width: 5px; height: 5px; border-radius: 50%; background: var(--nl-accent); display: inline-block; }
[data-nl] .nlc-cta:hover i { background: var(--nl-ink-deep); }
[data-nl] .nlc-bar[data-nl-deep] .nlc-cta { background: var(--nl-accent); color: #071022; }
[data-nl] .nlc-bar[data-nl-deep] .nlc-cta i { background: #071022; }

/* ── NARROW ───────────────────────────────────────────────────────────────
   The bar collapses at the same 1024px the whole page unpins at, so a phone
   never sees a half-collapsed desktop bar. */
[data-nl] .nlc-burger { display: none; }
@media (max-width: 1024px) {
  [data-nl] .nlc-bar { padding: 13px var(--nl-gutter, 20px); gap: 12px; }
  [data-nl] .nlc-sub, [data-nl] .nlc-desk { display: none; }
  [data-nl] .nlc-burger { display: flex; }
  [data-nl] .nlc-cta { padding: 9px 13px; font-size: 12.5px; }
}
[data-nl] .nlc-burger {
  position: relative;
  width: 40px; height: 34px;
  align-items: center; justify-content: center;
  background: transparent; border: 0; cursor: pointer;
  flex: 0 0 auto;
}
[data-nl] .nlc-burger span {
  position: absolute; left: 11px; width: 18px; height: 2px;
  background: var(--nl-ink);
  transition: transform .2s ease, opacity .15s ease;
}
[data-nl] .nlc-sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  top: 60px;
  z-index: 89;
  overflow-y: auto;
  background: var(--nl-bone);
  padding: 8px var(--nl-gutter, 20px) 32px;
  display: flex;
  flex-direction: column;
}
[data-nl] .nlc-sheet a.nlc-sheetlink {
  display: block;
  padding: 18px 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--nl-ink);
  border-bottom: 1px solid var(--nl-r14);
}

/* ── THE INTRO CURTAIN ────────────────────────────────────────────────────
   FOUR INDEPENDENT LIFTS, because a curtain that fails closed is a page nobody
   can read:
     1. it is never in server HTML — tier B mounts it client-side only;
     2. nlIntroLift is a CSS animation with fill-mode forwards, so it clears
        even if the engine never mounts or throws on its first frame;
     3. the engine sets display:none at t0+2800ms;
     4. React unmounts it at INTRO_KILL.
   pointer-events:none from the first millisecond, so even a stuck curtain
   cannot swallow a click. */
@keyframes nlIntroLift { 0%, 60% { transform: translateY(0) } 100% { transform: translateY(-101%) } }
@keyframes nlIntroInner { 0%, 50% { opacity: 1 } 68%, 100% { opacity: 0 } }
@keyframes nlIntroBar { 0% { transform: scaleX(0) } 56%, 100% { transform: scaleX(1) } }
[data-nl] .nlc-intro {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--nl-ink-deep);
  color: var(--nl-paper);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 36px 34px;
  pointer-events: none;
  animation: nlIntroLift 2.5s cubic-bezier(.76, 0, .18, 1) forwards;
}
[data-nl] .nlc-introrow { animation: nlIntroInner 2.5s linear forwards; }
[data-nl] .nlc-introword {
  font-family: var(--font-nl-display), var(--font-heading), system-ui, sans-serif;
  font-size: clamp(52px, 11vw, 168px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.82;
}
[data-nl] .nlc-introbar { position: absolute; inset: 0; background: #22d3ee; transform-origin: 0 50%; animation: nlIntroBar 2.5s cubic-bezier(.5, 0, .1, 1) forwards; }
@media (prefers-reduced-motion: reduce) {
  [data-nl] .nlc-intro, [data-nl] .nlc-introrow, [data-nl] .nlc-introbar { animation: none; }
  [data-nl] .nlc-intro { display: none; }
}

/* ── THE BLUEPRINT GRID ───────────────────────────────────────────────────
   12 columns inside the 34px gutter, a 96px baseline, the centre line and four
   corner ticks. Authored at opacity 0 because it is an OVERLAY, not content —
   and it is only ever mounted on tier B, so nothing invisible ships in SSR.
   Alphas are held low on purpose: this reveals structure, it does not wash the
   page. */
[data-nl] .nlc-bpgrid {
  position: fixed;
  inset: 0;
  z-index: 94;
  pointer-events: none;
  opacity: 0;
  transition: opacity .45s cubic-bezier(.16, .84, .28, 1);
}
[data-nl] .nlc-bpcol { position: absolute; top: 0; bottom: 0; left: 34px; right: 34px; background-image: repeating-linear-gradient(90deg, rgba(34, 211, 238, 0.22) 0 1px, transparent 1px calc(100% / 12)); }
[data-nl] .nlc-bprow { position: absolute; inset: 0; background-image: repeating-linear-gradient(180deg, rgba(34, 211, 238, 0.10) 0 1px, transparent 1px 96px); }
[data-nl] .nlc-bpmid { position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: rgba(34, 211, 238, 0.32); }
[data-nl] .nlc-bptick { position: absolute; width: 16px; height: 16px; display: block; }
[data-nl] .nlc-bplegend {
  position: absolute; left: 34px; bottom: 26px;
  display: flex; align-items: center; gap: 14px;
  background: rgba(7, 16, 34, 0.9);
  padding: 9px 13px;
}
`;

export function NLChrome({
  tier,
  getEngine,
}: {
  tier: StrataTier;
  /** Live accessor, not the instance: NLRoot fills its ref in a layout effect. */
  getEngine: () => { blue?: unknown; setBlueprint: (on: boolean) => void } | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const barRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const primary = navigation.main.find((i) => "isPrimary" in i && i.isPrimary);
  const links = navigation.main.filter((i) => !("isPrimary" in i && i.isPrimary));

  /* ── THE CURTAIN ────────────────────────────────────────────────────────
     Tier resolves in an effect, so this can only ever run after first paint —
     which is the point: the SSR <h1> is the LCP and it is already measured
     before the curtain exists. Both guards below refuse the curtain when
     dropping it would be an ambush rather than an entrance: a reader who has
     already scrolled (a restored position, or a resize from tier A), and a
     late tier resolution on a slow device. */
  useEffect(() => {
    if (tier !== "B") return;
    if (window.scrollY > 4) return;
    if (performance.now() > INTRO_LATE) return;
    setIntro(true);
    const t = window.setTimeout(() => setIntro(false), INTRO_KILL);
    return () => window.clearTimeout(t);
  }, [tier]);

  /* ── THE MOMENTARY BLUEPRINT ────────────────────────────────────────────
     The engine owns the toggle (it binds click on [data-anim="bptoggle"] and G
     on window). It cannot own the CLOSE — setBlueprint is a latch and the
     engine is generated code we do not edit. So we listen to the same two
     events and arm a timer that closes it. Arming on the close click too is
     harmless: the timer finds blue already false and does nothing. */
  useEffect(() => {
    if (tier !== "B") return;
    let timer = 0;
    const close = () => {
      const eng = getEngine();
      if (eng && eng.blue) {
        try {
          eng.setBlueprint(false);
        } catch {
          /* the engine must never be able to break the chrome */
        }
      }
    };
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(close, BP_HOLD);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "g" && e.key !== "G") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      arm();
    };
    const el = toggleRef.current;
    el?.addEventListener("click", arm);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener("click", arm);
      window.removeEventListener("keydown", onKey);
      close();
    };
  }, [tier, getEngine]);

  /* ── THE TONE SIGNAL ────────────────────────────────────────────────────
     The engine recomputes frameDark every frame from the dark bands crossing
     y=46 and writes background / borderBottomColor / navmark / navlink INLINE.
     Two things it does not do: expose that state to CSS, and tone the CTA, the
     blueprint toggle border or the burger — elements it has never heard of. So
     this IO publishes the same signal as an ATTRIBUTE, on the same 46px reading
     line, at every tier.

     This is not a second writer, and the distinction is the whole reason it is
     safe: the engine writes STYLE PROPERTIES, this writes an ATTRIBUTE, and no
     single property has two authors. Where both reach the same element (the
     bar's own background), the engine's inline write outranks the attribute's
     rule unconditionally — so tier B is engine-toned and tier A is CSS-toned,
     exactly as before, and the CTA stops disappearing into the navy bands. */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const bands = Array.from(document.querySelectorAll('[data-tone="dark"]'));
    if (!bands.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        if (seen.size) bar.setAttribute("data-nl-deep", "1");
        else bar.removeAttribute("data-nl-deep");
      },
      { rootMargin: "-46px 0px -100% 0px", threshold: 0 }
    );
    bands.forEach((b) => io.observe(b));
    return () => {
      io.disconnect();
      bar.removeAttribute("data-nl-deep");
    };
  }, []);

  /* ── ENGINE-WRITE CLEANUP ───────────────────────────────────────────────
     A tier-B reader who resizes to a phone drops to tier A and the engine
     unmounts — but the inline styles it wrote are still on these nodes, and an
     inline style outranks the class that is supposed to take back over. Strip
     exactly the properties chrome() and shell() write, nothing else. */
  useEffect(() => {
    if (tier !== "B") return;
    return () => {
      const bar = barRef.current;
      if (!bar) return;
      for (const p of ["background", "backdrop-filter", "border-bottom-color", "transform", "transition"]) {
        bar.style.removeProperty(p);
      }
      bar.querySelectorAll<HTMLElement>('[data-anim="navlink"], [data-anim="navmark"]').forEach((el) => {
        el.style.removeProperty("color");
      });
    };
  }, [tier]);

  /* Mobile sheet: scroll lock + Escape. Same contract the global Navbar had, so
     nothing regresses for a phone reader when this bar replaces it. */
  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── THE ONE FIXED HEADER ─────────────────────────────────────────
          data-anim="nav" — chrome() + shell() write background, backdropFilter,
          borderBottomColor, transition and transform here. No inline style on
          this element from React, ever. */}
      {/* role="banner" is explicit and load-bearing. page.tsx renders NLRoot
          inside <main id="main-content">, so this <header> is a descendant of
          main and therefore does NOT get the implicit banner landmark — the
          homepage would ship with no banner at all. The global Navbar used to
          sit outside main and got it for free. This is the one structural cost
          of owning the bar from inside the page tree. */}
      <header ref={barRef} role="banner" data-anim="nav" className="nlc-bar">
        <Link href="/" className="nlc-brand" aria-label={`${brand.name} — home`}>
          <span data-anim="navmark" className="nlc-mark">
            {brand.name.toUpperCase()}
          </span>
          {/* No inline style. See .nlc-sub in CSS above — an inline colour here
              cannot be re-toned by the dark-ground rule and made this label
              invisible on every navy band. */}
          <span data-anim="navsub" className="nlc-sub nl-mono-sm">
            Landing page studio
          </span>
        </Link>

        <nav aria-label="Main" className="nlc-nav">
          <span className="nlc-desk nlc-nav">
            {links.map((item) => (
              <Link key={item.href} data-anim="navlink" href={item.href} className="nlc-link">
                {item.label}
              </Link>
            ))}
            <Link data-anim="navlink" href="/login" className="nlc-link">
              Portal
            </Link>

            {/* The blueprint toggle. Tier B only — it drives an engine-owned
                overlay and there is nothing behind it on tier A. */}
            {tier === "B" && (
              <button
                ref={toggleRef}
                type="button"
                data-anim="bptoggle"
                data-cursor="Reveal"
                className="nlc-bp"
                aria-label="Reveal the layout grid for two seconds (shortcut: G)"
              >
                <span data-anim="bpdot" aria-hidden className="nlc-bpdot" />
                <span data-anim="bplabel" className="nlc-bplabel nl-mono-xs">
                  Blueprint
                </span>
              </button>
            )}
          </span>

          {/* THE BAR CTA WAS UNTRACKED. It is the only conversion action visible
              at every one of the page's ~48 viewports, and it fired nothing —
              so a click from here landed in /brief with no cta_location, no
              cta_variant and, worse, no sessionStorage["strata_cta_source"],
              which is what makes the later brief_submit attributable at all.
              Every report keyed off CTA location was blind to the single most
              persistently visible button on the site. */}
          {primary && (
            <Link
              href={primary.href}
              className="nlc-cta"
              onClick={() => {
                trackCtaClick("nav", "primary", "brief", "home");
                closeMenu();
              }}
            >
              {primary.label}
              <i aria-hidden />
            </Link>
          )}

          <button
            type="button"
            className="nlc-burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span style={menuOpen ? { top: 16, transform: "rotate(45deg)" } : { top: 11 }} />
            <span style={menuOpen ? { top: 16, opacity: 0 } : { top: 16 }} />
            <span style={menuOpen ? { top: 16, transform: "rotate(-45deg)" } : { top: 21 }} />
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div className="nlc-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="nlc-sheetlink" onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="nlc-sheetlink" onClick={closeMenu}>
            Portal
          </Link>
          {/* Its own location: a click from the phone sheet is a different
              moment from a click on the bar, and collapsing them would hide
              which one mobile traffic actually uses. */}
          {primary && (
            <Link
              href={primary.href}
              className="nlc-cta"
              onClick={() => {
                trackCtaClick("nav_sheet", "primary", "brief", "home");
                closeMenu();
              }}
              style={{ marginTop: 28, padding: "16px 18px", fontSize: 15, justifyContent: "center" }}
            >
              {primary.label}
              <i aria-hidden />
            </Link>
          )}
          {/* The bar's reassurance line is gone. Every other instance of this
              promise appears once per page; a fixed element repeats it once per
              SCROLL, which made it the most-repeated string on the site by a
              wide margin. The sheet's own links are the action here. */}
        </div>
      )}

      {/* ── THE BLUEPRINT GRID ───────────────────────────────────────────
          Tier B only. setBlueprint() writes opacity here and the accent into
          bpdot/bplabel; BP_HOLD closes it. */}
      {tier === "B" && (
        <div data-anim="bpgrid" className="nlc-bpgrid" aria-hidden>
          <div className="nlc-bpcol" />
          <div className="nlc-bprow" />
          <div className="nlc-bpmid" />
          <span className="nlc-bptick" style={{ left: 18, top: 18, borderTop: "1px solid rgba(34,211,238,0.75)", borderLeft: "1px solid rgba(34,211,238,0.75)" }} />
          <span className="nlc-bptick" style={{ right: 18, top: 18, borderTop: "1px solid rgba(34,211,238,0.75)", borderRight: "1px solid rgba(34,211,238,0.75)" }} />
          <span className="nlc-bptick" style={{ left: 18, bottom: 18, borderBottom: "1px solid rgba(34,211,238,0.75)", borderLeft: "1px solid rgba(34,211,238,0.75)" }} />
          <span className="nlc-bptick" style={{ right: 18, bottom: 18, borderBottom: "1px solid rgba(34,211,238,0.75)", borderRight: "1px solid rgba(34,211,238,0.75)" }} />
          <div className="nlc-bplegend">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", display: "block" }} />
            <span className="nl-mono-xs" style={{ color: "var(--nl-paper)" }}>
              Blueprint
            </span>
            <span className="nl-mono-xs" style={{ color: "rgba(251,249,244,0.52)" }}>
              12 col · 34px gutter · 96px baseline · press G · closes itself
            </span>
          </div>
        </div>
      )}

      {/* ── THE INTRO CURTAIN ────────────────────────────────────────────
          Never in server HTML. Lifts four independent ways. */}
      {intro && (
        <div data-anim="intro" className="nlc-intro" aria-hidden>
          <div className="nlc-introrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="nl-mono-sm" style={{ color: "rgba(251,249,244,0.52)" }}>
              {brand.name} — landing page studio
            </span>
            <span className="nl-mono-sm" style={{ color: "rgba(251,249,244,0.52)" }}>
              100% async · remote
            </span>
          </div>

          <div className="nlc-introrow" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
            <span className="nlc-introword">{brand.name.toUpperCase()}</span>
            {/* introcount: the engine replaces this textContent every frame.
                It ships "00" so a dead engine shows a number, not an empty box. */}
            <span
              data-anim="introcount"
              className="nl-num"
              style={{ fontSize: "clamp(38px,5vw,76px)", color: "#22d3ee", lineHeight: 0.9 }}
            >
              00
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ height: 1, background: "rgba(251,249,244,0.18)", position: "relative" }}>
              <div className="nlc-introbar" />
            </div>
            <span className="nlc-introrow nl-mono-sm" style={{ color: "rgba(251,249,244,0.52)" }}>
              Loading the journey — presence · lead · purchase · portal
            </span>
          </div>
        </div>
      )}
    </>
  );
}
