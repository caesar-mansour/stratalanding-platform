import { pricing, whatWeBuild } from "@/lib/brand";
import { SectionView } from "../SectionView";
import { LedgerHead } from "../LedgerHead";

/**
 * THE SYSTEM — three pages, one job each.
 *
 * This is the reference implementation of the PAPER REGISTER: ledger head, a
 * two-column lede with no h2, full-bleed ruled rows, zero radius, zero shadow.
 * Pinned scenes are the other register (cinema, elevation, 3D). Every seam on
 * the page alternates between the two; homogenising them is what makes a long
 * scroll read as one endless section, which killed an earlier attempt.
 *
 * THE CONSTRAINT LINE is the section's whole argument, and the design log calls
 * it the strongest premium signal on the page: under each product, in mono, the
 * thing it is NOT ALLOWED to do. A studio that publishes its refusals reads as
 * a studio with a method. Ours are true to the scope in brand.ts, not invented
 * severity — a Presence Page really does not run a funnel, and a Lead Page
 * really does carry exactly one offer.
 *
 * Row names and delivery windows come from `pricing`; the six services come
 * from `whatWeBuild`. No prices here — the pricing ledger owns cost, and this
 * section deliberately does not compete with it.
 */

/** Job + refusal per product. Keyed to brand.ts slugs so they can't drift apart. */
const JOBS: Record<string, { job: string; refusal: string }> = {
  "presence-page": {
    job: "Answers the only question a stranger has: is this outfit real, and are they any good?",
    refusal: "Not allowed to — run a funnel or chase a lead",
  },
  "lead-page": {
    job: "Takes one decision at a time until you have a name and a number. Two pages, no optional fields.",
    refusal: "Not allowed to — introduce a second offer",
  },
  "purchase-page": {
    job: "Carries the intent all the way to a payment, and writes the result back to your systems.",
    refusal: "Not allowed to — ask for anything it already knows",
  },
};

/**
 * The three specimen panels. Placeholder geometry only — the point is the
 * SHAPE each product takes, so the mock carries no business, no city, no price
 * and no claim. `cards` is what actually differs between the three: a presence
 * page ends in a service row, a lead page in a form, a purchase flow in a
 * checkout step.
 */
const SPECIMENS = [
  {
    key: "presence",
    name: "Presence",
    job: "Be worth trusting in eight seconds",
    cta: "Get in touch",
    kicker: "Sample · placeholder content",
    head: "One page that answers the only question.",
    lines: ["82%", "64%", "71%"],
    cards: 3,
  },
  {
    key: "lead",
    name: "Lead",
    job: "Turn attention into a name and a number",
    cta: "Start now",
    kicker: "Sample · placeholder content",
    head: "One decision at a time.",
    lines: ["76%", "58%"],
    cards: 2,
  },
  {
    key: "purchase",
    name: "Purchase",
    job: "Ask for money while they still mean it",
    cta: "Checkout",
    kicker: "Sample · placeholder content",
    head: "Landing to paid, without a detour.",
    lines: ["68%", "80%", "52%"],
    cards: 1,
  },
] as const;

const SPEC_CSS = `
/* Three panels that open on hover. flex 1 -> 2.7 is the source's ratio and its
   .75s is the source's timing. No JS, no state: it behaves the same whether or
   not the engine mounted, which is the whole reason it is a flex transition and
   not a scroll-driven one. */
[data-nl] .nls-specimens{display:flex;flex-direction:column;gap:14px}
[data-nl] .nls-spec{
  position:relative;overflow:hidden;flex:1;min-height:240px;
  border:1px solid var(--nl-r16);border-radius:6px;background:var(--nl-paper);
  transition:flex .75s var(--nl-ease);
}
@media (min-width:900px){
  [data-nl] .nls-specimens{flex-direction:row;height:min(560px,62vh);min-height:420px}
  [data-nl] .nls-spec:hover,[data-nl] .nls-spec:focus-within{flex:2.7}
}
/* The scrim sits ABOVE the mock and BELOW the caption, so the caption stays
   legible over whatever the mock is doing. */
[data-nl] .nls-spec-scrim{
  position:absolute;inset:0;z-index:3;pointer-events:none;
  background:linear-gradient(180deg,rgba(246,243,236,0) 38%,rgba(7,16,34,0.86) 100%);
}
[data-nl] .nls-spec-view{position:absolute;inset:0;overflow:hidden;z-index:1}
/* The mock is authored at a fixed 760px and scaled, because that is how the
   source builds it and how the proportions stay right. On a 390px phone a .62
   scale still measures ~471px, so the right edge of the mock was clipped by the
   panel. The scale is a variable now: phones get just enough to fit the panel,
   desktop keeps the authored .62. */
[data-nl] .nls-spec-page{width:760px;transform:scale(var(--nls-scale,.44));transform-origin:0 0;background:#fff}
@media (min-width:560px){[data-nl] .nls-specimens{--nls-scale:.52}}
@media (min-width:900px){[data-nl] .nls-specimens{--nls-scale:.62}}
[data-nl] .nls-spec-bar{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 22px;border-bottom:1px solid rgba(11,27,58,.08);
}
[data-nl] .nls-spec-mark{font-weight:700;font-size:13px;letter-spacing:-.025em;color:#0b1b3a}
[data-nl] .nls-spec-cta{background:#0E6B7A;color:#fff;padding:6px 11px;border-radius:3px;font-weight:600;font-size:10px}
[data-nl] .nls-spec-body{padding:30px 22px;display:flex;flex-direction:column;gap:12px}
[data-nl] .nls-spec-kicker{
  font-family:var(--font-nl-mono),monospace;font-size:8px;letter-spacing:.2em;
  text-transform:uppercase;color:#0E6B7A;
}
[data-nl] .nls-spec-head{font-size:26px;font-weight:700;letter-spacing:-.03em;line-height:1.1;color:#0b1b3a;max-width:22ch}
[data-nl] .nls-spec-line{display:block;height:9px;border-radius:2px;background:rgba(11,27,58,.09)}
[data-nl] .nls-spec-row{display:flex;gap:10px;padding-top:8px}
[data-nl] .nls-spec-card{flex:1;height:74px;border-radius:4px;background:rgba(11,27,58,.045);border:1px solid rgba(11,27,58,.07);display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:10px}
[data-nl] .nls-spec-cardline{display:block;height:6px;border-radius:2px;background:rgba(11,27,58,.10)}
/* The hero plate — the block every real landing page opens with. Teal at low
   alpha so it reads as the sample client's colour, not ours. */
[data-nl] .nls-spec-hero{height:132px;border-radius:5px;background:linear-gradient(135deg,rgba(14,107,122,.14),rgba(11,27,58,.05));border:1px solid rgba(11,27,58,.07);display:grid;place-items:center;margin-top:4px}
[data-nl] .nls-spec-heroicon{display:block;width:38px;height:38px;border-radius:50%;background:rgba(14,107,122,.22)}
[data-nl] .nls-spec-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;margin-top:6px;border-top:1px solid rgba(11,27,58,.08)}
[data-nl] .nls-spec-pill{display:block;width:88px;height:22px;border-radius:3px;background:rgba(14,107,122,.5)}
[data-nl] .nls-spec-cap{
  position:absolute;left:0;right:0;bottom:0;z-index:4;
  display:flex;flex-direction:column;gap:5px;padding:20px;
}
[data-nl] .nls-spec-name{
  font-family:var(--font-heading),system-ui,sans-serif;font-weight:700;
  font-size:22px;letter-spacing:-.03em;line-height:1.05;color:var(--nl-paper);
}
[data-nl] .nls-spec-job{
  font-family:var(--font-nl-mono),monospace;font-size:9px;letter-spacing:.16em;
  text-transform:uppercase;color:rgba(251,249,244,.66);
}
@media (prefers-reduced-motion: reduce){[data-nl] .nls-spec{transition:none}}
`;

export function System() {
  return (
    <section
      id="system"
      data-screen-label="System"
      data-bg="#f6f3ec"
      className="nl-section"
      style={{ background: "var(--nl-ground-bone)", paddingBottom: 130 }}
    >
      <style dangerouslySetInnerHTML={{ __html: SPEC_CSS }} />

      {/* Reach reporting for a server component — see SectionView. */}
      <SectionView anchor="system" report="system" />

      <LedgerHead label="The system" meta="Three pages · one job each" />

      <div className="nl-inner flex flex-col gap-16">
        {/* The lede. Deliberately no h2 — the rows are the heading. */}
        <div className="nl-bleed flex flex-col" style={{ paddingLeft: "var(--nl-gutter)", paddingRight: "var(--nl-gutter)" }}>
          <div className="flex flex-wrap items-end justify-between gap-11 pb-[clamp(14px,2vw,24px)]">
            <p
              data-fade
              className="m-0 font-medium"
              style={{
                fontSize: "clamp(17px,1.6vw,22px)",
                lineHeight: 1.45,
                color: "var(--nl-ink)",
                maxWidth: "34ch",
              }}
            >
              {/* WAS: "Most studios sell you twelve pages of everything,
                  converting nothing." A quantified claim about unnamed
                  competitors WITH A RESULT attached, on a page whose whole
                  discipline is that you may not claim a result you have not
                  measured. It was also self-defeating: it asserted for everyone
                  else exactly what we refuse to assert for ourselves.

                  The refusal is the flex. Said in the first person it costs
                  nothing and is checkable against the ledger rows below. */}
              A page is only ever good at the one thing it was allowed to do.
            </p>
            <p
              data-fade
              className="m-0"
              style={{ fontSize: 15, lineHeight: 1.5, color: "var(--nl-body)", maxWidth: "38ch" }}
            >
              {/* The trailing clause was "— which is the only reason the numbers
                  move": a causal mechanism for conversion outcomes this studio
                  has never measured. What follows is what the section can
                  actually show, and does, twenty pixels below. */}
              So we build three, and print underneath each one what it is not allowed to do.
            </p>
          </div>

          <div style={{ borderTop: "1px solid var(--nl-r24)" }}>
            {pricing.map((p, i) => {
              const meta = JOBS[p.slug];
              return (
                <div
                  key={p.slug}
                  data-lay
                  className="nl-row grid items-baseline"
                  style={{
                    gridTemplateColumns: "52px minmax(0,1fr) minmax(0,0.82fr)",
                    gap: "clamp(18px,3vw,48px)",
                    padding: "clamp(16px,2.2vw,26px) 0",
                    borderBottom: "1px solid var(--nl-r14)",
                  }}
                >
                  <span
                    data-tnum
                    className="nl-num text-[11px] tracking-[0.14em]"
                    style={{ color: "var(--nl-accent)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span
                    className="nl-h2 block"
                    style={{ fontSize: "clamp(30px,4.4vw,64px)", lineHeight: 0.92 }}
                  >
                    {p.name.replace(" Page", "")}
                  </span>

                  <span className="flex flex-col gap-[7px] pt-[clamp(4px,0.8vw,10px)]">
                    <span
                      style={{
                        fontSize: "clamp(14px,1.2vw,17px)",
                        lineHeight: 1.45,
                        color: "var(--nl-ink)",
                      }}
                    >
                      {meta.job}
                    </span>
                    <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                      {meta.refusal}
                    </span>
                    <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
                      {p.deliverables.pages} · {p.deliverables.revisions} · {p.delivery}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── THE SPECIMENS ────────────────────────────────────────────────
            Three panels, one per product, that OPEN ON HOVER — flex 1 -> 2.7
            over .75s. Pure CSS: no state, no JS, so it behaves identically
            whether or not the engine mounted, which is the same reason the
            receipts rows expand with grid-template-rows.

            [data-spec] is the engine's hook for two things: these panels join
            the sheet pass (sheets() selects `[data-lay],[data-spec]`, so they
            rise to face the reader like the ledger rows above), and they are in
            the blueprint overlay's curated node list.

            THE MOCKUPS ARE DELIBERATELY GENERIC. The source renders a complete
            fictional dental practice in here — a named clinic, a city, a teal
            brand, a "Book a visit" button, prices. A realistic client page
            shown in a studio's own voice is exactly the thing a prospect
            reasonably mistakes for client work, so ours shows the SHAPE of each
            page in placeholder blocks under a labelled sample brand. The
            caption says what each one is; none of them claims a result.

            The sample brand keeps a teal of its own — law 9: the client's brand
            is never our brand, and that contrast is what makes these read as
            somebody else's page rather than more of our chrome. */}
        <div className="nls-specimens">
          {SPECIMENS.map((sp, i) => (
            <div key={sp.key} data-spec className="nls-spec">
              <div aria-hidden className="nls-spec-view">
                <div className="nls-spec-page">
                  <div className="nls-spec-bar">
                    <span className="nls-spec-mark">
                      SAMPLE<span style={{ color: "#0E6B7A" }}> BRAND</span>
                    </span>
                    <span className="nls-spec-cta">{sp.cta}</span>
                  </div>
                  <div className="nls-spec-body">
                    <span className="nls-spec-kicker">{sp.kicker}</span>
                    <span className="nls-spec-head">{sp.head}</span>
                    {sp.lines.map((w, li) => (
                      <span key={li} className="nls-spec-line" style={{ width: w }} />
                    ))}
                    {/* A hero plate and a footer rule. The source fills these
                        panels with a complete fictional practice, which reads
                        dense because a real page IS dense — ours has to get
                        that density from LAYOUT rather than from invented
                        content, or the three products look like empty boxes
                        next to the design they came from. */}
                    <div className="nls-spec-hero">
                      <span className="nls-spec-heroicon" />
                    </div>
                    <div className="nls-spec-row">
                      {Array.from({ length: sp.cards }).map((_, c) => (
                        <span key={c} className="nls-spec-card">
                          <span className="nls-spec-cardline" style={{ width: "62%" }} />
                          <span className="nls-spec-cardline" style={{ width: "84%" }} />
                        </span>
                      ))}
                    </div>
                    <div className="nls-spec-foot">
                      <span className="nls-spec-line" style={{ width: "26%" }} />
                      <span className="nls-spec-pill" />
                    </div>
                  </div>
                </div>
              </div>
              <div aria-hidden className="nls-spec-scrim" />
              <div className="nls-spec-cap">
                <span
                  data-tnum
                  className="nl-num text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--nl-accent)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="nls-spec-name">{sp.name}</span>
                {/* THE JOB LINE IS GONE. It printed Journey's three act
                    headlines verbatim — "Be worth trusting in eight seconds",
                    "Turn attention into a name and a number", "Ask for money
                    while they still mean it" — at 9px, two viewports after the
                    film rendered those same three sentences at display size
                    with an entire scene built around them. On a phone, where
                    the film degrades to its written fallback, a reader met each
                    sentence twice inside about two viewports.

                    Journey earns them. This section already states each page's
                    job at length in the ledger rows above, in its own words. */}
              </div>
            </div>
          ))}
        </div>
        <span className="nl-mono-sm" style={{ color: "var(--nl-faint)" }}>
          Hover a page to open it · sample designs, placeholder brand &amp; content
        </span>

        {/* What every build carries, whichever page you pick. Same 1px-gap
            technique as the hero strip — the gap is the rule. */}
        <div className="flex flex-col gap-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="nl-h3 m-0" style={{ fontSize: "clamp(20px,2vw,28px)" }}>
              Six things, on every build.
            </h2>
            <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
              Whichever page you pick
            </span>
          </div>
          <div className="nl-strip nl-strip-3">
            {whatWeBuild.map((s, i) => (
              <div key={s.title} data-fade className="flex flex-col gap-2" style={{ padding: "22px 20px 24px" }}>
                <span data-tnum className="nl-num text-[11px] tracking-[0.14em]" style={{ color: "var(--nl-accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] font-semibold leading-tight" style={{ color: "var(--nl-ink)" }}>
                  {s.title}
                </span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--nl-body)" }}>
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
