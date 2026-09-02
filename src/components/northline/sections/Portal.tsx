"use client";

/**
 * THE CLIENT PORTAL — a pinned light scene. Four dashboard panels crossfade
 * under four captions as the scene scrubs.
 *
 * This is the one section on the page that is honest by construction: the
 * portal is REAL SOFTWARE that ships with every build, so the panels describe
 * screens that exist at /portal, /portal/milestones, /portal/revisions and
 * /portal/settings, and act 03 is a literal screenshot of the running product
 * rather than a drawing of one.
 *
 * ═══ THE ENGINE CONTRACT (portal(p), ~line 879 of engine/NLEngine.ts) ═══════
 * Every key below is read from `this.n[key]`, which collect() fills from
 * [data-anim="key"]. Order and data-attributes are load-bearing:
 *
 *   pp        the four panels. `data-a`/`data-b` are its window; the engine runs
 *             tz(p, a, b, 0.042) and writes opacity + translateX + blur. r is the
 *             ONLY pacing dial (see tz below); the windows must stay 0/.25/.5/.75
 *             and the last must overshoot to 1.02 so panel 4 never fades at p=1.
 *   pcap      the four captions. These read `data-in`/`data-out` (band(), not
 *             tz()) — a different attribute pair for the same windows. Getting
 *             this wrong is silent: parseFloat(undefined) is NaN, every
 *             comparison is false, and the caption simply never appears.
 *   pnav      sidebar rows. `data-a`/`data-b`; the engine writes colour and
 *             weight AND derives `active` (the index whose window contains p)
 *             from this list, which is what drives ppill.
 *   ppill     the sliding selection block. translateY(active * 36px), so the nav
 *             rows must be EXACTLY 34px tall with a 2px gap. 36px pitch or the
 *             pill lands between rows.
 *   pdot      the four progress ticks under the copy. `data-a`/`data-b`.
 *   pbar      ONE element. The engine writes width up to 62% over p 0.04→0.20.
 *   pmiledot  ONE element. Green fills from below via a linear-gradient wipe over
 *             p 0.345→0.425, the tick fades up with it, and it pops on an eb()
 *             overshoot. This is why the milestone that unlocks the balance is
 *             row three and not row one.
 *   pcode     SIX elements, in order. The engine types the digits of '419286'
 *             one keypress at a time from p 0.826, 0.019 apart. Six boxes or the
 *             code is truncated; more than six and the extras stay blank.
 *
 * tz(p,a,b,r) is the shared pacing primitive: eased ramp in over r, FLAT HOLD,
 * eased ramp out over r. The portal passes r=0.042 — about 4% of the scene per
 * fade, which is why each act reads as a held frame rather than a dissolve.
 *
 * ═══ THE VISIBILITY CONTRACT ════════════════════════════════════════════════
 * The source authors panels 2-4 and captions 2-4 at inline opacity:0 because its
 * runtime always mounts. Ours mounts on tier B only, so anything authored at 0
 * is permanently invisible on every phone, for every reduced-motion reader and
 * with JS off. Everything here renders VISIBLE and at its END state — pbar at
 * 62%, pmiledot already green, pcode already typed — and the engine takes over
 * on its first frame.
 *
 * Panels deliberately carry NO background: pp is a true crossfade (panel n's
 * ramp-out and panel n+1's ramp-in occupy the same 0.042 window), and an opaque
 * panel fading over an opaque panel washes to a flat sheet mid-transition. The
 * captions DO carry the page ground, because band()'s windows are disjoint —
 * caption 1 is out at p=0.25 before caption 2 starts — so nothing ever overlaps
 * and the ground stops the pre-engine frame showing four captions at once.
 *
 * ═══ MOBILE ════════════════════════════════════════════════════════════════
 * nl.css unpins the stage below 1040px / on a coarse pointer / under reduced
 * motion, and the engine never mounts there. Four absolutely-positioned panels
 * and four absolutely-positioned captions would collapse into one illegible
 * pile, so — exactly as Spine.tsx does with .nl-spine-fallback — the
 * engine-driven furniture is hidden at the SAME breakpoint and replaced by a
 * static equivalent: the four captions as a ruled list, and the real screenshot
 * as a plain figure. Same content, no choreography, no empty box.
 *
 * ═══ WHAT THE SOURCE CLAIMED AND THIS DOES NOT ══════════════════════════════
 * The v4 portal is furnished for a fictional studio and a fictional client, and
 * essentially none of it survived contact:
 *
 *   "Ridgeline Dental — build" / "Day 12 of 19"  -> "Sample project" / the real
 *       seven-state ladder position. No invented client, and no day count: the
 *       delivery window lives in brand.ts and is the pricing ledger's to state.
 *   "Dr. Osei" / "Dr. Amara Osei" / "Tara Whitfield" / "Front desk" (seat names)
 *       -> role rows with no people in them. The per-seat roles are real; the
 *       people were not.
 *   The five-milestone payment drawdown ($1,200 / $2,400 / $2,400 / $2,400 /
 *       $1,200, "3 of 5 released") -> the actual structure: half to start, half
 *       once you have approved the finished build. Two payments, no amounts —
 *       cost belongs to the pricing ledger and nowhere else.
 *   "Shipped Aug 14 · 0.8s LCP", "Waiting on you — 2 comments open", "Stripe
 *       connected · deposit $49", "7 events · Dentrix + Google Ads" -> cell
 *       subtitles that describe what the screen does, with no measurement, no
 *       integration we have not built and no deposit figure.
 *   "Completion should move about 8 points" (chat bubble) -> gone with the
 *       hand-drawn thread; act 03 is now the actual /portal/revisions screen.
 *   "Madison, WI · Chrome / macOS" / "Madison, WI · Safari / iPhone" (session
 *       log) -> "This device" / "Previous session". The session log is real; the
 *       city is a different studio's.
 *   "NORTHLINE" in the sidebar -> STRATALANDING, and the account is labelled a
 *       sample in three places so nothing here reads as client history.
 *
 * The 2FA code itself (419286) stays: it is a sample code inside a sample
 * screen, it is what the engine types, and no reader mistakes a six-digit TOTP
 * box for a claim about anything.
 *
 * ═══ ANALYTICS ═════════════════════════════════════════════════════════════
 * The previous homepage's portal section fired ZERO events despite carrying two
 * CTAs, so this closes a known hole: section_view "client_portal", and both
 * CTAs report trackCtaClick("client_portal", …). The existing-client route to
 * /login is the secondary; the brief is the primary.
 */

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { cta, guarantee } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import { useSectionView } from "@/components/strata/tier";
import { Stage } from "../Stage";

/**
 * The four acts. `a`/`b` are the scene windows and are shared by four different
 * engine keys (pp, pcap, pnav, pdot) — which is the whole point: one array, so
 * the panel, its caption, its sidebar row and its tick can never drift apart.
 * The last window ends at 1.02, past the end of the scene, so panel 4 holds
 * through the stage's exit fade instead of blinking out at p=1.
 */
const ACTS = [
  {
    a: "0",
    b: "0.25",
    nav: "Dashboard",
    num: "01",
    title: "Project cells",
    body: "Every project is a cell — which of the seven states it is in, what moves next, and what is waiting on you. One glance instead of a chase.",
  },
  {
    a: "0.25",
    b: "0.5",
    nav: "Milestones",
    num: "02",
    title: "Milestones",
    body: "Two milestones, two payments. The portal shows which one is live, what it is waiting on, and who moved it last.",
  },
  {
    a: "0.5",
    b: "0.75",
    nav: "Chat",
    num: "03",
    title: "Chat",
    body: "One thread per project, in the same room as the work. Not a shared inbox and never a meeting — a written record you can scroll back through.",
  },
  {
    a: "0.75",
    b: "1.02",
    nav: "Settings",
    num: "04",
    title: "Access & 2FA",
    body: "Two-factor on by default, a role per seat, and a session log you can read. You hold your customers' trust; we act like it.",
  },
] as const;

/** The six 2FA boxes. The digits are the engine's ('419286'); SSR shows them typed. */
const CODE = ["4", "1", "9", "2", "8", "6"] as const;

const CSS = `
/* ── LAYOUT ────────────────────────────────────────────────────────────────
   One column everywhere by default; the two-column pinned composition only
   above the stage breakpoint, so the media query and nl.css's unpin agree
   exactly. Below it the section pays for its own vertical padding, because the
   sticky wrapper it normally sits inside has gone static. */
[data-nl] .nlpo-grid{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:clamp(22px,4vw,56px);
  align-items:center;
  width:min(1240px,100%);
  margin:0 auto;
  padding:clamp(52px,8vh,96px) var(--nl-gutter);
}
@media (min-width:1040px) and (pointer:fine) and (prefers-reduced-motion:no-preference){
  [data-nl] .nlpo-grid{
    grid-template-columns:0.78fr 1.22fr;
    /* height + align-content, NOT just align-items. (No backticks in here: this
       CSS lives in a JS template literal and one terminates the string.)
       align-items:center above centres the two COLUMNS against each other
       inside their row; it does
       nothing about where that row sits in the viewport. The grid is a block in
       an h-full parent, so it flowed from the top — and .nl-stage-sticky's
       place-items:center cannot help either, because its child is h-full and
       already fills it, leaving nothing to centre.
       Measured at 2546x1270: the scene's ink ran 0 -> 650px with 620px of dead
       ground under it, while every other pinned scene sat within ~80px of
       centre. This one was the outlier, which is why only this one changed. */
    height:100%;
    align-content:center;
    max-height:100vh;
    padding:0 var(--nl-gutter);
  }
}

/* ── THE ENGINE/FALLBACK SWAP ──────────────────────────────────────────────
   Same three conditions nl.css unpins on, inverted. .nlpo-only-b is everything
   the engine positions or sequences; .nlpo-fall is the static equivalent. They
   are never both on screen. */
[data-nl] .nlpo-shell,
[data-nl] .nlpo-caps,
[data-nl] .nlpo-dots{display:none}
/* The panel index: number | label | growing rule, one row per act. Flat, because
   pidx() indexes children[0..2] directly. */
[data-nl] .nlpo-index{display:flex;flex-direction:column;gap:6px}
[data-nl] .nlpo-idxrow{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:10px;padding:5px 0}
[data-nl] .nlpo-fall{display:block}
@media (min-width:1040px) and (pointer:fine) and (prefers-reduced-motion:no-preference){
  [data-nl] .nlpo-shell{display:grid}
  [data-nl] .nlpo-caps{display:block}
  [data-nl] .nlpo-dots{display:flex}
  [data-nl] .nlpo-fall{display:none}
}

/* ── ROW / CARD INTERACTION ────────────────────────────────────────────────
   The source expressed hover as style-hover="…" attributes, which are inert in
   a real document. Converted to real rules here, scoped to this section. The
   cards lift their hairline only — no transform, per the page's motion law. */
[data-nl] .nlpo-cell{transition:border-color .4s ease,background-color .4s ease}
[data-nl] .nlpo-cell:hover{border-color:var(--nl-r24)}
[data-nl] .nlpo-mile{transition:background-color .35s ease}
[data-nl] .nlpo-mile:hover{background-color:var(--nl-r06)}
[data-nl] .nlpo-fallrow{transition:padding-left .5s var(--nl-ease),background-color .4s ease}
[data-nl] .nlpo-fallrow:hover{padding-left:14px;background-color:var(--nl-r06)}
@media (prefers-reduced-motion:reduce){
  [data-nl] .nlpo-cell,[data-nl] .nlpo-mile,[data-nl] .nlpo-fallrow{transition:none}
}
`;

export function Portal() {
  const ref = useRef<HTMLDivElement | null>(null);
  // "client_portal" is a CONTRACT string, not a description — the funnel reports
  // key off it. It matches the cta_location both buttons below report.
  useSectionView(ref, "client_portal");

  return (
    <>
      <Stage name="portal" height={440} label="Client portal" id="portal" bg="#f6f3ec">
      <div ref={ref} className="relative h-full w-full" style={{ background: "var(--nl-ground-bone)" }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />

        <div className="nlpo-grid">
          {/* ══ LEFT — the copy column ══════════════════════════════════════ */}
          <div className="flex min-h-0 flex-col gap-[clamp(10px,2.4vh,22px)]">
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              Client portal
            </span>

            <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(28px,3.8vw,56px)" }}>
              You never have to ask us where it stands.
            </h2>

            {/* THE CAPTION STACK. Four layers in one fixed-height box so the
                column does not resize as the acts change — a reflow here would
                nudge the h2 on every crossfade. */}
            <div className="nlpo-caps relative" style={{ height: "clamp(96px,20vh,158px)" }}>
              {ACTS.map((act) => (
                <div
                  key={act.num}
                  data-anim="pcap"
                  data-in={act.a}
                  data-out={act.b}
                  className="absolute inset-0 flex flex-col gap-[10px]"
                  style={{ background: "var(--nl-bone)" }}
                >
                  <span className="nl-mono-sm" style={{ color: "var(--nl-ink)" }}>
                    {act.num} — {act.title}
                  </span>
                  <p
                    className="m-0"
                    style={{ fontSize: 17, lineHeight: 1.5, color: "var(--nl-body)", maxWidth: "38ch" }}
                  >
                    {act.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Mobile / reduced-motion parity for the caption stack. */}
            <ol
              className="nlpo-fall m-0 list-none p-0"
              style={{ borderTop: "1px solid var(--nl-r14)" }}
            >
              {ACTS.map((act) => (
                <li
                  key={act.num}
                  className="nlpo-fallrow flex flex-col gap-[7px] py-[18px]"
                  style={{ borderBottom: "1px solid var(--nl-r14)" }}
                >
                  <span className="nl-mono-sm" style={{ color: "var(--nl-ink)" }}>
                    {act.num} — {act.title}
                  </span>
                  <p
                    className="m-0"
                    style={{ fontSize: 16, lineHeight: 1.5, color: "var(--nl-body)", maxWidth: "46ch" }}
                  >
                    {act.body}
                  </p>
                </li>
              ))}
            </ol>

            {/* THE PANEL INDEX. Four rows; the engine lights whichever act the
                scene is currently in.

                CHILD ORDER IS THE CONTRACT — pidx() reads children[0], [1] and
                [2] as number, label and rule, and writes each one's colour plus
                the rule's width (14px -> 46px). data-a/data-b are the act's
                scene window and are parseFloat'd.

                This replaced a row of bare `pdot` bars. The ported engine has no
                pdot writer at all, so those bars were inert — a silent dead
                scene of exactly the kind the port contract warns about, where
                renaming a hook kills the behaviour with no error. Naming it
                pidx also earns the richer index the design actually wants: the
                act's number and name, not an anonymous tick. */}
            <div className="nlpo-index">
              {ACTS.map((act) => (
                <div
                  key={act.num}
                  data-anim="pidx"
                  data-a={act.a}
                  data-b={act.b}
                  className="nlpo-idxrow"
                >
                  <span data-tnum className="nl-num" style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6b7a92" }}>
                    {act.num}
                  </span>
                  <span className="nl-mono-xs" style={{ color: "#6b7a92" }}>
                    {act.nav}
                  </span>
                  <span
                    aria-hidden
                    style={{ display: "block", height: 1, width: 14, background: "#6b7a92" }}
                  />
                </div>
              ))}
            </div>

            {/* THE TWO CTAs. Both report cta_location "client_portal" — the
                previous portal section had two buttons and fired nothing.

                They used to be two BUTTONS of near-equal weight, and one of
                them was "Client sign-in" — a route for someone who has already
                bought, sitting beside the acquisition action at the same size.
                That is two decisions on one surface, and the reader has to work
                out which of them is meant for them. The sign-in is a text link
                now: still one click for a client who needs it, no longer
                competing with the only action that earns anything.

                The microcopy is the other half of the fix — this section makes
                the strongest promise on the page ("half only once you have
                approved the finished build") and then asked for a click without
                saying what the click costs. */}
            <div className="mt-[clamp(6px,1.6vh,14px)] flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href={cta.primary.href}
                  className="nl-cta"
                  data-magnet
                  onClick={() => trackCtaClick("client_portal", "primary", cta.primary.href, "home")}
                >
                  {cta.primary.label}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/login"
                  className="nl-hero-link"
                  onClick={() => trackCtaClick("client_portal", "secondary", "/login", "home")}
                >
                  Client sign-in
                </Link>
              </div>
              <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                {guarantee.short}
              </span>
            </div>
          </div>

          {/* ══ RIGHT — the portal shell ════════════════════════════════════ */}
          <div className="relative min-h-0">
            {/* 10px is the page's one large radius (nl.css radius ladder: the
                browser frame). The source used 8px, which is not on the ladder;
                this shell plays the same role as the frame, so it takes 10. */}
            <div
              className="nlpo-shell relative overflow-hidden"
              style={{
                height: "clamp(300px,68vh,560px)",
                gridTemplateColumns: "176px 1fr",
                borderRadius: 10,
                background: "var(--nl-paper)",
                border: "1px solid var(--nl-r14)",
                boxShadow: "0 50px 90px -40px rgba(11,27,58,0.30)",
              }}
            >
              {/* ── SIDEBAR. data-tone="dark" is not decoration: nl.css re-points
                  the whole token ladder inside it, so var(--nl-accent) becomes
                  the blaze value that reads on navy. Without it the pill's left
                  border would be #0891B2 on #0A1730 — blue on blue. ── */}
              <div
                data-tone="dark"
                className="relative flex flex-col gap-[20px] p-[20px_14px]"
                style={{ background: "var(--nl-ink-band)", padding: "20px 14px" }}
              >
                <span
                  style={{
                    color: "var(--nl-paper)",
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: "-0.03em",
                  }}
                >
                  STRATALANDING
                </span>

                <div className="relative flex flex-col gap-[2px]">
                  {/* 34px tall rows + 2px gap = the 36px pitch ppill steps by. */}
                  <div
                    data-anim="ppill"
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[34px]"
                    style={{
                      background: "rgba(251,249,244,0.10)",
                      borderRadius: 3,
                      borderLeft: "2px solid var(--nl-accent)",
                    }}
                  />
                  {ACTS.map((act, i) => (
                    <span
                      key={act.nav}
                      data-anim="pnav"
                      data-a={act.a}
                      data-b={act.b}
                      className="relative h-[34px] px-[11px] py-[9px] text-[12.5px]"
                      style={{
                        color: i === 0 ? "#fbf9f4" : "#6b7a92",
                        fontWeight: i === 0 ? 600 : 400,
                      }}
                    >
                      {act.nav}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-[8px]">
                  <span
                    aria-hidden
                    className="grid h-[26px] w-[26px] place-items-center rounded-full text-[10px] font-bold"
                    style={{ background: "var(--nl-accent)", color: "var(--nl-ink-deep)" }}
                  >
                    SA
                  </span>
                  <span className="flex flex-col">
                    <span style={{ color: "var(--nl-paper)", fontSize: 11.5 }}>Sample account</span>
                    <span style={{ color: "var(--nl-meta)", fontSize: 10 }}>Owner</span>
                  </span>
                </div>
              </div>

              {/* ── THE FOUR PANELS. No background: see the crossfade note in the
                  header comment. ── */}
              <div className="relative overflow-hidden">
                {/* ═ 01 — Dashboard ═════════════════════════════════════════ */}
                <div
                  data-anim="pp"
                  data-a={ACTS[0].a}
                  data-b={ACTS[0].b}
                  className="absolute inset-0 flex flex-col gap-[18px]"
                  style={{ padding: "26px 28px" }}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="nl-h3 m-0" style={{ fontSize: 22 }}>
                      Sample project
                    </h3>
                    <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                      In production · step 4 of 7
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-[12px]">
                    {[
                      {
                        k: "Brief",
                        chip: "Recorded",
                        tone: "green" as const,
                        fill: "100%",
                        bar: "var(--nl-green)",
                        sub: "Everything you told us, kept on file",
                      },
                      {
                        k: "Proposal",
                        chip: "Approved",
                        tone: "green" as const,
                        fill: "100%",
                        bar: "var(--nl-green)",
                        sub: "Scope and price, itemised",
                        anim: 2,
                      },
                      {
                        k: "Build",
                        chip: "In production",
                        tone: "accent" as const,
                        fill: "62%",
                        bar: "var(--nl-accent)",
                        sub: "Staging preview updates as we go",
                        anim: 1,
                      },
                      {
                        k: "Launch",
                        chip: "Not yet",
                        tone: "meta" as const,
                        fill: "0%",
                        bar: "var(--nl-ink)",
                        sub: "Everything hands over here",
                      },
                    ].map((c) => (
                      <div
                        key={c.k}
                        className="nlpo-cell flex flex-col gap-[10px]"
                        style={{
                          border: "1px solid var(--nl-r11)",
                          borderRadius: 5,
                          padding: 15,
                          background: "#fff",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{c.k}</span>
                          <span
                            className="nl-mono-xs"
                            style={{
                              color:
                                c.tone === "green"
                                  ? "var(--nl-green)"
                                  : c.tone === "accent"
                                    ? "var(--nl-accent)"
                                    : "var(--nl-meta)",
                              border: `1px solid ${
                                c.tone === "green"
                                  ? "rgba(31,122,77,0.30)"
                                  : c.tone === "accent"
                                    ? "rgba(8,145,178,0.32)"
                                    : "var(--nl-r16)"
                              }`,
                              borderRadius: 2,
                              padding: "3px 6px",
                            }}
                          >
                            {c.chip}
                          </span>
                        </div>
                        <div
                          className="h-[3px]"
                          style={{ background: "var(--nl-panel)", borderRadius: 2 }}
                        >
                          {/* TWO animated tracks, not one. pbar walks 0 -> 62%
                              over p 0.04-0.20; pmile2 walks 0 -> 50% over
                              0.08-0.24, a beat behind it. Two cells filling
                              slightly out of step is what makes the dashboard
                              read as several things progressing independently
                              rather than one bar with a label. Both are authored
                              at their end width so SSR is correct and the engine
                              takes them over on its first frame. */}
                          <div
                            {...(c.anim === 1
                              ? { "data-anim": "pbar" }
                              : c.anim === 2
                                ? { "data-anim": "pmile2" }
                                : {})}
                            className="h-full"
                            style={{ width: c.fill, background: c.bar, borderRadius: 2 }}
                          />
                        </div>
                        <span style={{ fontSize: 11.5, color: "var(--nl-meta)" }}>{c.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ═ 02 — Milestones ════════════════════════════════════════
                    Five ROWS, two PAYMENTS. The source's five-instalment
                    drawdown is not how this studio bills. */}
                <div
                  data-anim="pp"
                  data-a={ACTS[1].a}
                  data-b={ACTS[1].b}
                  className="absolute inset-0 flex flex-col gap-[18px]"
                  style={{ padding: "26px 28px" }}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="nl-h3 m-0" style={{ fontSize: 22 }}>
                      Milestones
                    </h3>
                    <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                      50% to start · 50% on your approval
                    </span>
                  </div>

                  <div className="flex flex-col">
                    {[
                      { done: true, label: "Brief received", state: "Done" },
                      { done: true, label: "Proposal approved — deposit 50%", state: "Done" },
                      {
                        done: false,
                        mile: true,
                        label: "You approve the finished build",
                        state: "Now",
                      },
                      { done: false, dim: true, label: "Balance 50%, then launch", state: "Next" },
                      {
                        done: false,
                        dim: true,
                        label: "Handover — code, design, assets",
                        state: "After",
                      },
                    ].map((r, i, arr) => (
                      <div
                        key={r.label}
                        className="nlpo-mile grid items-center gap-[14px]"
                        style={{
                          gridTemplateColumns: "24px minmax(0,1fr) auto",
                          padding: "13px 0",
                          borderBottom:
                            i === arr.length - 1 ? "none" : "1px solid var(--nl-r09)",
                          opacity: r.dim ? 0.45 : 1,
                        }}
                      >
                        {r.done || r.mile ? (
                          <span
                            {...(r.mile ? { "data-anim": "pmiledot" } : {})}
                            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[10px]"
                            style={{ background: "var(--nl-green)", color: "#fff" }}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            aria-hidden
                            className="block h-[18px] w-[18px] rounded-full"
                            style={{ border: "1px solid var(--nl-r20)" }}
                          />
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                          {r.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ═ 03 — Chat ══════════════════════════════════════════════
                    The one panel that wants an image, and the reason it does:
                    a drawn thread is a claim about software; a screenshot of
                    /portal/revisions is the software. */}
                <div
                  data-anim="pp"
                  data-a={ACTS[2].a}
                  data-b={ACTS[2].b}
                  className="absolute inset-0 flex flex-col gap-[14px]"
                  style={{ padding: "26px 28px" }}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="nl-h3 m-0" style={{ fontSize: 22 }}>
                      Chat
                    </h3>
                    <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                      One thread per project
                    </span>
                  </div>

                  <PortalShot className="min-h-0 flex-1" />

                  <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
                    Actual screen — /portal · sample account
                  </span>
                </div>

                {/* ═ 04 — Access & security ═════════════════════════════════ */}
                <div
                  data-anim="pp"
                  data-a={ACTS[3].a}
                  data-b={ACTS[3].b}
                  className="absolute inset-0 flex flex-col gap-[16px]"
                  style={{ padding: "26px 28px" }}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h3 className="nl-h3 m-0" style={{ fontSize: 22 }}>
                      Access &amp; security
                    </h3>
                    <span className="nl-mono-sm" style={{ color: "var(--nl-green)" }}>
                      2FA enforced
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-[14px]">
                    <div
                      className="flex flex-col gap-[11px]"
                      style={{
                        border: "1px solid var(--nl-r11)",
                        borderRadius: 5,
                        padding: 17,
                        background: "#fff",
                      }}
                    >
                      <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                        Verify device
                      </span>
                      <div className="flex gap-[6px]">
                        {/* Six boxes, in order — the engine indexes into
                            '419286' by position. Authored typed, so SSR and
                            every non-engine viewport show a filled code. */}
                        {CODE.map((d, i) => (
                          <span
                            key={i}
                            data-anim="pcode"
                            className="nl-num grid h-[40px] w-[32px] place-items-center text-[16px]"
                            style={{
                              border: "1px solid var(--nl-ink)",
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--nl-meta)" }}>
                        Authenticator app · codes rotate every 30 seconds
                      </span>
                    </div>

                    <div
                      className="flex flex-col gap-[9px]"
                      style={{
                        border: "1px solid var(--nl-r11)",
                        borderRadius: 5,
                        padding: 17,
                        background: "#fff",
                      }}
                    >
                      <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                        Seats
                      </span>
                      {/* Roles, not people. The source named three staff at a
                          practice that does not exist. */}
                      {[
                        ["Owner", "Everything"],
                        ["Billing", "Invoices only"],
                        ["Team", "Read & comment"],
                      ].map(([role, scope]) => (
                        <div key={role} className="flex justify-between text-[13px]">
                          <span>{role}</span>
                          <span style={{ color: "var(--nl-meta)" }}>{scope}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="flex flex-col gap-[9px]"
                    style={{
                      border: "1px solid var(--nl-r11)",
                      borderRadius: 5,
                      padding: 17,
                      background: "#fff",
                    }}
                  >
                    <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                      Recent sessions
                    </span>
                    <div className="flex justify-between text-[12.5px]">
                      <span>This device · Chrome</span>
                      <span style={{ color: "var(--nl-green)" }}>Active now</span>
                    </div>
                    <div className="flex justify-between text-[12.5px]">
                      <span>Previous session</span>
                      <span style={{ color: "var(--nl-meta)" }}>Signed out</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sits under the shell on desktop, and is the whole right column
                below the breakpoint — so the sample labelling survives into the
                fallback. */}
            <div className="nlpo-fall">
              <PortalShot
                className="w-full"
                style={{
                  height: "clamp(240px,52vw,420px)",
                  borderRadius: 10,
                  border: "1px solid var(--nl-r14)",
                  background: "var(--nl-paper)",
                }}
              />
            </div>

            <p
              className="nl-mono-xs m-0 mt-[14px]"
              style={{ color: "var(--nl-faint)" }}
            >
              Screens from the live client portal · sample account, sample data
            </p>
          </div>
        </div>
      </div>
      </Stage>

      {/* THE TWO CHECKPOINTS, FINALLY ON A SURFACE.
          brand.ts `guarantee.checkpoints` names the two review gates, under a
          comment reading "Every surface reads from here." Nothing did. They were
          written in the previous pass and rendered on no page at all — the
          strongest answer this studio has to its buyer's first fear ("the last
          web guy took my money and disappeared") existed only inside a FAQ that
          ships as JSON-LD. Google could read it. No human could.

          Here, because this section already walks the payment ladder and its
          act 02 now describes the SCREEN rather than restating the promise —
          the promise lands underneath it instead, once, in full.

          OUTSIDE the Stage, for the reason recorded in Anatomy.tsx: a pinned
          scene holds one viewport with no spare room, and copy reachable at a
          single scrub position is copy nobody reads. And deliberately WITHOUT a
          data-bg — it borrows the stage's own bone ground rather than declaring
          a band of its own, because the colour field has exactly one unit of
          slack against the specification and a short band cannot hold its own
          colour anyway (see the marquee, deleted for precisely that). */}
      <div style={{ background: "var(--nl-ground-bone)" }}>
        <div className="nl-inner" style={{ paddingBottom: "clamp(48px,7vh,86px)" }}>
          <div
            className="grid gap-x-12 gap-y-7 md:grid-cols-2"
            style={{ borderTop: "1px solid var(--nl-r16)", paddingTop: 30 }}
          >
            {guarantee.checkpoints.map((c) => (
              <div key={c.n} className="flex gap-5">
                <span
                  data-tnum
                  className="nl-num shrink-0 text-[10.5px] tracking-[0.16em]"
                  style={{ color: "var(--nl-accent)", paddingTop: 4 }}
                >
                  {c.n}
                </span>
                <div className="flex flex-col gap-[6px]">
                  <span
                    className="text-[17px] font-semibold leading-[1.25] tracking-[-0.02em]"
                    style={{ color: "var(--nl-ink)" }}
                  >
                    {c.title}
                  </span>
                  <span
                    className="text-[14px] leading-[1.55]"
                    style={{ color: "var(--nl-body)", maxWidth: "44ch" }}
                  >
                    {c.body}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The /portal/revisions screenshot, cropped to its chat card.
 *
 * WHY THE TRANSFORM MATHS AND NOT object-fit. `cover` on a 1440x1300 shot inside
 * a ~490px panel renders the whole page at ~0.34 and every message becomes a
 * 5px smudge. The point of using the real screen is that it is legible, so the
 * frame crops to the card itself (origin 330,240 of the 1440x1300 source) and
 * shows it at ~0.63 — messages land around 9px, which reads.
 *
 * The numbers are resolution-independent on purpose: the wrapper's width is a
 * percentage of the frame, and a translate percentage resolves against the
 * ELEMENT's own box, so both offsets are simply the crop origin expressed as a
 * fraction of the source image. Change the crop origin, change those two
 * numbers, nothing else.
 *
 * No `priority`: the SSR <h1> is this page's LCP and nothing may outrank it.
 */
const CROP = { x: 330, y: 240, w: 775, iw: 1440, ih: 1300 };

function PortalShot({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <div
        className="absolute left-0 top-0"
        style={{
          width: `${(CROP.iw / CROP.w) * 100}%`,
          transform: `translate(${-(CROP.x / CROP.iw) * 100}%, ${-(CROP.y / CROP.ih) * 100}%)`,
        }}
      >
        <Image
          src="/ops/portal-chat.webp"
          alt="The StrataLanding client portal chat screen: a project thread with messages from the client and the studio, and a message box."
          width={CROP.iw}
          height={CROP.ih}
          quality={72}
          loading="lazy"
          sizes="(max-width: 1039px) 92vw, 46vw"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}
