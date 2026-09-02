"use client";

/**
 * THE COLOUR FIELD — one fixed ground for the whole document.
 *
 * From the handoff README: "a fixed full-viewport background that lerps between
 * section colours as you scroll, so the page reads as one surface changing
 * temperature rather than stacked boxes."
 *
 * THE ENGINE CONTRACT (bgfield() in engine/NLEngine.ts, ~L613). Two hooks, and
 * this file owns exactly one of them:
 *
 *   [data-anim="field"]  THIS element. The engine writes `style.background` on
 *                        it every frame it changes, as `rgb(r,g,b)`.
 *   [data-bg="#rrggbb"]  a BAND. One per section, on the <section> itself. The
 *                        engine re-queries `document.querySelectorAll('[data-bg]')`
 *                        every frame (never cached — a hot reload leaves orphaned
 *                        nodes whose rects are all zero and the field freezes),
 *                        finds the last band whose top has passed 0.42 * vh, and
 *                        lerps that band's colour toward the NEXT band's over the
 *                        last `min(300px, bandHeight * 0.5)` of it.
 *
 * I may not edit the section files — four other agents own them — so the band
 * side of the contract ships as NL_FIELD_BANDS in ./field-bands.ts (a plain
 * module, NOT this one: a value exported from a "use client" file is a client
 * reference by the time a server component reads it, and renders as undefined —
 * see the warning at the top of that file) plus the exact one-line edits
 * recorded in THE HANDOFF below.
 *
 * ── WHY THE SECTIONS CANNOT SIMPLY GO TRANSPARENT ─────────────────────────────
 * In the source every section is transparent and the field is the ONLY ground.
 * We cannot copy that: the engine mounts on tier B only (desktop >=1025px, fine
 * pointer, motion on). A transparent #watching on a phone is `--nl-paper` type
 * on `--nl-bone` paper — 1.1:1, i.e. gone. The engine already carries one
 * defence for this (if the field node is missing it re-applies every data-bg as
 * a hard cut rather than shipping invisible text); this file carries the second.
 *
 * The mechanism is a token indirection declared in the scoped sheet below:
 *
 *   [data-nl]                            --nl-ground-bone: var(--nl-bone)
 *   :root[data-nl-field="live"] [data-nl] --nl-ground-bone: transparent
 *
 * A section paints `background: "var(--nl-ground-bone)"` instead of
 * `"var(--nl-bone)"` and is then correct in both worlds: it paints itself until
 * the field is PROVEN live, and dissolves into the field afterwards. The flip is
 * invisible because at the instant it happens the field is already showing that
 * band's own colour.
 *
 * "Proven live" is not a tier check and not a `typeof window` check — it is a
 * direct probe of the only thing that actually matters: has bgfield() written an
 * inline background onto this node yet. Hence the field's own SSR colour comes
 * from the .nl-field CLASS and never from an inline style, so an empty
 * `el.style.background` is an unambiguous "the engine has not painted". If the
 * engine never mounts, or mounts and throws before its first bgfield(), the
 * probe times out at ~2s and every section keeps its own paint forever.
 *
 * The ground variables are DELIBERATELY not the same names as the tokens. Only a
 * section's own band ground may dissolve; the cards, plates and chips inside it
 * that also use --nl-panel must stay opaque, so they keep the token name and are
 * untouched by the flip.
 *
 * ── THE HANDOFF — APPLIED, except one line ───────────────────────────────────
 * Recorded in full below because the shape of it is the contract, not because
 * the work is outstanding. As of 2026-08-13 steps 1-3 are in: page.tsx mounts
 * the field, Stage.tsx carries `bg`, and all fifteen shipped sections declare a
 * band and paint through the indirection. Verified in a browser at 1600x1000 —
 * every band's midpoint resolves to its own declared hex, and every section's
 * computed background is rgba(0,0,0,0), i.e. the field really is the ground.
 *
 * NOTHING IS OPEN. An earlier revision of this note said Journey.tsx still
 * needed `bg="#f6f3ec"`. It does NOT, and adding it would be wrong — see the
 * `journey` key in field-bands.ts. Journey shipped painting its scene ground as
 * a hard `#f6f3ec` that the engine lerps bone -> navy across the scene; it never
 * reads a `--nl-ground-*` variable, so it is opaque on every tier and owns no
 * band for the same reason Hero owns none.
 *
 * The rule the old note was reaching for still stands and is the one thing to
 * check when adding a section: a section that paints through the indirection
 * WITHOUT declaring a band is the one failure this design can produce — the
 * field keeps the previous band's colour and the section's type sits on the
 * wrong ground. `var(--nl-ground-*)` and `data-bg` ship together or neither
 * ships. Journey is safe because it does neither.
 *
 * Re-verified 2026-08-13 at 1600x1000: all fifteen bands resolve to their own
 * declared hex at their midpoints, every one of those fifteen sections computes
 * to rgba(0,0,0,0) with `data-nl-field="live"` on <html>, and at 390px/coarse
 * the attribute is never set and all fifteen paint their own ground.
 *
 * 1. src/app/page.tsx — mount the field as the FIRST child inside
 *    [data-nl="root"] (it is z-index:0 and positioned siblings with z-auto paint
 *    after it in DOM order, which is what puts every section in front of it):
 *
 *        import { ColourField } from "@/components/northline/ColourField";
 *        ...
 *        <div data-nl="root" ...>
 *          <ColourField />        <-- here, before <NLRoot />
 *
 * 2. src/components/northline/Stage.tsx — the four pinned scenes render their
 *    <section> through Stage, so Stage needs to pass the band through. `data-bg`
 *    must sit on the SECTION and never on the sticky child: the engine measures
 *    the band with getBoundingClientRect, and a sticky child's rect is pinned to
 *    the viewport for the whole scene, which would make the band ordering
 *    nonsense. Two lines:
 *
 *        interface StageProps { ...; bg?: string; }          // + prop
 *        export function Stage({ ..., bg, ... }) ...
 *        <section ... {...(bg ? { "data-bg": bg } : {})} >   // + attribute
 *
 * 3. Per section, TWO one-line edits — add the band, and switch the section's
 *    own ground to the indirection — plus the import:
 *
 *        import { NL_FIELD_BANDS } from "@/components/northline/field-bands";
 *
 *    (import from field-bands, NEVER from this file). Nothing else changes.
 *
 *   Hero.tsx        (no band — parity with the source, whose hero owns none.
 *                    At scroll 0 no band top has passed mid, so bgfield falls
 *                    back to els[0] and the hero reads bone anyway.)
 *
 *   System.tsx      L47   style={{ background: "var(--nl-ground-bone)", paddingBottom: 130 }}
 *                   +     data-bg="#f6f3ec"          on the <section>
 *   Anatomy.tsx     L338  style={{ background: "var(--nl-ground-ink-deep)" }}
 *                   +     bg="#071022"               on its <Stage>
 *   Compare.tsx     L100  style={{ background: "var(--nl-ground-panel)", paddingBottom: 120 }}
 *                   +     data-bg="#ece6d7"          on the <section>
 *   Manifesto.tsx   L51   style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 140, overflow: "hidden" }}
 *                   +     data-bg="#0a1730"          on the <section>
 *   Spine.tsx       L49   style={{ background: "var(--nl-ground-ink-band)" }}
 *                   +     bg="#0a1730"               on its <Stage>
 *   Portal.tsx      L220  style={{ background: "var(--nl-ground-bone)" }}
 *                   +     bg="#f6f3ec"               on its <Stage>
 *   Process.tsx     L382  style={{ background: "var(--nl-ground-panel)" }}
 *                   +     bg="#ece6d7"               on its <Stage>
 *   Marquee.tsx     L83   background: "var(--nl-ground-ink-deep)",
 *                   +     data-bg="#071022"          on the <section>
 *   Math.tsx        L132  style={{ background: "var(--nl-ground-bone)", paddingBottom: 120 }}
 *                   +     data-bg="#f6f3ec"          on the <section>
 *   Watching.tsx    L172  style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 112 }}
 *                   +     data-bg="#0a1730"          on the <section>
 *   Receipts.tsx    L330  style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 118 }}
 *                   +     data-bg="#0a1730"          on the <section>
 *   Refusal.tsx     L95   style={{ background: "var(--nl-ground-panel)" }}
 *                   +     data-bg="#ece6d7"          on the <section>
 *   Assay.tsx       L85   style={{ background: "var(--nl-ground-panel)", paddingBottom: 118 }}
 *                   +     data-bg="#ece6d7"          on the <section>
 *   Pricing.tsx     L112  style={{ background: "var(--nl-ground-bone)", paddingBottom: 120 }}
 *                   +     data-bg="#f6f3ec"          on the <section>
 *   Start.tsx       L153  style={{ background: "var(--nl-ground-ink-deep)", padding: "0 var(--nl-gutter) 0" }}
 *                   +     data-bg="#071022"          on the <section>
 *
 *   (journey, when it lands: bg="#f6f3ec" — the source's #EFEDE8 bone.)
 *
 * Line numbers were read on 2026-08-13 and the sections are being edited in
 * parallel; match on the style string, not on the number.
 *
 * ── WHERE THIS MAP DEPARTS FROM THE SOURCE, AND WHY ──────────────────────────
 * The field's job is to BE each section's ground, so every value below is taken
 * from what OUR section already paints, not from the source's band list. Two
 * differ from a literal translation of the source:
 *   anatomy   source #131210 (band) -> ours ink-DEEP #071022. Anatomy was ported
 *             onto the deeper navy; a field that disagreed with it would produce
 *             a visible jump the moment the ground flip happens.
 *   marquee   the source's marquee owns no band at all (it is 71px of flow
 *             inside #math, and the engine carries a specific note about a fixed
 *             300px seam eating it whole). Ours is a standalone navy <section>,
 *             so it gets a real band; the engine's seam clamp,
 *             min(300, height * 0.5), is what makes a short band safe.
 * assay has no source counterpart at all — it is a StrataLanding section, panel.
 */

import { useEffect, useRef } from "react";

/** ~2s at 60fps. After this the field is declared dead and the sections keep
 *  their own paint — the failure mode we accept is "looks like today", never
 *  "text on a transparent ground". */
const PROBE_FRAMES = 120;

export function ColourField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    let raf = 0;
    let frames = 0;

    // The probe. `el.style.background` is empty in SSR by construction (the
    // .nl-field class paints it, not an inline style), so any inline value is
    // proof that bgfield() has run at least once on THIS node.
    const probe = () => {
      if (el.style.background) {
        root.setAttribute("data-nl-field", "live");
        return;
      }
      if (++frames > PROBE_FRAMES) return;
      raf = requestAnimationFrame(probe);
    };
    raf = requestAnimationFrame(probe);

    return () => {
      cancelAnimationFrame(raf);
      // Crossing the tier boundary on a resize unmounts the engine. Handing the
      // grounds back is what stops a section being stranded transparent over a
      // field nobody is painting any more.
      root.removeAttribute("data-nl-field");
    };
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
[data-nl] .nl-field{position:fixed;inset:0;z-index:0;pointer-events:none;background:var(--nl-bone)}

/* THE GROUND INDIRECTION. Default = paint yourself. Only flips once the field
   has been observed painting. Deliberately NOT !important: the engine's own
   fallback (field node missing -> re-apply every data-bg as a hard inline
   background on the section) writes an inline style, and an inline style must
   still win. Two safety nets, stacked, neither able to cancel the other. */
[data-nl]{
  --nl-ground-bone: var(--nl-bone);
  --nl-ground-panel: var(--nl-panel);
  --nl-ground-ink-band: var(--nl-ink-band);
  --nl-ground-ink-deep: var(--nl-ink-deep);
}
:root[data-nl-field="live"] [data-nl]{
  --nl-ground-bone: transparent;
  --nl-ground-panel: transparent;
  --nl-ground-ink-band: transparent;
  --nl-ground-ink-deep: transparent;
}

/* Belt and braces for the case the probe is somehow satisfied on a device the
   engine cannot drive: below the stage breakpoint the grounds never dissolve,
   whatever the attribute says. Same predicate nl.css unpins the stages with. */
@media (max-width: 1039px), (pointer: coarse), (prefers-reduced-motion: reduce){
  :root[data-nl-field="live"] [data-nl]{
    --nl-ground-bone: var(--nl-bone);
    --nl-ground-panel: var(--nl-panel);
    --nl-ground-ink-band: var(--nl-ink-band);
    --nl-ground-ink-deep: var(--nl-ink-deep);
  }
}
`,
        }}
      />
      {/* Renders VISIBLE, at bone, in server HTML and on every phone — it is the
          page's ground and must never be authored dark or transparent. */}
      <div ref={ref} data-anim="field" aria-hidden className="nl-field" />
    </>
  );
}
