"use client";

/**
 * THE STUDIO / THE DOCKING BAY — the close, and the page's second real intake.
 *
 * ── WHAT THIS SECTION IS ──────────────────────────────────────────────────
 * The source ends the page by flying the one browser frame OUT of the mockup
 * and into a print-cropped landing zone in #start, where it stops being a
 * mockup and becomes the real intake form. That is the whole argument of the
 * page collapsing into one gesture: the interface you watched us build is the
 * interface you are now typing into, and submitting writes you into the same
 * event stream #watching was just showing you.
 *
 * ── THE ENGINE CONTRACT (startFrame() / framePage() in engine/NLEngine.ts) ──
 *   [data-startbay]          the landing zone. The engine caches it, reads its
 *                            getBoundingClientRect() EVERY FRAME and derives
 *                            both the flight and the scale from it:
 *                              u = cl(1 - (r.top + r.height/2 - vh*0.46) / (vh*0.74), 0, 1)
 *                              s = (r.width / 1060) * (0.64 + 0.36 * ez(u))
 *                            `r.width / 1060` is why the bay carries
 *                            aspect-ratio:1060/662 — the frame is authored at
 *                            exactly 1060x662 and the bay is the same rectangle
 *                            at whatever width the column gives it. Change
 *                            either number and the landed frame no longer
 *                            registers on its own crop marks.
 *   [data-anim="stageWrap"]  ALSO [data-oneframe]. The one browser frame.
 *   +[data-oneframe]         applyFrame() is its single writer: transform,
 *                            opacity, visibility, z-index and pointer-events,
 *                            every frame, with `transition:none`. Nothing in
 *                            React may set style on this element.
 *   [data-anim="baylabel"]   the bay's own caption. opacity = 1 - u*1.9, so it
 *                            is gone by the time the frame is a third of the
 *                            way in — the label hands the rectangle over.
 *   [data-anim="content"]    the frame's page area. framePage('audit') paints
 *                            it #071022 (= --nl-ink-deep, authored identical).
 *   [data-anim="s5"]         the intake page inside the frame. framePage()
 *                            shows it and hides s1/s2/s3 (the mockup pages,
 *                            which live in #journey and do not exist yet).
 *   [data-anim="s5in"]       a real input. wireSess() adds focus/input
 *                            listeners and logs form_focus/form_typing into the
 *                            live session stream, keyed on `data-f`.
 *   [data-anim="s5go"]       the submit. wireSess() adds a click listener that
 *                            stamps s5time, writes s5who and reveals s5done.
 *   [data-anim="s5done"]     the "logged" overlay.
 *   [data-anim="s5time"]     the timestamp, toLocaleTimeString('en-US',{hour12:false}).
 *   [data-anim="s5who"]      textContent := ' · ' + business + ' · teardown request'.
 *
 * `data-f="practice"` is NOT copy and NOT a dental leftover we forgot: the
 * engine selects `[data-anim="s5in"][data-f="practice"]` BY NAME to read the
 * value it prints into the event row. It is an internal key, invisible to the
 * reader, and renaming it silently drops the name from the receipt.
 *
 * `data-anim="url"` is deliberately NOT emitted. The source wrote
 * `northline.studio/audit` there; the ported engine writes
 * `stratalanding.com/teardown`, which is not a route this app serves — a made-up
 * address in our own voice, in the chrome of our own browser frame. The guard is
 * `if (n.url)`, so not emitting the hook is the whole fix; the address bar is
 * authored static as stratalanding.com/brief, which does resolve.
 *
 * EVERY hook above is emitted only when `live` (see below). A hook the engine
 * will not drive is worse than no hook: it invites framePage() to hide a form
 * nobody will ever show again.
 *
 * ── WHY THE FRAME LIVES IN THIS FILE, AND WHEN IT MUST STAND DOWN ─────────
 * In the source the frame is hoisted to the last child of root, because four
 * stations publish to it. This file was written when only ONE station existed,
 * so the frame shipped inside the bay it lands in.
 *
 * #journey has since landed, and it ships its own `[data-anim="stageWrap"]
 * [data-oneframe]`. applyFrame() writes exactly one element —
 * `n.stageWrap[0]`, the FIRST in document order, falling back to the first
 * `[data-oneframe]` — so with two of them the engine drives #journey's and
 * never touches this one. This one then sits at its authored tier-B CSS
 * forever: position:fixed, opacity:0, pointer-events:none, with the page's
 * only real lead form inside it. Measured on 2026-08-13 at 1600x1000: this
 * element received no inline style at any scroll position, computed opacity 0,
 * and elementFromPoint over the submit button returned the footer at every
 * station. Meanwhile #journey's frame docked into [data-startbay] showing an
 * empty black rectangle, because its shell carries no s5 page.
 *
 * So `live` is not just "is the engine mounted" — it is "is the engine mounted
 * AND is this the element it writes". `ownsFrame` answers the second half by
 * running applyFrame()'s own selector once after mount. When the answer is no,
 * every engine hook in this subtree is dropped and the section renders the
 * fallback below, and the bay does not invite a foreign frame to land on top of
 * it.
 *
 * ⚠️ THIS PARAGRAPH USED TO END "the form is never invisible". It was describing
 * an older render-in-place fallback, and it stopped being true when the portal
 * landed: ownership was decided by whether a frame EXISTS, while whether it is
 * DISPLAYED is decided by a media query. On a phone those two disagreed and the
 * form was portalled into a hidden subtree. Fixed at the ownership effect
 * below; scripts/nl-intake-probe.cjs now asserts the reader-facing property
 * this sentence was claiming. The proper fix is one frame at root
 * carrying s1/s2/s3/s5 together — that is a page.tsx + Journey.tsx change and
 * is handed off, not done here.
 *
 * ── THE NO-ENGINE FALLBACK ────────────────────────────────────────────────
 * A `position:fixed`, `opacity:0` browser frame is a dead form anywhere the
 * engine does not drive it — every phone, every reduced-motion reader, every
 * low-end device, JS off, and now every desktop while a second frame exists.
 * So the fixed geometry is gated on `data-nlbay="live"`, which this component
 * sets ONLY when `live` is true. Without that attribute the frame is an
 * ordinary in-flow panel: the bay drops its aspect-ratio, the caption becomes a
 * heading, the form is simply there, and the `!important` reset undoes any
 * inline style a resize across the breakpoint left behind. The attribute flips
 * after hydration; the resulting reflow is in the last section of a very long
 * page, far outside the viewport, so it cannot register as layout shift.
 *
 * The hook's presence is also what splits ownership of the receipt's two live
 * fields. When `live`, the engine is the sole writer of s5time/s5who. When not,
 * the hooks are absent, the engine cannot see those nodes, and React writes
 * them from its own state — otherwise the payoff of the entire page reads
 * "--:--:--" on every phone, which is what it did before this was fixed.
 *
 * Nothing inside the frame may carry data-row / data-fade / data-reveal. Those
 * run on `animation-timeline: view()`, and a fixed element never moves through
 * the scrollport — the animation would sit at its `from` keyframe (opacity 0)
 * forever. That is the same one-writer law from the other direction.
 *
 * ── THE CALL REWRITE ──────────────────────────────────────────────────────
 * The approved design closes on an audit CALL: "Book the audit call", "AUDIT
 * CALL — 30 MINUTES · NO DECK", a right pane headed "On the call", a submit
 * reading "Request the call", "we'll open your analytics together", and a step
 * "Thirty minutes, screens shared, your analytics open." StrataLanding is 100%
 * async and takes no calls — stated differentiator, and the founder does not do
 * live calls at all. Every one of those became the async equivalent: a free
 * page teardown returned by email and Loom within 24 hours.
 *
 * ── FABRICATED PROOF REMOVED ──────────────────────────────────────────────
 *   "Two build slots open — September" / "Two build slots · September"
 *        invented scarcity, twice          -> cta.reassurance, and
 *                                             "Async only · No calls, ever"
 *   "northline.studio/audit" in the chrome -> stratalanding.com/brief (real route)
 *   "Ridgeline Dental" / "ridgelinedental.com/book" / "you@practice.com"
 *        a fictional client as placeholder -> neutral placeholders
 *   "(608) 555-0177", "hello@northline.studio", "Madison & remote"
 *        invented contact + location       -> the real footer, from brand.ts
 *   "your practice can act on"             -> "your business can act on"
 *
 * ── THE FORM IS REAL ──────────────────────────────────────────────────────
 * The source's form is a demo that sends nothing ("Nothing is sent — this page
 * is the demo"). Ours POSTs to /api/brief, the same endpoint the main brief
 * uses, so a teardown request creates a client, a project with source='brief'
 * and a brief_submission row exactly like any other lead. Contract, from
 * src/app/api/brief/route.ts:
 *   required: name, email, companyName, industry
 *   optional: notes (<=5000), plan
 * Plus the two free spam guards from src/lib/form-guards.ts — the `website_url`
 * honeypot and `form_elapsed_ms`. A bot that trips either gets a success-shaped
 * response and nothing is written, which is deliberate: telling a bot it was
 * caught just teaches the operator to fix it.
 *
 * NOTE: no `plan` is sent. That is correct — a teardown request has not chosen
 * a package, and posting a bogus plan would make planExplicitlyChosen true and
 * auto-generate a proposal for a tier the lead never picked.
 *
 * ── WHO OWNS s5done ───────────────────────────────────────────────────────
 * Two writers, split by outcome, and the split is deliberate. The engine is the
 * OPTIMISTIC writer: its click listener reveals the receipt the instant the
 * button is pressed, because the receipt IS the payoff of the whole page and
 * waiting on a network round-trip to show it would land the beat late. React is
 * the CORRECTIVE writer: it adds `.is-on` when the POST actually succeeds (that
 * is also the only path on mobile, where no engine exists), and on failure
 * clears the three inline properties the engine set so the reader is not told
 * they were logged when they were not. The two never write on the same event.
 *
 * The submit button is disabled until every required field is non-empty, which
 * is what keeps that honest: a disabled button dispatches no click, so the
 * engine's optimistic reveal cannot fire on a form that was never sent.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { brand, cta, navigation } from "@/lib/brand";
import { trackCtaClick, trackFormStart } from "@/lib/analytics";
import { useSectionView, useStrataTier } from "@/components/strata/tier";
import { LedgerHead } from "../LedgerHead";
import { NLClock } from "../NLClock";
import { Plate } from "../Plate";

const INDUSTRIES = [
  "Healthcare / Medical",
  "Local Services",
  "Agency / Consulting",
  "SaaS / Tech",
  "Ecommerce / DTC",
  "Real Estate",
  "Finance / Insurance",
  "Education / Coaching",
  "Other",
];

/** The s5 panel's right pane. Replaces the source's "On the call" trio. */
const RETURNS = [
  "We read the page the way a stranger does, and mark the exact places attention leaks out.",
  "You get the structural fix in writing — what to cut, what to move, what to say instead.",
  "We tell you whether we are the right studio for it. Sometimes the answer is no.",
];

/** The column beside the bay. Source step 02 was "Thirty minutes, screens shared". */
const NEXT = [
  "You send the page and what it is supposed to do.",
  "We read it before we write a word back. No meeting, no discovery phase.",
  "The teardown lands in your inbox — in writing, with a Loom — inside 24 hours.",
];

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Scoped to this section. It lives here and not in nl.css because four other
 * sections are being authored in parallel against that file (see Pricing.tsx,
 * same pattern).
 *
 * Inside the frame the hairlines are written as literals, not tokens: the frame
 * is a LIGHT surface sitting inside a [data-tone="dark"] section, so
 * var(--nl-r11) has already been flipped to a light value and would draw an
 * invisible border on white. The s5 page underneath it IS dark, so that half
 * uses the tokens normally.
 */
const CSS = `
[data-nl] .nlb-dock{display:grid;gap:clamp(28px,4vw,56px);align-items:start}
@media (min-width:900px){[data-nl] .nlb-dock{grid-template-columns:minmax(0,880px) minmax(190px,1fr)}}

[data-nl] .nlb-bay{position:relative;min-width:0}
[data-nl] .nlb-mark{display:none;position:absolute;width:18px;height:18px;pointer-events:none}
[data-nl] .nlb-label{display:flex;flex-direction:column;gap:13px;border:1px solid var(--nl-r14);padding:22px clamp(20px,3vw,42px)}

[data-nl] .nlb-frame{position:relative;width:100%;transform-origin:50% 50%}
[data-nl] .nlb-shell{position:relative;border-radius:10px;overflow:hidden;background:var(--nl-paper);border:1px solid rgba(11,27,58,0.10);box-shadow:0 60px 120px -40px rgba(7,16,34,0.42)}
[data-nl] .nlb-chrome{position:relative;z-index:6;height:40px;background:var(--nl-paper-2);border-bottom:1px solid rgba(11,27,58,0.09);display:flex;align-items:center;gap:14px;padding:0 14px}
[data-nl] .nlb-dot{width:9px;height:9px;border-radius:50%;background:rgba(11,27,58,0.14);display:block}
[data-nl] .nlb-omni{flex:1;height:22px;border-radius:11px;background:var(--nl-paper);border:1px solid rgba(11,27,58,0.08);display:flex;align-items:center;gap:8px;padding:0 10px;max-width:420px;margin:0 auto}
[data-nl] .nlb-live{width:6px;height:6px;border-radius:50%;background:var(--nl-green);display:block;flex:none}

[data-nl] .nlb-page{position:absolute;top:40px;left:0;right:0;bottom:0;overflow:hidden;background:var(--nl-ink-deep)}
[data-nl] .nlb-s5{position:relative;z-index:1;display:grid;grid-template-columns:1fr;background:var(--nl-ink-deep);color:var(--nl-paper);border-radius:0 0 10px 10px;overflow:hidden}
[data-nl] .nlb-main{padding:clamp(22px,4vw,38px) clamp(20px,4vw,42px);display:flex;flex-direction:column;gap:20px;min-width:0}
[data-nl] .nlb-side{background:var(--nl-ink-band);border-top:1px solid var(--nl-r14);padding:clamp(24px,4.4vh,44px) clamp(20px,3vw,34px);display:flex;flex-direction:column;min-width:0}
[data-nl] .nlb-fields{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:520px){[data-nl] .nlb-fields{grid-template-columns:1fr 1fr}[data-nl] .nlb-wide{grid-column:1/-1}}
[data-nl] .nlb-in{width:100%;background:transparent;border:0;border-bottom:1px solid var(--nl-r24);border-radius:0;color:var(--nl-paper);font-family:var(--font-heading),system-ui,sans-serif;font-size:17px;padding:9px 0;outline:none}
[data-nl] .nlb-in::placeholder{color:var(--nl-faint)}
[data-nl] .nlb-in:focus{border-bottom-color:var(--nl-accent)}
[data-nl] .nlb-in option{background:#071022;color:#fbf9f4}
[data-nl] .nlb-go{padding:14px 22px;font-size:14px}
[data-nl] .nlb-go:disabled{opacity:.42;cursor:not-allowed}

[data-nl] .nlb-done{position:absolute;inset:0;z-index:2;background:var(--nl-ink-deep);display:flex;flex-direction:column;justify-content:center;gap:18px;padding:clamp(24px,5vw,42px);opacity:0;visibility:hidden;pointer-events:none}
[data-nl] .nlb-done.is-on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .5s var(--nl-ease)}

/* ── TIER B ONLY: the fixed 1060x662 frame the engine flies. Every number here
   is read back by startFrame(); none of them is decorative. ── */
[data-nl] .nlb-bay[data-nlbay="live"]{aspect-ratio:1060/662}
[data-nl] [data-nlbay="live"] .nlb-mark{display:block}
[data-nl] [data-nlbay="live"] .nlb-label{position:absolute;inset:0;justify-content:center;padding:0 clamp(24px,3vw,42px)}
[data-nl] [data-nlbay="live"] .nlb-frame{position:fixed;left:50%;top:50%;width:1060px;height:662px;margin:-331px 0 0 -530px;opacity:0;z-index:6;pointer-events:none;will-change:transform}
[data-nl] [data-nlbay="live"] .nlb-shell{position:absolute;inset:0}
[data-nl] [data-nlbay="live"] .nlb-s5{position:absolute;top:40px;left:0;right:0;bottom:0;grid-template-columns:1.14fr 0.86fr}
[data-nl] [data-nlbay="live"] .nlb-side{border-top:0;border-left:1px solid var(--nl-r14)}

/* Resizing a desktop across the breakpoint leaves applyFrame()'s last inline
   values on the element after the engine unmounts. Without this the form would
   be stranded invisible at whatever transform the scrollbar happened to be at. */
[data-nl] .nlb-bay:not([data-nlbay="live"]) .nlb-frame{opacity:1!important;visibility:visible!important;transform:none!important;pointer-events:auto!important;z-index:auto!important}
`;

export function Start({ demoCount }: { demoCount: number }) {
  const ref = useRef<HTMLElement>(null);
  useSectionView(ref, "cta_band");

  // The exact condition NLRoot mounts the engine under. See the fallback note.
  const tier = useStrataTier();

  const mountedAt = useRef<number>(0);
  const startedRef = useRef(false);
  const doneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  /** Filled by React only in the fallback, where the engine cannot reach s5time. */
  const [sentAt, setSentAt] = useState<string | null>(null);
  /**
   * Does applyFrame() write THIS element? Optimistic so the server render and
   * the first client render agree; corrected once, after mount, by running the
   * engine's own selector. Deps are [] on purpose — the answer must not change
   * again, and dropping the hooks below changes what the selector would return.
   */
  const [ownsFrame, setOwnsFrame] = useState(true);

  /**
   * THE ONE FRAME, RECONCILED.
   *
   * The spec hoists a single browser frame to root and four stations take
   * ownership of it in turn. #journey ships that frame and drives acts 1-4;
   * this section is the last station, and its job is to fly the SAME frame into
   * the docking bay and turn it into the intake form.
   *
   * Two frames cannot both be it — applyFrame() writes exactly one node,
   * `(n.stageWrap && n.stageWrap[0]) || [data-oneframe]`, so the second is
   * never written and its form is stranded at opacity 0. Rather than ship a
   * second frame, this section PORTALS its page into the frame that already
   * exists. The markup lands exactly where the engine expects it — inside
   * [data-anim="content"], next to the journey's own act pages, which is where
   * framePage('audit') looks when it shows s5 and hides s1/s2/s3 — while the
   * form's state, validation and submit stay in this component.
   *
   * If no frame is found (the journey is not on the page), this section falls
   * back to owning its own, which is what makes it usable standalone.
   *
   * ⚠️ AND IF THE FRAME IS FOUND BUT NOT RENDERED, THE SAME FALLBACK APPLIES.
   * That guard is the whole point of this effect and it was missing.
   *
   * Journey ships its frame in server HTML on EVERY device, un-gated
   * (Journey.tsx: data-anim="stageWrap" + data-oneframe, no tier check) — and
   * nl.css hides it below the engine's mount gate:
   *
   *   @media (max-width:1039px),(pointer:coarse),(prefers-reduced-motion:reduce)
   *     { .nl-oneframe { display:none !important } }
   *
   * So a `first !== null` test agreed the frame existed on a phone, took
   * ownership away from this section, portalled the intake page into a
   * display:none subtree AND suppressed the in-place copy. Measured at 390x844
   * and at 1440 with prefers-reduced-motion: ZERO visible fields, a 0px submit
   * button, and the whole form inside .nl-oneframe. **The page's free teardown
   * — its lower-commitment offer and the closing section's primary action — was
   * invisible to every phone visitor.** `live` below already gates on
   * tier === "B"; this effect did not, and that asymmetry was the bug.
   *
   * The test is `getClientRects().length` rather than a copy of the media
   * query, deliberately: it asks whether the frame is actually rendered instead
   * of re-deriving the conditions under which it should be. A future breakpoint
   * change cannot desynchronise the two.
   */
  const [framePage, setFramePage] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const first =
      document.querySelector('[data-nl="root"] [data-anim="stageWrap"]') ??
      document.querySelector("[data-oneframe]");
    // A frame that is display:none is not a frame this section can hand its
    // form to. Treat it exactly like no frame at all.
    const usable = !!first && first.getClientRects().length > 0;
    const mine = !usable || first === frameRef.current;
    setOwnsFrame(mine);
    if (!mine && first) {
      // Host the intake page inside the frame that IS driven.
      setFramePage(first.querySelector('[data-anim="content"]') as HTMLElement | null);
    }
  }, []);

  /**
   * Engine hooks are emitted when the engine will actually drive them — either
   * because this section owns the frame, or because its page is portalled into
   * the one that is.
   */
  const live = tier === "B" && (ownsFrame || framePage !== null);
  const anim = (key: string) => (live ? { "data-anim": key } : {});
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    industry: "",
    page: "",
    happening: "",
    email: "",
    website_url: "", // honeypot — a human never sees this
  });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!startedRef.current) {
        startedRef.current = true;
        trackFormStart("brief");
      }
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  /* Gates the engine's optimistic receipt: a disabled button fires no click. */
  const canSubmit =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.companyName.trim() !== "" &&
    form.industry !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending" || status === "sent") return;
    setStatus("sending");
    setError(null);

    // The page URL and the symptom both belong in notes — /api/brief has no
    // dedicated column for either, and notes is what the admin actually reads.
    const notes = [
      form.page ? `Page that isn't working: ${form.page}` : null,
      form.happening ? `What's happening: ${form.happening}` : null,
      "Requested a free teardown from the homepage.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyName: form.companyName,
          industry: form.industry,
          notes,
          website_url: form.website_url,
          form_elapsed_ms: Date.now() - mountedAt.current,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Something went wrong. Try again, or email us directly.");
      }
      setStatus("sent");
      // Only meaningful in the fallback — when `live`, the engine stamped s5time
      // on click and this value is never rendered.
      setSentAt(new Date().toLocaleTimeString("en-US", { hour12: false }));
      trackCtaClick("cta_band", "primary", "teardown", "home");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // The corrective write. The engine already revealed the receipt on click;
      // this is the only place React touches those properties, and it runs only
      // when the request did not land.
      const done = doneRef.current;
      if (done) {
        done.style.opacity = "";
        done.style.visibility = "";
        done.style.transition = "";
      }
    }
  }

  const labelCls = "nl-mono-xs block";

  /* The intake page. Rendered inside whichever browser frame the engine is
     actually driving: in place when this section owns the frame, portalled into
     #journey_s when it does not. framePage() shows s5 and hides s1/s2/s3, so it
     has to be a SIBLING of the journey_s act pages, not a second frame. */
  const intakePage = (
    <form {...anim("s5")} onSubmit={submit} className="nlb-s5" noValidate>
      <div className="nlb-main">
        <div className="flex items-center gap-[13px]">
          <span style={{ color: "var(--nl-accent)", fontSize: 9, lineHeight: 1 }}>&#9670;</span>
          <span className="nl-mono-sm" style={{ color: "var(--nl-paper)", letterSpacing: "0.22em" }}>
            Teardown request
          </span>
          <span className="block h-px flex-1" style={{ background: "var(--nl-r18)" }} />
          <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
            Free · 24-hour reply
          </span>
        </div>

        <h3
          className="nl-h2 m-0 max-w-[15ch]"
          style={{ fontSize: "clamp(24px,2.6vw,40px)", lineHeight: 0.94 }}
        >
          Tell us the page that isn&rsquo;t working.
        </h3>

        {/* Honeypot. Never shown, never focusable, never announced. */}
        <div aria-hidden className="hidden">
          <label htmlFor="nl-website-url">Leave this empty</label>
          <input
            id="nl-website-url"
            name="website_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website_url}
            onChange={set("website_url")}
          />
        </div>

        <div className="nlb-fields">
          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-name" style={{ color: "var(--nl-meta)" }}>
              Your name
            </label>
            <input
              {...anim("s5in")}
              data-f="name"
              id="nl-name"
              required
              autoComplete="name"
              value={form.name}
              onChange={set("name")}
              className="nlb-in"
              placeholder="Alex Rivera"
            />
          </div>

          {/* data-f="practice" is the engine's selector. Do not rename. */}
          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-co" style={{ color: "var(--nl-meta)" }}>
              Business
            </label>
            <input
              {...anim("s5in")}
              data-f="practice"
              id="nl-co"
              required
              autoComplete="organization"
              value={form.companyName}
              onChange={set("companyName")}
              className="nlb-in"
              placeholder="Your business name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-ind" style={{ color: "var(--nl-meta)" }}>
              What you do
            </label>
            <select
              {...anim("s5in")}
              data-f="industry"
              id="nl-ind"
              required
              value={form.industry}
              onChange={set("industry")}
              className="nlb-in"
            >
              <option value="">Choose one</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-page" style={{ color: "var(--nl-meta)" }}>
              The page that isn&rsquo;t working
            </label>
            <input
              {...anim("s5in")}
              data-f="url"
              id="nl-page"
              value={form.page}
              onChange={set("page")}
              className="nlb-in"
              placeholder="yoursite.com/book"
            />
          </div>

          <div className="nlb-wide flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-what" style={{ color: "var(--nl-meta)" }}>
              What&rsquo;s happening
            </label>
            <input
              {...anim("s5in")}
              data-f="problem"
              id="nl-what"
              value={form.happening}
              onChange={set("happening")}
              className="nlb-in"
              placeholder="Traffic is fine. Nobody books."
            />
          </div>

          <div className="nlb-wide flex flex-col gap-1">
            <label className={labelCls} htmlFor="nl-email" style={{ color: "var(--nl-meta)" }}>
              Where we reply
            </label>
            <input
              {...anim("s5in")}
              data-f="email"
              id="nl-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              className="nlb-in"
              placeholder="you@yourbusiness.com"
            />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-4 pt-1">
          <button
            {...anim("s5go")}
            type="submit"
            className="nl-cta nlb-go"
            disabled={!canSubmit || status === "sending" || status === "sent"}
          >
            {status === "sending" ? "Sending…" : "Request the teardown"}
          </button>
          <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
            Free · No calls · 24-hour reply
          </span>
        </div>

        {error ? (
          <p role="alert" className="m-0 text-[13.5px]" style={{ color: "#ff9783" }}>
            {error}
          </p>
        ) : null}
      </div>

      {/* The source's "On the call" pane, rewritten as what actually
          comes back when nobody gets on anything. */}
      <div className="nlb-side">
        <span className="nl-mono-xs pb-[10px]" style={{ color: "var(--nl-meta)", letterSpacing: "0.18em" }}>
          What you get back
        </span>
        {RETURNS.map((r, i) => (
          <div
            key={r}
            className="flex gap-3 py-[14px]"
            style={{ borderTop: "1px solid var(--nl-r14)" }}
          >
            <span
              data-tnum
              className="nl-num pt-[3px] text-[9.5px]"
              style={{ color: "var(--nl-accent)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[14px] leading-[1.5]" style={{ color: "var(--nl-paper)" }}>
              {r}
            </span>
          </div>
        ))}
      </div>

      {/* THE RECEIPT. Engine writes it optimistically on click;
          `.is-on` is React confirming the POST landed. */}
      <div
        {...anim("s5done")}
        ref={doneRef}
        className={`nlb-done${status === "sent" ? " is-on" : ""}`}
        /* A receipt for something that has not happened yet must not
           be in the accessibility tree: without this a screen-reader
           user meets "Logged — you just became a row in the event
           stream" while the form is still empty. role=status makes
           the reveal announce itself once it IS true, which is the
           behaviour a sighted reader gets from the overlay. */
        role="status"
        aria-hidden={status === "sent" ? undefined : true}
      >
        <div className="flex items-center gap-[11px]">
          <span
            className="block h-[9px] w-[9px] rounded-full"
            style={{ background: "var(--nl-green)" }}
          />
          <span className="nl-mono-sm" style={{ color: "var(--nl-green)", letterSpacing: "0.2em" }}>
            Logged
          </span>
        </div>
        <span
          className="nl-h2 max-w-[20ch]"
          style={{ fontSize: "clamp(22px,2.4vw,36px)", lineHeight: 1 }}
        >
          You just became a row in the event stream.
        </span>
        <div
          className="grid max-w-[620px] items-baseline gap-3 py-[11px]"
          style={{
            gridTemplateColumns: "64px minmax(0,1fr) auto",
            borderTop: "1px solid var(--nl-r16)",
            borderBottom: "1px solid var(--nl-r16)",
          }}
        >
          {/* Sole writer is the engine when `live`, React otherwise.
              Never both — the hook is what hands the node over. */}
          <span
            {...anim("s5time")}
            data-tnum
            className="nl-num text-[10px]"
            style={{ color: "var(--nl-meta)" }}
          >
            {live ? "--:--:--" : (sentAt ?? "--:--:--")}
          </span>
          <span className="text-[12.5px]">
            <span className="nl-num text-[11.5px]" style={{ color: "var(--nl-green)" }}>
              lead_submitted
            </span>
            <span {...anim("s5who")} style={{ color: "var(--nl-meta)" }}>
              {live
                ? " · you · teardown request"
                : ` · ${form.companyName.trim() || "you"} · teardown request`}
            </span>
          </span>
          <span className="nl-num text-[10.5px]" style={{ color: "var(--nl-green)" }}>
            &#10003;
          </span>
        </div>
        <span className="nl-mono-xs max-w-[62ch]" style={{ color: "var(--nl-meta)", letterSpacing: "0.14em" }}>
          That is the whole product — a page that turns a reader into a timestamped,
          attributed row your business can act on.
        </span>
        <Link
          href={cta.secondary.href}
          className="nl-cta nl-cta-ghost self-start"
          onClick={() => trackCtaClick("cta_band", "secondary", "demos", "home")}
        >
          {cta.secondary.label}
        </Link>
      </div>
    </form>
  );

  return (
    <section
      ref={ref}
      id="start"
      data-tone="dark"
      data-screen-label="Studio"
      data-bg="#071022"
      className="relative"
      style={{ background: "var(--nl-ground-ink-deep)", padding: "0 var(--nl-gutter) 0" }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Plate id="studio" position="50% 45%" opacity={0.42} />

      <div className="relative">
        <LedgerHead label="The studio" meta="24-hour reply" />

        {/* ── the claim ────────────────────────────────────────────────── */}
        <div className="nl-inner grid items-end gap-[clamp(40px,4.4vw,64px)] lg:grid-cols-[1.32fr_0.68fr]">
          <h2 className="nl-display m-0" style={{ fontSize: "clamp(38px,5.4vw,92px)", lineHeight: 0.9 }}>
            <span className="block">
              <span className="nl-mask">
                <span data-wm className="block">
                  Bring us the
                </span>
              </span>
            </span>
            <span className="block">
              <span className="nl-mask">
                <span data-wm className="block">
                  page that isn&rsquo;t
                </span>
              </span>
            </span>
            <span className="block">
              <span className="nl-mask">
                <span data-wm className="block">
                  <em className="nl-serif" style={{ color: "var(--nl-accent)" }}>
                    working
                  </em>
                  .
                </span>
              </span>
            </span>
          </h2>

          <div data-fade className="flex flex-col gap-5">
            <p className="m-0 max-w-[40ch] text-[18px] leading-[1.5]" style={{ color: "var(--nl-body)" }}>
              No meeting. Send us the page and what it is supposed to do, and we send back where the
              money is leaking — in writing, with a Loom walkthrough, inside 24 hours. Free, and you
              are under no obligation afterwards.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="nl-mono-sm" style={{ color: "var(--nl-faint)" }}>
                Or skip the teardown —
              </span>
              <Link
                href={cta.primary.href}
                className="nl-cta nl-cta-ghost"
                onClick={() => trackCtaClick("cta_band", "secondary", "brief", "home")}
              >
                {cta.primary.label}
              </Link>
            </div>
          </div>
        </div>

        {/* ── THE DOCKING BAY ─────────────────────────────────────────────
            The bay is the rectangle; the frame is what lands in it. Order of
            children inside the bay is not engine-indexed, but the crop marks
            must precede the label so the label's hairline draws over them. */}
        {/* The margin is inline because `mt-[clamp(...)]` LOSES here, and the
            reason is specificity, not clamp(): nl.css ships
            `[data-nl] .nl-inner { margin: 0 auto }` — two classes, (0,2,0), and
            a SHORTHAND, so it zeroes margin-top — while Tailwind's
            `.mt-\[clamp\(…\)\]` is (0,1,0) and loses. Without the inline value
            the dock's right column landed 22px ON TOP of the reassurance line.
            Anything carrying `nl-inner` has the same problem with every m*
            utility; anything that does not is fine. Verified 2026-08-13 at
            1600x1000: the six surviving `m*-[clamp()]` utilities elsewhere on
            this page (hero ×3, spine, portal, assay) all compute correctly —
            30/34/40/40/14/44px. The utility is not broken. */}
        <div className="nl-inner nlb-dock" style={{ marginTop: "clamp(44px,6vw,80px)" }}>
          {/* No [data-startbay] unless the engine drives OUR frame: otherwise
              startFrame() flies a foreign frame down onto the in-flow form. */}
          <div
            className="nlb-bay"
            {...(live ? { "data-startbay": true, "data-nlbay": "live" } : {})}
          >
            <span
              aria-hidden
              className="nlb-mark"
              style={{ left: -14, top: -14, borderTop: "1px solid var(--nl-r24)", borderLeft: "1px solid var(--nl-r24)" }}
            />
            <span
              aria-hidden
              className="nlb-mark"
              style={{ right: -14, top: -14, borderTop: "1px solid var(--nl-r24)", borderRight: "1px solid var(--nl-r24)" }}
            />
            <span
              aria-hidden
              className="nlb-mark"
              style={{ left: -14, bottom: -14, borderBottom: "1px solid var(--nl-r24)", borderLeft: "1px solid var(--nl-r24)" }}
            />
            <span
              aria-hidden
              className="nlb-mark"
              style={{ right: -14, bottom: -14, borderBottom: "1px solid var(--nl-r24)", borderRight: "1px solid var(--nl-r24)" }}
            />

            {/* Fades out as the frame arrives: opacity = 1 - u*1.9. */}
            <div {...anim("baylabel")} className="nlb-label">
              <span className="nl-mono-sm" style={{ color: "var(--nl-meta)", letterSpacing: "0.2em" }}>
                Docking bay — 1060 &times; 662
              </span>
              <span
                className="nl-h3 max-w-[22ch]"
                style={{ fontSize: "clamp(18px,2vw,28px)", color: "var(--nl-paper)" }}
              >
                The same interface you just watched. In our name this time.
              </span>
            </div>

            {/* ── THE FRAME, WHEN THIS SECTION IS THE ONE THAT HAS IT ──────
                applyFrame() is the only writer of this element's style; no
                React state may ever reach it.

                It carries the hooks ONLY while it is the frame the engine
                drives. Once #journey is on the page its frame wins — it is
                first in document order — and this element would be a second
                [data-oneframe] that is never written: an empty browser chrome
                sitting in the bay while the real frame flies in on top of it.
                So when the intake page is portalled away, this keeps the shape
                of the bay's fallback and claims nothing. */}
            <div
              ref={frameRef}
              {...(framePage ? {} : anim("stageWrap"))}
              {...(live && !framePage ? { "data-oneframe": true } : {})}
              {...(framePage ? { "aria-hidden": true, hidden: true } : {})}
              className="nlb-frame"
            >
              <div className="nlb-shell">
                <div className="nlb-chrome">
                  <div className="flex gap-[6px]">
                    <span className="nlb-dot" />
                    <span className="nlb-dot" />
                    <span className="nlb-dot" />
                  </div>
                  <div className="nlb-omni">
                    <span className="nlb-live" />
                    {/* Authored static — see the note on data-anim="url". */}
                    <span
                      className="nl-num text-[10.5px]"
                      style={{ color: "rgba(11,27,58,0.56)" }}
                    >
                      stratalanding.com/brief
                    </span>
                  </div>
                  <div style={{ width: 52 }} />
                </div>

                {/* framePage('audit') paints this #071022 — authored identical
                    so the no-engine render is the same colour. */}
                <div {...anim("content")} className="nlb-page" aria-hidden />

                {framePage ? null : intakePage}
              </div>
            </div>
          </div>

          {/* ── the column beside the bay ─────────────────────────────── */}
          <div className="flex flex-col gap-[15px] pt-1">
            <span className="nl-mono-xs" style={{ color: "var(--nl-meta)", letterSpacing: "0.18em" }}>
              What happens next
            </span>
            {NEXT.map((n, i) => (
              <div key={n} data-row className="flex gap-[11px]">
                <span
                  data-tnum
                  className="nl-num pt-[3px] text-[9.5px]"
                  style={{ color: "var(--nl-accent)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] leading-[1.5]" style={{ color: "var(--nl-body)" }}>
                  {n}
                </span>
              </div>
            ))}
            <span
              className="nl-mono-xs mt-[5px] pt-[14px]"
              style={{ color: "var(--nl-accent)", borderTop: "1px solid var(--nl-r16)", letterSpacing: "0.14em" }}
            >
              No deck, no forms to chase.
            </span>
          </div>
        </div>

        {/* ── footer ──────────────────────────────────────────────────── */}
        {/* Same cause as the dock — this element is `.nl-inner` too, so
            `margin: 0 auto` beat `mt-[clamp(64px,9vw,130px)]` and the footer sat
            directly against the docking bay. Inline wins. */}
        <footer className="nl-inner" style={{ marginTop: "clamp(64px,9vw,130px)" }}>
          <div
            className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-4"
            style={{ borderTop: "1px solid var(--nl-r14)", paddingTop: 44 }}
          >
            <div>
              <span className="nl-mono" style={{ color: "var(--nl-paper)" }}>
                {brand.name}
              </span>
              <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.55]" style={{ color: "var(--nl-meta)" }}>
                {brand.tagline} {demoCount}{" "}
                pages on file. Every build handed over in full.
              </p>
            </div>
            {navigation.footer.map((col) => (
              <div key={col.title}>
                <span className="nl-mono-sm block" style={{ color: "var(--nl-faint)" }}>
                  {col.title}
                </span>
                <ul className="mt-4 list-none space-y-2 p-0">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {/* THE FOOTER WAS DARK, and one of these links is /brief.
                          A brief started from here fired no cta_click and wrote
                          no strata_cta_source, so the brief_submit that followed
                          was unattributable — the same defect the nav bar had
                          until this session. */}
                      <Link
                        href={l.href}
                        onClick={() => trackCtaClick("footer", "secondary", l.href, "home")}
                        className="text-[14px] transition-colors"
                        style={{ color: "var(--nl-body)" }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* THE WORDMARK — individually masked letters, each rising on its own
              scroll timeline, filling the viewport width. */}
          <div
            aria-hidden
            className="flex justify-between overflow-hidden pb-4"
            style={{
              fontFamily: "var(--font-heading), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "min(11.6vw,196px)",
              letterSpacing: "-0.06em",
              lineHeight: 0.78,
              color: "var(--nl-paper)",
            }}
          >
            {brand.name.toUpperCase().split("").map((ch, i) => (
              <span key={`${ch}-${i}`} className="nl-mask">
                <span
                  data-wm
                  className="block"
                  style={{ animationDelay: `${i * 0.02}s` }}
                >
                  {ch}
                </span>
              </span>
            ))}
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-4 py-6"
            style={{ borderTop: "1px solid var(--nl-r14)" }}
          >
            <span className="nl-mono-sm" style={{ color: "var(--nl-faint)" }}>
              © {new Date().getFullYear()} {brand.name}. Every build handed over in full.
            </span>
            {/* The source ran a live clock here on America/Chicago because its
                studio was fictionally in Wisconsin. NLClock reads the reader's
                own clock instead and does not emit data-anim="clock" — see the
                note in NLClock.tsx for why the engine hook had to be cut. */}
            <NLClock />
            <span className="nl-mono-sm" style={{ color: "var(--nl-faint)" }}>
              Async only · No calls, ever
            </span>
          </div>
        </footer>

        {/* THE PORTAL — one frame, four stations, the closing dock restored.
            When #journey owns the browser frame, this section's intake page is
            rendered INTO it as a sibling of the act pages, which is exactly what
            framePage("audit") expects when it shows s5 and hides s1/s2/s3. The
            form's state, validation and submit stay in this component; only the
            DOM position moves. When no other frame exists this is null and the
            page renders in place above. */}
        {framePage ? createPortal(intakePage, framePage) : null}
      </div>
    </section>
  );
}
