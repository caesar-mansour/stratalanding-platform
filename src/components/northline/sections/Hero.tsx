import Link from "next/link";
import { cta, guarantee, pricing } from "@/lib/brand";
import { CtaLink } from "../CtaLink";
import { HeroLive } from "../HeroLive";

/**
 * THE HERO — first layer of the journey stage.
 *
 * The <h1> is the LCP element: SSR text, no image above the fold, and the two
 * webfonts it uses are display:'optional' so a slow network keeps the metric-
 * matched fallback rather than blocking paint. Nothing on this page may carry
 * `priority` on an image and compete with it.
 *
 * The claim is the approved design's, verbatim — "Your site is a brochure. We
 * build the machine." The two italic words are the page's single ornament
 * (Instrument Serif), and "machine" is the only display-size use of the accent.
 *
 * WHAT WAS REMOVED, AND WHY. The source shipped a live event ticker headed
 * "LIVE — FROM CLIENT PAGES, RIGHT NOW", streaming invented page_view and
 * deposit_paid rows on a 2,150ms timer, plus "EST. 2019 · MADISON, WI",
 * "11 client pages live", "2 slots" and a "0.8s median LCP". Northline is a
 * fictional studio; StrataLanding is a real one with one public client and no
 * September slots. Every one of those is gone. The instrument strip below
 * carries only numbers that are true and checkable: the demo count is read from
 * the filesystem at build time, the 24h proposal window is the actual promise,
 * and "no calls" is the business model.
 *
 * The honest version of the ticker idea lives in the Watching section, which
 * instruments the reader's own session and streams nothing anywhere.
 */

interface HeroProps {
  /** Computed in page.tsx via readdirSync — never typed by hand. */
  demoCount: number;
}

/** The cheapest tier, found by VALUE so a reorder in brand.ts cannot strand a
 *  stale "from" price in the hero. */
const fromPrice = pricing.reduce((a, b) =>
  Number(b.price.replace(/[^0-9.]/g, "")) < Number(a.price.replace(/[^0-9.]/g, "")) ? b : a
).price;

export function Hero({ demoCount }: HeroProps) {
  return (
    <section
      id="hero"
      data-screen-label="Hero"
      data-anim="hero"
      className="nl-blueprint relative mx-auto flex min-h-[100svh] w-[min(1320px,92vw)] flex-col justify-center"
      style={{ paddingTop: "clamp(94px,9vh,110px)", paddingBottom: "clamp(40px,6vh,80px)" }}
    >
      {/* Ledger head, hero variant — no drawing rule here; the hero plays a
          timed intro, not a scroll-driven one. */}
      <div className="mb-[clamp(18px,3vh,34px)] flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span aria-hidden className="text-[9px] leading-none" style={{ color: "var(--nl-accent)" }}>
          ◆
        </span>
        <span data-hfade className="nl-mono" style={{ color: "var(--nl-meta)" }}>
          Med spas · Clinics · Studios
        </span>
        <span
          data-hrule
          aria-hidden
          className="hidden h-px md:block"
          style={{ background: "var(--nl-r18)", width: 34 }}
        />
        {/* "Async only · No calls" WAS hidden below md, which meant the studio's
            loudest differentiator — and the answer to "do I have to get on a
            call?", one of the four objections this buyer actually has — did not
            exist above the fold on a phone. Most of this audience is on a
            phone. It now wraps to a second line instead of disappearing; the
            connecting rule stays desktop-only because a wrapped line does not
            need one. */}
        <span data-hfade className="nl-mono" style={{ color: "var(--nl-meta)" }}>
          Async only · No calls
        </span>
      </div>

      {/* THE CLAIM. Three masked lines, each rising on its own delay. */}
      <h1
        className="nl-display m-0"
        style={{
          fontSize: "clamp(34px, min(8.2vw,10.6vh), 148px)",
          maxWidth: "13ch",
        }}
      >
        {/* Three lines, each its own block so they stack. The mask INSIDE the
            block must stay inline-block (that is what clips the rise), so the
            block wrapper is a separate element — putting `block` on .nl-mask
            loses to nl.css's specificity and the lines run together as "isa". */}
        <span className="block">
          <span className="nl-mask">
            <span data-hline style={{ animationDelay: "0.10s" }} className="block">
              Your site is
            </span>
          </span>
        </span>
        <span className="block">
          <span className="nl-mask">
            <span data-hline style={{ animationDelay: "0.20s" }} className="block">
              a <em className="nl-serif">brochure</em>.
            </span>
          </span>
        </span>
        <span className="block">
          <span className="nl-mask">
            <span data-hline style={{ animationDelay: "0.32s" }} className="block">
              We build the
            </span>
          </span>
        </span>
        {/* FOUR lines, not three. The source breaks "machine." onto its own line
            and that break is the composition: the accent word lands alone at the
            bottom of the stack, which is the whole reason it reads as a
            punchline. Collapsing it into "We build the machine." — which is what
            a naive port does, because 13ch of Outfit happens to fit — throws the
            emphasis away. */}
        <span className="block">
          <span className="nl-mask">
            <span data-hline style={{ animationDelay: "0.42s" }} className="block">
              <em className="nl-serif" style={{ color: "var(--nl-accent)" }}>
                machine
              </em>
              .
            </span>
          </span>
        </span>
      </h1>

      {/* TWO COLUMNS, as the source composes it: the claim's supporting copy on
          the left, the live instrument on the right. Rendering this as one
          column left the right half of the hero empty — the void that has been
          called out in four previous homepage reviews. */}
      <div className="mt-[clamp(22px,3.4vh,40px)] grid gap-[clamp(18px,2.6vh,30px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
        <div className="flex flex-col gap-[clamp(16px,2.2vh,26px)]">
        <p
          data-hfade
          style={{
            animationDelay: "0.48s",
            margin: 0,
            fontSize: "clamp(15px,1.25vw,18.5px)",
            lineHeight: 1.5,
            color: "var(--nl-body)",
            maxWidth: "44ch",
          }}
        >
          Three pages, one client portal, and a tracking spine that ties every dollar to the click
          that earned it. Designed, written and built by hand — then handed over in your name.
        </p>

        {/* ONE DOMINANT ACTION, and it is a deliberate departure from the
            source. The design's hero carries no CTA at all, because its fixed
            nav owns a solid black pill at top-right. Ported faithfully, this
            page had NO dominant call to action above the fold — two text links
            of equal weight — while the first price sat at viewport 41.7 of 45.
            Scored on the conversion rubric that is CTA-strength 2, which gates
            the whole surface to WEAK no matter how the rest scores.

            So: one filled primary, one subordinate text link, and microcopy
            that pre-answers "what happens when I click and what does it cost
            me" — which is the difference between a button and a commitment.
            Labels and microcopy come from brand.ts, never typed here, so the
            one-CTA-label-site-wide law holds. */}
        <div data-hfade style={{ animationDelay: "0.56s" }} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink
              href={cta.primary.href}
              location="hero"
              variant="primary"
              destination="brief"
              className="nl-cta"
              data-magnet
            >
              {cta.primary.label}
            </CtaLink>
            {/* hero_demo, not hero. Both hero CTAs reported "hero", so the
                split between "start the brief" and "look at the work first" —
                the single most useful thing to know about this page's opening —
                could not be read at all. hero_demo was a documented location
                emitted by nothing. The PRIMARY keeps "hero": nl-audit requires
                that string to exist somewhere or a funnel report goes blank. */}
            <CtaLink
              href={cta.secondary.href}
              location="hero_demo"
              variant="secondary"
              destination="demos"
              className="nl-hero-link"
            >
              {cta.secondary.label} <span aria-hidden>→</span>
            </CtaLink>
          </div>
          <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
            {cta.supportingMicrocopy}
          </span>

          {/* THE GUARANTEE, AT THE TOP — the single highest-leverage line on the
              page, and it was 40 viewports below where it was needed.

              The buyer here is a med spa or a clinic, and their number one
              objection is not price, it is "the last web guy took my money and
              disappeared." That fear forms in the first few seconds and it is
              answered by structure, not adjectives. Stating the two approvals
              and the payment terms as a UNIT collapses "what if I don't like
              it" into "you cannot lose" — which is why it belongs beside the
              first CTA rather than inside the pricing ledger, where only a
              visitor who already scrolled forty screens would ever find it.

              Copy comes from brand.ts `guarantee` so the promise cannot drift
              from the pricing section, the proposal, or the contract.

              ONE LINE, NOT TWO, AND THAT IS MEASURED. The first version ran to
              a second sentence about the two approval checkpoints. On a
              1280x720 laptop that extra line pushed "From $2,400 · Fixed,
              agreed before we start" to y=719 against a 720px viewport — it
              bought the guarantee by hiding the price, and the price is the
              other thing this page may never hide. The checkpoints are still
              made explicit further down (process, portal, pricing terms);
              above the fold what has to land is the payment shape. */}
          <p
            className="m-0 max-w-[62ch] text-[13.5px] leading-[1.5]"
            style={{ color: "var(--nl-ink)", fontWeight: 600 }}
          >
            {guarantee.terms}
          </p>
        </div>
        </div>

        {/* Right column — the live instrument. Desktop only; it returns null on
            tier A so a phone pays nothing for it. */}
        <HeroLive />
      </div>

      {/* THE INSTRUMENT STRIP. gap:1px over a hairline ground — the gap is the
          rule. Every figure here is true and checkable. */}
      <div data-hfade style={{ animationDelay: "0.66s" }} className="nl-strip nl-strip-4 mt-[clamp(26px,4vh,54px)]">
        <div>
          <span data-tnum className="nl-num block text-[21px] font-bold leading-[1.1] tracking-[-0.04em]">
            {demoCount}
          </span>
          <span className="nl-mono-xs mt-1 block" style={{ color: "var(--nl-meta)" }}>
            Pages built and on file
          </span>
        </div>
        <div>
          <span data-tnum className="nl-num block text-[21px] font-bold leading-[1.1] tracking-[-0.04em]">
            24h
          </span>
          <span className="nl-mono-xs mt-1 block" style={{ color: "var(--nl-meta)" }}>
            Brief in, proposal back
          </span>
        </div>
        <div>
          <span data-tnum className="nl-num block text-[21px] font-bold leading-[1.1] tracking-[-0.04em]">
            0
          </span>
          <span className="nl-mono-xs mt-1 block" style={{ color: "var(--nl-meta)" }}>
            Calls, ever
          </span>
        </div>
        {/* THE PRICE, ABOVE THE FOLD — and it replaced a scroll cue, which is
            the trade stated plainly.

            A fixed price is one of this studio's four core promises, and the
            rule on it is blunt: never hide it. Before this cell the first
            number on the page was at viewport 41.7 of 45 — a product-aware
            buyer had to scroll forty-two screens to find out whether they could
            afford us. That is the most expensive thing a page can ask someone
            to do, and a decorative scroll hint is not worth it.

            Read from brand.ts by VALUE, never typed: adding or reordering a
            tier cannot leave a stale "from" price behind. */}
        <div>
          <span data-tnum className="nl-num block text-[21px] font-bold leading-[1.1] tracking-[-0.04em]">
            From {fromPrice}
          </span>
          <span className="nl-mono-xs mt-1 block" style={{ color: "var(--nl-meta)" }}>
            Fixed, agreed before we start
          </span>
        </div>
      </div>

      {/* The scroll cue keeps its job, just not a cell in the price strip. */}
      <div data-hfade style={{ animationDelay: "0.72s" }} className="mt-5 flex items-center gap-4">
        <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
          Scroll — one visitor, click to client
        </span>
        <span className="hidden md:block">
          {/* A STATIC RULE, DELIBERATELY UNHOOKED.
              This carried data-anim="s1scroll" and it was breaking the journey
              scene. The node cache is document-wide and the engine reads
              n.s1scroll[0]; Hero is earlier in the DOM, so it won that slot and
              the engine spent every frame writing translateY to a 1px-tall
              decorative bar — while the element the hook belongs to, the
              presence page's internally-scrolling body in act 1, was never
              written at all. Measured across ten scroll positions: Hero's bar
              matrix(1,0,0,1,0,0) every time, the presence page transform:none
              every time, so act 1 never revealed the lower half of the page it
              was supposed to be scrolling through.
              Verified in isolation at /nl-lab/journey — with only one s1scroll
              node the same markup animates 0 -> -177px — so this attribute was
              the entire cause. It stays off. */}
          <span aria-hidden className="relative block h-px w-[70px] overflow-hidden" style={{ background: "var(--nl-r16)" }}>
            <span
              className="absolute inset-y-0 left-0 block w-[24px]"
              style={{ background: "var(--nl-accent)" }}
            />
          </span>
        </span>
      </div>

      {/* Anchor target for the nav's "Pricing" link, and the goal router's
          scroll-to. Kept out of the visual flow. */}
      <Link href="#pricing" className="sr-only">
        Skip to pricing
      </Link>
    </section>
  );
}
