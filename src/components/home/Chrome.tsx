import Link from "next/link";
import { cta } from "@/lib/brand";

/**
 * THE CHROME — a 36px ink utility rail above a 64px sticky nav.
 *
 * This is the single biggest reason the previous build read as "too raw": it had
 * no chrome at all, so the page opened with a floating chip. All 13 nav
 * references and 5 of 5 benchmark references have a navigation bar. Dialog
 * ~64px, Paper 61px, Panxo ~60px. A page that begins with a
 * floating chip is a component preview; a page that begins with a bar is a site.
 *
 * Three decisions taken from the specs rather than guessed:
 *
 * 1. The rail is full-bleed ink and is NOT sticky. Panxo: "Fixed height ~36px…
 *    the only full-bleed black element on an otherwise light page." Non-sticky
 *    keeps the sticky offset at 64px rather than 100px.
 * 2. The nav is TRANSPARENT at rest — paper shows through — and only gains a
 *    translucent background, a blur and its hairline once scrolled. The
 *    reference pattern is explicit: no bottom border on the default state, and a
 *    subtle border in the scroll state. A solid white bar under an ink rail would put three surfaces in the
 *    top 100px.
 * 3. The nav's CTA is the GHOST variant, not the ink fill. The foundation allows
 *    exactly one filled button per screen, and the hero owns it. A bordered
 *    nav CTA proves a nav can carry an action without taking that slot.
 *
 * Height never shrinks on scroll (zero references shrink), no shadow ever
 * appears in any state, and the transition list is colour/background/border/blur
 * only — never transform.
 */
export function Chrome() {
  return (
    <>
      {/* ── 36px utility rail — full-bleed ink, not sticky ─────────────── */}
      <div className="one-rail">
        <div className="one-rail__in">
          <span className="one-rail__l">Landing page studio — async, no calls</span>
          <span className="one-rail__r">
            Now booking
            <span className="one-rail__sep" aria-hidden="true" />
            <span className="one-num">2</span> build slots this month
          </span>
        </div>
      </div>

      {/* ── 64px sticky nav — transparent at rest ──────────────────────── */}
      <header className="one-nav" data-nav>
        <div className="one-nav__in">
          {/* left cluster: wordmark · seam · mono status slug (3 objects) */}
          <div className="one-nav__l">
            <Link href="/" className="one-nav__mark">StrataLanding</Link>
            <span className="one-nav__seam" aria-hidden="true" />
            {/* zero-chrome mono label — a pure typographic label with no pill or
                chip treatment */}
            <span className="one-nav__slug">
              <span className="one-nav__dot" aria-hidden="true" />
              Open for work
            </span>
          </div>

          {/* right cluster: 4 links + 1 ghost CTA — 5 objects, never 6 */}
          <nav className="one-nav__r" aria-label="Main">
            <Link href="/demos" className="one-nav__link">Demos</Link>
            <Link href="/#work" className="one-nav__link">Work</Link>
            <Link href="/#how" className="one-nav__link">How it works</Link>
            <Link href="/#pricing" className="one-nav__link">Pricing</Link>
            <Link href={cta.primary.href} className="one-cta one-cta--ghost one-cta--sm">
              {cta.primary.label}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
