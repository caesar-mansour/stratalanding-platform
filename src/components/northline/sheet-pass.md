# THE SHEET PASS — what shipped

`sheets(vh)` lays the ledger rows of `#system`, `#refusal` and `#pricing` flat in
the depth of the page and hinges them up on their own bottom edge as they reach
the reading line. This file is the record of every hook it runs on and every
rule anyone editing those rows has to keep.

**This document was originally an APPLY LIST for edits that had not been made
yet. They have all been made, and two of them landed differently from the plan.
It is now a description of the tree, not a set of instructions.** Everything
below was re-verified against the running dev server on the current markup.

**Files:**

- `src/components/northline/SheetPass.tsx` — `<SheetPassStyles />`, the shared
  CSS. Mounted once in `src/app/page.tsx` (line ~134, next to `<ColourField />`,
  inside `[data-nl]`).
- This file.

**Engine, for reference:** `engine/NLEngine.ts` line ~1795, `sheets(vh)`. It
queries `[data-lay],[data-spec]` document-wide, writes `transform` / `opacity` /
`filter` inline every frame, and sets `transform-origin`, `backface-visibility`
and `will-change` inline on its first scan. It caches the node list in
`this.lays` behind `!this.lays.length`, so while there are zero matches it
re-queries every frame and picks up new nodes with no reload.

---

## 1. The hooks that are live

| File | Element | Attribute | Count |
| --- | --- | --- | --- |
| `sections/System.tsx` ~181 | product row (`.nl-row`) | `data-lay` | 3 |
| `sections/System.tsx` ~250 | specimen panel (`.nls-spec`) | `data-spec` | 3 |
| `sections/Refusal.tsx` ~130 | refusal row | `data-lay` | 7 |
| `sections/Pricing.tsx` ~158 | price row (`.nlp-row`) | `data-lay` | 3 |

**16 sheets: 13 `data-lay`, 3 `data-spec`.** The spec's own count is 11 + 3.
The difference is `#refusal`: this build's no-list is seven entries, not five.
Verified live — `[data-lay]` 13 (system 3, refusal 7, pricing 3), `[data-spec]`
3, and **zero** elements carrying a sheet hook alongside `data-row` /
`data-fade` / `data-reveal` / `data-rule` / `data-wm`.

Every one of those rows used to carry `data-row`. It had to go: `nlRowIn` runs
on `animation-timeline: view()`, a running CSS animation beats an inline
transform, and a row cannot have two writers. **It is a swap, never an
addition.** See §4.1.

### 1a. `data-spec` landed on the specimen panels, not on the strip

The original plan put the single `data-spec` on the `.nl-strip.nl-strip-3`
container, because at the time this build had no specimen panels — the source's
three were a fictional dental practice (`$129` cleanings, `$49 today`, "deposits
cut no-shows by 71%", card `4242 4242 4242 4242`, a Madison WI address), all of
it invented proof, none of it shippable.

`System.tsx` has since grown its own three panels, built from placeholder
geometry under a labelled `SAMPLE BRAND` — no business, no city, no price, no
claim — and they carry `data-spec` one each, which is the spec's shape. **The
strip container does not carry `data-spec` and must not be given it.**
`.nl-strip` draws its rules as 1px *gaps* with the container's hairline showing
through from behind; a 3D transform on the container is fine, but the
alternative that was tried — a hook per cell — shrinks each cell away from its
grid area, the hairline behind it paints as a solid slab, and the strip reads as
a grey box with six floating cards. The six cells keep `data-fade`. Leave them.

### 1b. `wireSess` was fixed in the engine, not worked around in the markup

`NLEngine.wireSess()` (line 1534) opens with

```ts
const rows = document.querySelectorAll('#pricing [data-row],#pricing [data-lay]');
if (!rows.length) return;          // ← above `this.sessWired = true`
```

That early return sits above the wiring for **everything else in the session
recorder**: `price_hover`, `[data-anim="calcin"]` (the `#math` worksheet drags),
`[data-anim="s5in"]` (form focus + typing) and `[data-anim="s5go"]` (submit).
`collect()` re-polls for ~9s, so it would retry and fail every time — silently,
with no console error.

The reference ships this as a dead wire: its pricing rows carry `data-lay` and
no `data-row`, while its `wireSess` still queries `#pricing [data-row]` only. A
faithful port imports the bug. The plan here was a markup workaround (relocate
`data-row` onto each row's left column); what shipped instead is the cleaner
fix — the selector was widened in `scripts/northline/port-engine.cjs` (§1c-ter,
lines ~199-200) and the regenerated engine carries it. The patch throws if the
source string is not found, so a future regeneration cannot lose it.

Verified live: `#pricing [data-row]` → 0, `#pricing [data-row],#pricing
[data-lay]` → 3, and the first row's name still resolves to `"Presence Page"`,
so the log still reads `presence page · row held`. **There is no `data-row`
anywhere in `#pricing` and there must not be one** — it would be a second writer
on a sheet.

---

## 2. The breakpoint is the tier gate, to the pixel

`SheetPass.tsx` hands the rows a CSS entrance (`nlSheetIn`) everywhere the
engine does not run, because giving up `data-row` cost them `nlRowIn`. The two
writers must never overlap.

`useStrataTier` (`components/strata/tier.ts` line 30) mounts the engine on
`(min-width: 1025px) and (pointer: fine)`. The media query in `SheetPass.tsx` is
therefore `@media (max-width:1024px),(pointer:coarse)` — its exact complement.

It was `max-width:1039px`, and that 15px was a live defect. Measured at 1039,
1032 and 1026px: tier B, engine mounted and writing `perspective(1600px)
translate3d(0,16px,-110px) rotateX(22deg); opacity:.22` inline every frame,
while `nlSheetIn` ran on top of it. The animation won. Computed value:
`matrix(1,0,0,1,0,14)` at **`opacity: 0`** — the sheet pass dead, and every row
below its view-range invisible, for the whole 1025–1039 band. Re-measured after
the change at 1025/1026/1200/1600: `animation-name: none`, engine values
resolving. At 1023/1024/900/390: engine absent, `nlSheetIn` running, zero
collisions.

**If the tier gate ever moves, move this with it.**

---

## 3. What `SheetPass.tsx` is actually for

1. **Correct on the first paint.** `transform-origin: 50% 100%` and
   `backface-visibility: hidden` are declared in CSS as well as written inline
   by the engine, so they are right in server HTML and survive anything that
   clears inline style.
2. **The unmount strand.** `NLEngine.unmount()` cancels the rAF and never resets
   what it wrote. Dragging a window below the gate, or flipping OS
   reduced-motion, strands whatever row was mid-travel at `opacity:.22;
   filter:blur(2px); rotateX(22deg)` forever. `nlSheetIn` animates transform,
   opacity **and** filter together, so it overwrites all three without
   `!important` — which would beat the animation and freeze the row flat.
   `will-change` is the exception and *is* `!important`: the engine writes
   `will-change:transform` inline and never clears it, so without the override a
   window dragged from 1600px to a phone keeps sixteen permanently composited
   layers on the smallest device on the page. Verified 1600 → 390: computed
   `will-change` was `transform`, is now `auto`; opacity 1, filter cleared, no
   inline transform left.
3. **No `view()` support** (Safari < 26, Firefox): `@supports not` clears
   transform/opacity/filter outright, since nothing is going to animate them.
4. **Reduced motion**, last block, `!important` on purpose — it has to outrank
   both inline style and the mobile entrance. `sheets()` already skips its loop
   under `rmo`; this covers a value written before the preference changed.
   Verified at 1600 with reduce: 16 hooks, 0 non-flat, 0 non-opaque, 0 filtered,
   `will-change: auto`, `animation-name: none`.

---

## 4. Standing rules for anyone editing these rows later

1. **Never re-add `data-row` / `data-fade` / `data-reveal` / `data-rule` /
   `data-wm` to an element carrying `data-lay` or `data-spec`.** The CSS
   animation wins and the sheet freezes flat. `scripts/nl-audit.cjs` will not
   catch it: its ONE WRITER rule (rule 4) only inspects tags carrying
   `data-anim`, and these hooks are queried directly rather than through
   `this.n`. Suggested patch, for whoever owns the audit:

   ```js
   // rule 4, alongside the data-anim pass
   for (const tag of src.match(/<[a-zA-Z][^>]*?>/gs) || []) {
     if (!/\bdata-(lay|spec)\b/.test(tag)) continue;
     const clash = CSS_ANIM_ATTRS.filter((a) => new RegExp(`\\b${a}\\b`).test(tag));
     if (clash.length) failures.push(`${rel(f)}: data-lay/data-spec AND ${clash.join("+")} — one writer per element.`);
   }
   ```

2. **Never put `transform`, `opacity` or `filter` into these rows'
   `transition`.** `sheets()` does not write `transition: none` (unlike the
   pinned scenes, which do it every frame on purpose), so a transition on a
   scroll-linked property makes the row lag the scrollbar. The current
   transitions cover `padding` / `padding-left` / `background-color` and
   `.nls-spec`'s `flex` only, and are safe.

3. **Never add `perspective`, `transform-style` or `perspective-origin`** to
   `#system`, `#refusal`, `#pricing` or anything inside them. Perspective is
   per-row, inside the transform, for two load-bearing reasons documented in
   `SheetPass.tsx`'s header: `#pricing`'s row container carries `data-fade`,
   which animates `filter`, and a filtered element renders as a group; and a
   per-element perspective means no parent ever needs `preserve-3d`, so the
   plane-intersection class of bug is arithmetically impossible here.

4. **The mobile entrance is `nlSheetIn`, not `nlRowIn`** — see §3.2.

5. **Row order and nesting are free.** `sheets()` does not index children; it
   reads each element's own rect. The only structural thing it derives is the
   stagger index, from siblings sharing a top edge within ±24px — which is what
   makes the three specimen panels deal in from the left instead of arriving as
   one slab.

---

## 5. Verified on the live tree

Dev server `:3007`, engine-written inline values, `transform-origin` computed
`50% 100%` on all 16.

| offset | `#system` r0 | `#refusal` r0 | `#pricing` r0 |
| --- | --- | --- | --- |
| below fold | `rotateX(22deg)` `-110px` op .22 blur 2px | same | same |
| entering | `rotateX(22deg)` `-110px` op .22 blur 2px | same | same |
| at the line | `rotateX(6.64deg)` `-33px` op .901 blur .8px | `rotateX(21.45deg)` op .244 | `rotateX(0.14deg)` op 1 |
| landing | `none` | `none` (r5 `0.49deg`, r6 `2.04deg` — the stagger) | `none` |
| landed | `none` op 1 filter none | `none` op 1 filter none | `none` op 1 filter none |
| scrub back | `rotateX(22deg)` op .22 blur 2px | same | same |

Console clean at every offset. Reversible in all three sections.

**390px, JS on and JS off:** 16 hooks, every sheet reaches `opacity 1`,
`blur 0px`, identity transform with real content when scrolled to the middle of
the viewport; `scrollWidth - clientWidth = 0` on both `documentElement` and
`body`.

**1440px, `javaScriptEnabled: false`:** 16 hooks, all legible, no overflow on
`body`.

`node scripts/nl-audit.cjs` → PASS. `npx tsc --noEmit` → no northline
diagnostics.

---

## 6. Known hole, and it cannot be closed from this file

Tier B also requires `deviceTier !== "low"` and a non-mobile user agent, and
neither is expressible in CSS. A wide fine-pointer screen that resolves to tier
A — a low-end laptop, JS disabled, or the engine throwing on mount — gets no
engine **and** no entrance, so these sixteen rows render static while every other
row in the paper register still animates in. They are legible and correctly laid
out; they are just still. Confirmed at 1440px with `javaScriptEnabled: false`:
`animation-name: none`, `transform: none`, `opacity: 1`.

Closing it needs a marker on an **ancestor** of the three sections. NLRoot's
tier-B furniture (`[data-nlcursor]`, the rail, the progress bar) is fixed chrome
and a sibling, not a parent, so `[data-nl] [data-lay]` cannot be scoped off it
without `body:has(...)`. That is an owner decision about NLRoot's markup, not
something this file should reach for.
