/**
 * THE SHEET PASS — shared styles for the laid rows.
 *
 * The pinned scenes are glass and light. The static sections are PAPER. This is
 * the paper half: the eleven-plus ledger rows in #system, #refusal and #pricing
 * lie flat in the depth of the page and rise to face the reader as they reach
 * the reading line, hinged on their own bottom edge. Scroll-linked, reversible,
 * one vocabulary across all three sections.
 *
 * ── WHO WRITES WHAT ─────────────────────────────────────────────────────────
 * The MOTION is not here. `sheets(vh)` in engine/NLEngine.ts (line ~1795) owns
 * it: it queries `[data-lay],[data-spec]` every frame, and per element writes
 *
 *   transform: perspective(1600px) translate3d(0, k*16px, -k*110px) rotateX(k*22deg)
 *   opacity:   0.22 + 0.78 * clamp(e * 1.25)
 *   filter:    blur(), quantised to 5 steps, dropped entirely below k = 0.14
 *
 * where t = clamp((vh * (1 - s*0.045) - rect.top) / (vh * 0.62)), e = ez(t),
 * k = 1 - e, and `s` is a stagger index the engine derives at scan time from
 * siblings that share a top edge (so side-by-side sheets deal in from the left
 * instead of arriving as one slab). It also sets transform-origin, backface and
 * will-change inline on its first pass. This file only has to (a) make those
 * three properties correct BEFORE the engine's first frame, and (b) hold the
 * page together everywhere the engine never runs. Nothing here animates.
 *
 * The 22°/-110px numbers look timid and are deliberate: the design log records
 * that 64°/-300px read as a cheap flip-in and kept the type illegible for the
 * whole travel. Do not "make it more 3D".
 *
 * ── WHY THERE IS NO PERSPECTIVE ON A PARENT ─────────────────────────────────
 * Perspective is applied PER ROW, inside the row's own transform. Two reasons,
 * both load-bearing and both documented in notes/DESIGN-NOTES.md:
 *
 *   1. #pricing's row container carries [data-fade], which animates `filter`.
 *      A filtered element renders as a group — it is not a 3D context worth
 *      building on, and a `perspective` there would be applied to a flattened
 *      subtree.
 *   2. A per-element perspective means no parent ever needs
 *      `transform-style: preserve-3d`. preserve-3d does true plane
 *      intersection and `z-index` does nothing inside it — the class of bug
 *      that cost three sessions on the anatomy deck. Here it is arithmetically
 *      impossible.
 *
 * So: never add `perspective`, `transform-style` or `perspective-origin` to
 * #system, #refusal or #pricing, or to any wrapper inside them. The pass is
 * already correct without them and they can only break it.
 *
 * ── THE RULE THAT IS ACTUALLY LOAD-BEARING ──────────────────────────────────
 * NLEngine.unmount() (line 222) cancels the rAF and removes its listeners. It
 * does NOT reset the inline styles it wrote. NLRoot mounts the engine on tier B
 * only — `(min-width:1025px) and (pointer:fine)`, motion on, device not low-end
 * (components/strata/tier.ts line 30) — so dragging a desktop window below
 * 1025px, or flipping the OS reduced-motion switch, tears the engine down and
 * leaves whatever row was mid-travel stranded at `opacity:.22;
 * filter:blur(2px); rotateX(22deg)`, forever, with nothing left running to
 * finish it. Measured: resizing 1600 -> 390 mid-travel left a #refusal row at
 * computed opacity 0.22 and blur(2px). The reset below is the fix, and it is
 * the same guard nl.css already applies to the stage layers for the same
 * reason. 1025 is the number, not 1040 — see the media query's own note.
 *
 * ── THE HOLE THIS FILE CANNOT REACH ─────────────────────────────────────────
 * Tier B also requires `deviceTier !== "low"` and a non-mobile user agent, and
 * neither is expressible in CSS. A wide fine-pointer screen that resolves to
 * tier A — a low-end laptop, or JS disabled, or the engine throwing on mount —
 * gets no engine AND no entrance here, so these sixteen rows render static
 * while every other row in the paper register still animates in. They are
 * legible and correct, just still; verified at 1440px with javaScriptEnabled
 * false. Closing it needs a marker on an ANCESTOR of the sections (NLRoot's
 * tier-B furniture is fixed chrome, not a parent) — an owner decision, logged
 * in ./sheet-pass.md section 7.
 *
 * ── WHAT THE ROWS GAVE UP ───────────────────────────────────────────────────
 * All of these rows previously carried [data-row], whose `nlRowIn` runs on
 * `animation-timeline: view()`. A running CSS animation beats an inline
 * transform, so a row cannot carry both — this is the ONE WRITER law and it is
 * why the swap is a swap and not an addition. Losing [data-row] costs the rows
 * their entrance in the states where the engine never mounts, so this file
 * hands it back there as `nlSheetIn`: one keyframe that owns transform,
 * opacity AND filter together, so it also overwrites any stranded inline value
 * without needing `!important` (animations outrank inline style; !important
 * would in turn outrank the animation, which is exactly why the reduced-motion
 * clamp and the mobile entrance are in separate blocks below).
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────
 * Render <SheetPassStyles /> exactly once anywhere inside [data-nl] — it is a
 * plain server component with no props and no client boundary. The per-element
 * attributes it styles are listed, file by file, in ./sheet-pass.md.
 */

const CSS = `
/* Declared here as well as inline by the engine so the values are already
   right on the server-rendered first paint, and so they survive any future
   code that clears inline styles. transform-origin is the hinge: the sheet
   pivots on its own BOTTOM edge, which is what makes it read as paper lying
   on the page rather than a card flipping in space. */
[data-nl] [data-lay],
[data-nl] [data-spec]{
  transform-origin:50% 100%;
  backface-visibility:hidden;
}

@keyframes nlSheetIn{
  from{opacity:0;transform:translateY(14px);filter:blur(3px)}
  to{opacity:1;transform:none;filter:none}
}

/* ── ENGINE NEVER MOUNTS, MOTION IS FINE ───────────────────────────────────
   Below the tier gate, or on a coarse pointer, the page is an ordinary
   stacked document. The rows get the paper register's normal entrance back,
   in place of the [data-row] they had to give up. Because nlSheetIn animates
   all three properties the engine writes, it also clears any value stranded
   by a resize across the breakpoint — no !important on those three, which
   would beat the animation and freeze it flat.

   THE BREAKPOINT IS THE TIER GATE, TO THE PIXEL, AND IT IS NOT 1040.
   useStrataTier (components/strata/tier.ts line 30) mounts the engine on
   (min-width: 1025px) and (pointer: fine). This query must be its exact
   complement — max-width:1024px, or coarse — because the two writers cannot
   overlap by even one pixel. They did: at 1039/1032/1026px the engine was
   mounted AND running, writing perspective(1600px) … rotateX(22deg) at
   opacity .22 inline every frame, while nlSheetIn ran on top of it. A
   running CSS animation outranks inline style, so the computed value was
   matrix(1,0,0,1,0,14) at opacity 0 — the sheet pass silently dead and
   every row below its view-range invisible, for the whole 1025–1039 band.
   That is the ONE WRITER law broken by this stylesheet; measured, not
   theorised. If the tier gate ever moves, move this with it.

   will-change is !important on purpose, unlike the three animated
   properties: sheets() writes will-change:transform INLINE on its first
   scan and unmount() never clears it, so without !important a window dragged
   from 1600px down to a phone width keeps sixteen permanently-composited
   layers on the smallest device on the page. Verified computed
   will-change: transform here before the change. It cannot beat the
   animation, because animations do not write will-change. */
@media (max-width:1024px),(pointer:coarse){
  [data-nl] [data-lay],
  [data-nl] [data-spec]{will-change:auto!important}
  @supports (animation-timeline: view()){
    [data-nl] [data-lay],
    [data-nl] [data-spec]{
      animation:nlSheetIn .85s cubic-bezier(.2,.9,.28,1) both;
      animation-timeline:view();
      animation-range:entry 3% cover 19%;
    }
  }
  /* No view() timeline (Safari <26, Firefox): nothing animates, so the
     stranded values have to be cleared outright. */
  @supports not (animation-timeline: view()){
    [data-nl] [data-lay],
    [data-nl] [data-spec]{transform:none!important;opacity:1!important;filter:none!important}
  }
}

/* ── REDUCED MOTION ────────────────────────────────────────────────────────
   The design notes are explicit: the laid-row 3D is disabled under reduce and
   the page must remain a readable static document. sheets() already skips the
   whole loop (this.rmo), so this only has to cover the two holes it leaves —
   a value written before the preference changed, and the will-change hint the
   engine sets outside its own rmo guard. This block is last and uses
   !important on purpose: it must outrank both inline style and the mobile
   entrance above, on a narrow screen with reduce set. */
@media (prefers-reduced-motion: reduce){
  [data-nl] [data-lay],
  [data-nl] [data-spec]{
    animation:none!important;
    transform:none!important;
    opacity:1!important;
    filter:none!important;
    will-change:auto!important;
  }
}
`;

export function SheetPassStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
