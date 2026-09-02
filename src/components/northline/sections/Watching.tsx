"use client";

/**
 * WATCHING — "we are measuring you, right now."
 *
 * SOURCE. This section is not in the v4 approved export. It is SWING A from the
 * v5 iteration, taken deliberately because it is the HONEST replacement for the
 * thing v5 shipped in its hero: a "LIVE — FROM CLIENT PAGES, RIGHT NOW" ticker
 * streaming invented page_view / deposit_paid rows on a 2,150ms timer. That
 * ticker was deleted (see Hero.tsx). This panel makes the same argument with
 * numbers that cannot be fabricated, because they are the reader's own.
 *
 * THE ARGUMENT. The studio sells a tracking spine. Rather than describe it, we
 * point it at the reader and show them the read-out, then turn it: this page
 * measured all of that about you in the last ninety seconds; your own site
 * measures none of it about whoever is on it right now.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE FOUR RULES THIS FILE LIVES OR DIES BY
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. NOTHING LEAVES THE PAGE. Every figure lives in one useRef object for the
 *    life of the tab. There is no fetch, no sendBeacon, no XHR, no WebSocket,
 *    no cookie, no localStorage/sessionStorage, no IndexedDB, no analytics
 *    call, no third-party anything in this file. Grep it. The disclaimer under
 *    the panel says exactly that, and if a single transmit appears here the
 *    disclaimer becomes a lie and the section's whole argument dies with it.
 *    (The page-level `section_view` fired by useSectionView is the site's own
 *    per-band analytics, identical on every section, and carries none of the
 *    figures in this panel — "nothing ABOVE leaves this page" stays true.)
 *
 * 2. DWELL CLAMPS ITS dt. Any frame gap over 400ms, or `document.hidden`,
 *    contributes ZERO milliseconds. Without this a tab left in the background
 *    silently inflates every dwell number on resume and the instrument lies —
 *    which is worse than not shipping it, because the section is a claim about
 *    honesty. Wall-clock "time on this page" is deliberately NOT clamped: it is
 *    read from performance.now() (navigation-relative), so it means exactly
 *    what it says — how long this page has been open.
 *
 * 3. EVERY NUMBER LERPS. 0.12–0.20 per frame toward target. A tracking panel
 *    that steps its values reads as a debug console; one that eases reads as an
 *    instrument. All numerics carry data-tnum so nl.css makes them tabular and
 *    nothing jitters.
 *
 * 4. THE RECORDER IS GATED ON TIER B. Desktop, fine pointer, motion on, mid+
 *    device. A phone gets StaticPanel: the same frame, the same argument, zero
 *    listeners and zero requestAnimationFrame. A 60fps recorder on a phone
 *    would cost the reader battery to prove a point about caring.
 *
 * SELF-DRIVING, SO NO data-anim. NLEngine's collect() owns ~90 data-anim keys
 * and the one-writer law says an element driven from JS may never also carry
 * data-row / data-fade / data-reveal / data-rule / data-wm. This component
 * writes its own nodes every frame, so it uses refs exclusively and puts no
 * scroll-animation attribute on anything it touches. The only two animated
 * attributes in the file are on the LedgerHead (data-para/data-rule), which is
 * a shared primitive this file does not write to.
 *
 * WHERE THE SECTION LIST COMES FROM. Discovered from the DOM at runtime via
 * [data-screen-label] + id — the convention every Northline section already
 * follows. Nothing to keep in sync as the other bands land; a section that does
 * not exist yet simply is not in the list.
 */

import { useEffect, useRef, useState } from "react";
import { LedgerHead } from "../LedgerHead";
import { Plate } from "../Plate";
import { useSectionView, useStrataTier } from "@/components/strata/tier";

/* ── shape ─────────────────────────────────────────────────────────────────── */

interface Sec {
  id: string;
  label: string;
}
interface RowNodes {
  bar: HTMLElement | null;
  val: HTMLElement | null;
  nm: HTMLElement | null;
}
interface EvNodes {
  root: HTMLElement | null;
  time: HTMLElement | null;
  kind: HTMLElement | null;
  note: HTMLElement | null;
  hot: HTMLElement | null;
}
interface HotNodes {
  dot: HTMLElement | null;
  nm: HTMLElement | null;
  st: HTMLElement | null;
}
interface Ev {
  k: string;
  n: string;
  h: boolean;
  t: Date;
}
interface Sess {
  last: number;
  id: string;
  start: Date;
  depth: number;
  dDepth: number;
  pos: number;
  dPos: number;
  dist: number;
  dDist: number;
  exits: number;
  exAt: number;
  drags: number;
  hov: Set<string>;
  cur: string | null;
  entAt: number;
  dwell: Record<string, number>;
  deep: Record<string, boolean>;
  ev: Ev[];
  flags: Record<string, Date | undefined>;
  trace: number[];
  traceAt: number;
  dirty: boolean;
  hotDirty: boolean;
  traceDirty: boolean;
}

/** The five the panel flags. Order is the strip's order, left to right. */
const HOT_KEYS = ["scroll_50", "scroll_75", "worksheet_drag", "price_hover", "exit_intent"] as const;

/** Six event rows, oldest at the bottom. Fixed count — the stream scrolls itself. */
const EV_ROWS = 6;

/** The trace: ~90 samples at 400ms = the last ~36 seconds of scroll position. */
const TRACE_MAX = 90;

/** The panel is always dark-tone, so its idle bar can sit on the hairline ladder. */
const BAR_TRACK = "var(--nl-r09)";
const BAR_IDLE = "var(--nl-r24)";

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const pad2 = (n: number) => (n < 10 ? "0" : "") + n;
const hhmmss = (d: Date) => d.toLocaleTimeString("en-US", { hour12: false });
const put = (el: HTMLElement | null, v: string) => {
  if (el && el.textContent !== v) el.textContent = v;
};

/** Every Northline band carries data-screen-label + id. That is the whole registry. */
function discover(): Sec[] {
  if (typeof document === "undefined") return [];
  const out: Sec[] = [];
  document.querySelectorAll<HTMLElement>("[data-screen-label]").forEach((el) => {
    // The cap was 14 while 15 elements qualified, so #start — the page's
    // closing section and its second real intake — was silently missing from
    // the reader's own session read-out. 18 leaves room to add a band.
    if (!el.id || out.length >= 18) return;
    out.push({ id: el.id, label: el.getAttribute("data-screen-label") || el.id });
  });
  return out;
}

/* ── the section ───────────────────────────────────────────────────────────── */

export function Watching() {
  const ref = useRef<HTMLElement | null>(null);
  /* WAS "proof_cta" — the analytics id of a CTA BAND, on a section that contains
     zero CTAs, while Anatomy legitimately owns "proof". Every reach report read
     this band as CTA reach. Renaming it stops the historical proof_cta series
     accruing rows that were never CTA impressions; that is the correction, not
     a loss. */
  useSectionView(ref, "watching");
  const tier = useStrataTier();

  return (
    <section
      ref={ref}
      id="watching"
      data-tone="dark"
      data-screen-label="Live session"
      data-bg="#0a1730"
      className="nl-section"
      /* No overflow:hidden here — the LedgerHead carries data-para and the
         engine translates it up to ~40px past the section's top edge. */
      style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 112 }}
    >
      <Plate id="watching" position="50% 40%" />

      {/* The plate is absolutely positioned; content needs its own stacking
          context to sit above it. */}
      <div className="relative">
        <LedgerHead label="Live session" meta="You, right now" />
        {tier === "B" ? <LivePanel /> : <StaticPanel />}
      </div>
    </section>
  );
}

/* ── shared chrome ─────────────────────────────────────────────────────────── */

/** The panel frame: full-bleed, ruled top and bottom. Both tiers wear it. */
function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="nl-bleed"
      style={{ borderTop: "1px solid var(--nl-r24)", borderBottom: "1px solid var(--nl-r24)" }}
    >
      {children}
    </div>
  );
}

/** The turn line + the disclaimer. The disclaimer sentence is load-bearing. */
function Turn({ children }: { children: React.ReactNode }) {
  return (
    <div className="nl-inner flex flex-col gap-5" style={{ paddingTop: 52 }}>
      {children}
      <span
        className="nl-mono block"
        style={{ color: "var(--nl-meta)", maxWidth: "88ch" }}
      >
        Same instrument we install on every build. Nothing above leaves this page — no cookie, no
        network call, no third party.
      </span>
    </div>
  );
}

function Stat({
  label,
  nodeRef,
  initial,
}: {
  label: string;
  nodeRef: React.RefObject<HTMLSpanElement | null>;
  initial: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
        {label}
      </span>
      <span
        ref={nodeRef}
        data-tnum="1"
        className="nl-num"
        style={{ fontSize: 11, color: "var(--nl-paper)" }}
      >
        {initial}
      </span>
    </div>
  );
}

/* ── TIER B — the recorder ─────────────────────────────────────────────────── */

function LivePanel() {
  /* Read the DOM during first render: LivePanel only ever mounts on the client
     (tier B is never the SSR value), so there is no hydration surface here and
     the rows are correct on frame one. The poll below catches any band that
     mounts late. */
  const [secs, setSecs] = useState<Sec[]>(discover);
  const secsRef = useRef<Sec[]>(secs);
  secsRef.current = secs;

  /* ── node handles. Refs, never data-anim: this component is self-driving and
     the one-writer law forbids sharing an element with the engine or with a CSS
     scroll animation. ── */
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const enteredRef = useRef<HTMLSpanElement | null>(null);
  const distRef = useRef<HTMLSpanElement | null>(null);
  const dragsRef = useRef<HTMLSpanElement | null>(null);
  const hoversRef = useRef<HTMLSpanElement | null>(null);
  const exitsRef = useRef<HTMLSpanElement | null>(null);
  const idRef = useRef<HTMLSpanElement | null>(null);
  const srcRef = useRef<HTMLSpanElement | null>(null);
  const vpRef = useRef<HTMLSpanElement | null>(null);
  const depthRef = useRef<HTMLSpanElement | null>(null);
  const depthBarRef = useRef<HTMLSpanElement | null>(null);
  const depthNowRef = useRef<HTMLSpanElement | null>(null);
  const traceRef = useRef<SVGPolylineElement | null>(null);
  const traceDotRef = useRef<SVGCircleElement | null>(null);
  const t1Ref = useRef<HTMLSpanElement | null>(null);
  const t2Ref = useRef<HTMLSpanElement | null>(null);
  const t3Ref = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const rowsRef = useRef<Map<string, RowNodes>>(new Map());
  const evRef = useRef<EvNodes[]>(
    Array.from({ length: EV_ROWS }, () => ({ root: null, time: null, kind: null, note: null, hot: null }))
  );
  const hotRef = useRef<HotNodes[]>(
    Array.from({ length: HOT_KEYS.length }, () => ({ dot: null, nm: null, st: null }))
  );

  const setRow = (id: string, key: keyof RowNodes) => (el: HTMLElement | null) => {
    const m = rowsRef.current;
    let r = m.get(id);
    if (!r) {
      r = { bar: null, val: null, nm: null };
      m.set(id, r);
    }
    r[key] = el;
  };

  /* The whole session. One object, one tab, never persisted, never sent. */
  const booted = useRef(false);
  const sess = useRef<Sess | null>(null);
  if (!sess.current) {
    /* performance.now() is navigation-relative, so "time on this page" is the
       real thing rather than time-since-this-component-mounted, and timeOrigin
       gives the true arrival wall-clock. */
    const origin =
      typeof performance !== "undefined" && performance.timeOrigin
        ? performance.timeOrigin
        : Date.now();
    sess.current = {
      last: typeof performance !== "undefined" ? performance.now() : 0,
      id: "SL-" + String(1000 + Math.floor(Math.random() * 8999)),
      start: new Date(origin),
      depth: 0,
      dDepth: 0,
      pos: 0,
      dPos: 0,
      dist: 0,
      dDist: 0,
      exits: 0,
      exAt: 0,
      drags: 0,
      hov: new Set<string>(),
      cur: null,
      entAt: 0,
      dwell: {},
      deep: {},
      ev: [],
      flags: {},
      trace: [],
      traceAt: 0,
      dirty: true,
      hotDirty: true,
      traceDirty: true,
    };
  }

  /* Late bands. The engine polls collect() for ~9s for the same reason; nine
     ticks at 400ms covers a slow client-only section without polling forever. */
  useEffect(() => {
    let n = 0;
    const iv = window.setInterval(() => {
      n += 1;
      const next = discover();
      setSecs((prev) =>
        prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next
      );
      if (n >= 9) window.clearInterval(iv);
    }, 400);
    return () => window.clearInterval(iv);
  }, []);

  /* ── the recorder. ONE rAF loop, four listeners, all released on unmount. ── */
  useEffect(() => {
    const st = sess.current;
    if (!st) return;

    const slog = (k: string, n: string, hot: boolean) => {
      st.ev.unshift({ k, n, h: hot, t: new Date() });
      if (st.ev.length > 26) st.ev.pop();
      st.dirty = true;
    };
    const sflag = (k: string, note: string) => {
      if (st.flags[k]) return;
      st.flags[k] = new Date();
      st.hotDirty = true;
      slog(k, note, true);
    };
    const labelOf = (id: string) => {
      const s = secsRef.current.find((x) => x.id === id);
      return s ? s.label : id;
    };

    /* ── the header's fixed fields. document.referrer is a read of the current
       document — no request, no third party. ── */
    put(idRef.current, st.id);
    let ref = "direct";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "direct";
    } catch {
      ref = "direct";
    }
    put(srcRef.current, ref || "direct");
    put(enteredRef.current, hhmmss(st.start));
    /* Guarded: StrictMode mounts effects twice in dev and the stream would open
       with two session_start rows. */
    if (!booted.current) {
      booted.current = true;
      slog(
        "session_start",
        hhmmss(st.start) + " · " + (window.innerWidth || 0) + "×" + (window.innerHeight || 0),
        false
      );
    }

    /* ── listeners ──────────────────────────────────────────────────────────
       Distance is Manhattan, matching the source. NLEngine tracks its own
       pointer for the cursor ring but exports no subscription, so this owns a
       passive listener of its own rather than reaching into the engine. */
    let px: number | null = null;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      if (px !== null) st.dist += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
      px = e.clientX;
      py = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /* Exit intent: the pointer leaves through the TOP of the window (toward the
       tab bar / address bar), rate-limited so a jittery edge cannot spam it. */
    const onExit = (e: PointerEvent) => {
      if (e.clientY > 8) return;
      const now = performance.now();
      if (now - st.exAt < 1500) return;
      st.exAt = now;
      st.exits += 1;
      if (!st.flags.exit_intent) {
        st.flags.exit_intent = new Date();
        st.hotDirty = true;
      }
      slog("exit_intent", "pointer left through the top of the window", true);
    };
    document.documentElement.addEventListener("pointerleave", onExit);

    /* Delegated, so this never holds a handle on another component's nodes and
       survives their remounts. Capture phase so a stopPropagation upstream
       cannot blind the instrument. */
    const onOver = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || typeof t.closest !== "function") return;
      const row = t.closest("#pricing [data-row]");
      if (!row) return;
      const nm = (row.querySelector("span")?.textContent || "row").trim();
      if (st.hov.has(nm)) return;
      st.hov.add(nm);
      if (!st.flags.price_hover) {
        st.flags.price_hover = new Date();
        st.hotDirty = true;
      }
      slog("price_hover", nm.toLowerCase() + " · row held", true);
    };
    document.addEventListener("pointerover", onOver, { passive: true, capture: true });

    const onInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || typeof t.matches !== "function" || !t.matches('[data-anim="calcin"]')) return;
      sflag("worksheet_drag", "the math worksheet was moved");
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || typeof t.matches !== "function" || !t.matches('[data-anim="calcin"]')) return;
      st.drags += 1;
      slog("worksheet_set", (t.dataset.k || "value") + " = " + t.value, false);
    };
    document.addEventListener("input", onInput, { passive: true, capture: true });
    document.addEventListener("change", onChange, { passive: true, capture: true });

    /* ── the frame ─────────────────────────────────────────────────────────── */
    let raf = 0;
    let threw = false;
    let resolved: Array<{ id: string; label: string; el: HTMLElement }> = [];
    let resolvedFor: Sec[] | null = null;
    /* How many rows the pricing ledger actually has, so "2 / 3" cannot drift if
       the ledger changes. Re-counted once a second, never per frame — a
       document-wide selector at 60fps is a real cost for a number that moves
       about as often as the price list does. */
    let priceRows = 3;
    let priceAt = -9999;

    const paint = () => {
      const now = performance.now();
      const doc = document.scrollingElement || document.documentElement;
      const vh = window.innerHeight || 800;

      /* RULE 2. A gap over 400ms is a stall, a resume from a background tab, or
         a throttled timer — none of it is time the reader spent reading. It
         contributes nothing. This single line is what keeps every dwell figure
         in the panel true. */
      let dt = now - st.last;
      st.last = now;
      if (!(dt > 0) || dt > 400 || document.hidden) dt = 0;

      /* ── measure. Always, even when the panel is off-screen: the reader is
         doing the reading somewhere else on the page and that is the point. ── */
      const H = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const pos = clamp(doc.scrollTop / H, 0, 1);
      st.pos = pos;
      if (pos > st.depth) st.depth = pos;

      /* RULE 3 — the three lerps. Never a step. */
      st.dDepth += (st.depth - st.dDepth) * 0.12;
      st.dPos += (pos - st.dPos) * 0.2;
      st.dDist += (st.dist - st.dDist) * 0.12;

      if (resolvedFor !== secsRef.current || resolved.some((r) => !r.el.isConnected)) {
        resolvedFor = secsRef.current;
        resolved = [];
        for (const s of resolvedFor) {
          const el = document.getElementById(s.id);
          if (el) resolved.push({ id: s.id, label: s.label, el });
        }
      }

      /* The 45% reading line — the same one the section rail uses, so the two
         instruments can never disagree about where you are. */
      let cur: string | null = null;
      for (const s of resolved) {
        const r = s.el.getBoundingClientRect();
        if (r.top <= vh * 0.45 && r.bottom > vh * 0.45) cur = s.id;
      }
      if (cur) {
        st.dwell[cur] = (st.dwell[cur] || 0) + dt;
        if (cur !== st.cur) {
          st.cur = cur;
          if (now - st.entAt > 650) {
            st.entAt = now;
            slog("section_enter", labelOf(cur), false);
          }
        }
        if (st.dwell[cur] > 14000 && !st.deep[cur]) {
          st.deep[cur] = true;
          slog("deep_read", labelOf(cur) + " · held past 14 seconds", false);
        }
      }

      if (st.depth > 0.5) sflag("scroll_50", "half the page");
      if (st.depth > 0.75) sflag("scroll_75", "three quarters");
      if (st.depth > 0.94) sflag("scroll_end", "reached the last section");

      if (now - st.traceAt > 400) {
        st.traceAt = now;
        st.trace.push(pos);
        if (st.trace.length > TRACE_MAX) st.trace.shift();
        st.traceDirty = true;
      }

      /* ── paint. Culled when the panel is nowhere near the viewport: the
         measurement above is cheap, ~40 DOM writes a frame is not. ── */
      const p = panelRef.current;
      if (!p) return;
      const pr = p.getBoundingClientRect();
      if (pr.bottom < -700 || pr.top > vh + 700) return;

      const elapsed = now / 1000;
      const mm = Math.floor(elapsed / 60);
      const ss = Math.floor(elapsed % 60);
      put(timeRef.current, pad2(mm) + ":" + pad2(ss));
      put(vpRef.current, (window.innerWidth || 0) + "×" + (window.innerHeight || 0));
      put(distRef.current, Math.round(st.dDist).toLocaleString("en-US") + " px");
      put(dragsRef.current, st.drags + (st.drags === 1 ? " drag" : " drags"));
      put(exitsRef.current, st.exits + " ×");
      if (now - priceAt > 1000) {
        priceAt = now;
        priceRows = document.querySelectorAll("#pricing [data-row]").length || 3;
      }
      put(hoversRef.current, st.hov.size + " / " + priceRows);

      put(depthRef.current, Math.round(st.dDepth * 100) + "%");
      if (depthBarRef.current) depthBarRef.current.style.width = (st.dDepth * 100).toFixed(2) + "%";
      if (depthNowRef.current) depthNowRef.current.style.left = (st.dPos * 100).toFixed(2) + "%";

      let mx = 1;
      let top: string | null = null;
      let topV = 0;
      for (const k in st.dwell) {
        const v = st.dwell[k];
        if (v > mx) mx = v;
        if (v > topV) {
          topV = v;
          top = k;
        }
      }
      for (const s of resolved) {
        const nodes = rowsRef.current.get(s.id);
        if (!nodes) continue;
        const v = st.dwell[s.id] || 0;
        const on = s.id === st.cur;
        if (nodes.bar) {
          nodes.bar.style.width = ((v / mx) * 100).toFixed(2) + "%";
          nodes.bar.style.background = on ? "var(--nl-accent)" : BAR_IDLE;
        }
        put(nodes.val, (v / 1000).toFixed(1));
        if (nodes.val)
          nodes.val.style.color = on
            ? "var(--nl-accent)"
            : v > 0
              ? "var(--nl-body)"
              : "var(--nl-meta)";
        if (nodes.nm)
          nodes.nm.style.color = on
            ? "var(--nl-paper)"
            : v > 0
              ? "var(--nl-body)"
              : "var(--nl-faint)";
      }

      if (st.dirty) {
        st.dirty = false;
        for (let i = 0; i < evRef.current.length; i++) {
          const row = evRef.current[i];
          const it = st.ev[i];
          if (!row.root) continue;
          if (!it) {
            row.root.style.opacity = "0.22";
            continue;
          }
          row.root.style.opacity = String(1 - i * 0.12);
          put(row.time, hhmmss(it.t));
          put(row.kind, it.k);
          if (row.kind) row.kind.style.color = it.h ? "var(--nl-accent)" : "var(--nl-paper)";
          put(row.note, it.n ? " · " + it.n : "");
          put(row.hot, it.h ? "●" : "");
        }
      }

      if (st.hotDirty) {
        st.hotDirty = false;
        for (let i = 0; i < hotRef.current.length; i++) {
          const h = hotRef.current[i];
          const at = st.flags[HOT_KEYS[i]];
          if (h.dot) {
            h.dot.style.background = at ? "var(--nl-accent)" : "transparent";
            h.dot.style.borderColor = at ? "var(--nl-accent)" : "var(--nl-r24)";
            h.dot.style.boxShadow = at ? "0 0 0 4px var(--nl-accent-soft)" : "none";
          }
          if (h.nm) h.nm.style.color = at ? "var(--nl-paper)" : "var(--nl-meta)";
          if (h.st) {
            put(h.st, at ? hhmmss(at) : "waiting");
            h.st.style.color = at ? "var(--nl-accent)" : "var(--nl-faint)";
          }
        }
      }

      if (st.traceDirty && traceRef.current) {
        st.traceDirty = false;
        const n = st.trace.length;
        let pts = "";
        for (let i = 0; i < n; i++) {
          const x = n < 2 ? 0 : (i / (n - 1)) * 300;
          pts += (i ? " " : "") + x.toFixed(1) + "," + (53 - st.trace[i] * 48).toFixed(1);
        }
        traceRef.current.setAttribute("points", pts || "0,53");
        if (traceDotRef.current) {
          traceDotRef.current.setAttribute("cx", n < 2 ? "0" : "300");
          traceDotRef.current.setAttribute(
            "cy",
            (53 - (st.trace[n - 1] || 0) * 48).toFixed(1)
          );
        }
      }

      /* The turn. Same figures, said as a sentence. */
      put(t1Ref.current, mm > 0 ? mm + "m " + ss + "s" : ss + "s");
      put(t2Ref.current, Math.round(st.dDepth * 100) + "%");
      const lab = top ? labelOf(top) : "";
      put(t3Ref.current, lab ? lab.charAt(0).toLowerCase() + lab.slice(1) : "the top of the page");
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      try {
        paint();
      } catch (e) {
        /* One instrument must never be able to stop the page. Report once, keep
           the loop alive so a transient (a section unmounting mid-frame) heals. */
        if (!threw) {
          threw = true;
          console.error("WATCHING", e);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onExit);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onChange, true);
    };
  }, []);

  return (
    <>
      <PanelShell>
        <div ref={panelRef}>
          {/* ── header strip ── */}
          <div
            className="flex flex-wrap items-center gap-[22px]"
            style={{ padding: "12px var(--nl-gutter)", borderBottom: "1px solid var(--nl-r14)" }}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--nl-accent)",
                  display: "block",
                  animation: "nlBlink 1.5s steps(1,end) infinite",
                }}
              />
              <span className="nl-mono-sm" style={{ color: "var(--nl-accent)" }}>
                Rec
              </span>
            </span>
            <span className="nl-mono-sm" style={{ color: "var(--nl-paper)" }}>
              StrataMetrics — the tracking spine we install on every build
            </span>
            <span className="flex-1" style={{ minWidth: 20 }} />
            <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
              Session{" "}
              <span ref={idRef} data-tnum="1" style={{ color: "var(--nl-paper)" }}>
                SL-0000
              </span>
            </span>
            <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
              Source{" "}
              <span ref={srcRef} style={{ color: "var(--nl-paper)" }}>
                direct
              </span>
            </span>
            <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
              Viewport{" "}
              <span ref={vpRef} data-tnum="1" style={{ color: "var(--nl-paper)" }}>
                —
              </span>
            </span>
          </div>

          {/* ── three columns. The 1px gap IS the rule; cells carry no borders. ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "clamp(230px,21vw,310px) minmax(0,1fr) clamp(272px,25vw,352px)",
              gap: 1,
              background: "var(--nl-r14)",
            }}
          >
            {/* 01 — time */}
            <div
              style={{
                background: "var(--nl-ink-band)",
                padding: "24px 26px 26px var(--nl-gutter)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                Time on this page
              </span>
              <div className="flex flex-col gap-[5px]">
                <span
                  ref={timeRef}
                  data-tnum="1"
                  className="nl-display"
                  style={{ fontSize: "clamp(42px,4.6vw,68px)", lineHeight: 0.86 }}
                >
                  00:00
                </span>
                <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                  minutes : seconds · still counting
                </span>
              </div>
              <span
                aria-hidden
                style={{ height: 1, background: "var(--nl-r14)", display: "block", marginTop: 2 }}
              />
              <div className="flex flex-col gap-[9px]">
                <Stat label="Entered" nodeRef={enteredRef} initial="--:--:--" />
                <Stat label="Cursor travelled" nodeRef={distRef} initial="0 px" />
                <Stat label="Worksheet" nodeRef={dragsRef} initial="0 drags" />
                <Stat label="Price rows" nodeRef={hoversRef} initial="0 / 3" />
                <Stat label="Exit intent" nodeRef={exitsRef} initial="0 ×" />
              </div>
            </div>

            {/* 02 — depth + dwell */}
            <div
              style={{
                background: "var(--nl-ink-band)",
                padding: "24px 26px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 15,
                minWidth: 0,
              }}
            >
              <div className="flex items-baseline justify-between gap-[14px]">
                <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                  Scroll depth — deepest point reached
                </span>
                <span
                  ref={depthRef}
                  data-tnum="1"
                  className="nl-num"
                  style={{ fontSize: 14, color: "var(--nl-accent)" }}
                >
                  0%
                </span>
              </div>
              <div style={{ height: 5, background: BAR_TRACK, position: "relative", display: "block" }}>
                <span
                  ref={depthBarRef}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "0%",
                    background: "var(--nl-accent)",
                    display: "block",
                  }}
                />
                {/* the "now" marker — where you are, against where you have been */}
                <span
                  ref={depthNowRef}
                  style={{
                    position: "absolute",
                    top: -4,
                    bottom: -4,
                    left: "0%",
                    width: 1,
                    background: "var(--nl-paper)",
                    display: "block",
                  }}
                />
              </div>

              <span className="nl-mono-xs" style={{ color: "var(--nl-meta)", paddingTop: 5 }}>
                Dwell by section — seconds held at the reading line
              </span>
              <div className="flex flex-col gap-px">
                {secs.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px minmax(58px,88px) minmax(0,1fr) 42px",
                      gap: 11,
                      alignItems: "center",
                      padding: "2.5px 0",
                    }}
                  >
                    <span
                      data-tnum="1"
                      className="nl-num"
                      style={{ fontSize: 9, color: "var(--nl-meta)" }}
                    >
                      {pad2(i + 1)}
                    </span>
                    <span
                      ref={setRow(s.id, "nm")}
                      className="nl-num"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.06em",
                        color: "var(--nl-faint)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.label}
                    </span>
                    <span style={{ height: 3, background: BAR_TRACK, display: "block", position: "relative" }}>
                      <span
                        ref={setRow(s.id, "bar")}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: "0%",
                          background: BAR_IDLE,
                          display: "block",
                        }}
                      />
                    </span>
                    <span
                      ref={setRow(s.id, "val")}
                      data-tnum="1"
                      className="nl-num"
                      style={{ fontSize: 9.5, color: "var(--nl-meta)", textAlign: "right" }}
                    >
                      0.0
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 03 — event stream + trace */}
            <div
              style={{
                background: "var(--nl-ink-band)",
                padding: "24px var(--nl-gutter) 26px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                  Event stream
                </span>
                <span
                  className="nl-mono-xs flex items-center gap-[6px]"
                  style={{ color: "var(--nl-green)" }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--nl-green)",
                      display: "block",
                    }}
                  />
                  live
                </span>
              </div>

              <div className="flex flex-col">
                {Array.from({ length: EV_ROWS }, (_, i) => (
                  <div
                    key={i}
                    ref={(el) => {
                      evRef.current[i].root = el;
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px minmax(0,1fr) auto",
                      gap: 10,
                      alignItems: "baseline",
                      padding: "6px 0",
                      borderBottom: i < EV_ROWS - 1 ? "1px solid var(--nl-r06)" : "none",
                      opacity: 0.22,
                    }}
                  >
                    <span
                      ref={(el) => {
                        evRef.current[i].time = el;
                      }}
                      data-tnum="1"
                      className="nl-num"
                      style={{ fontSize: 9.5, color: "var(--nl-meta)" }}
                    >
                      --:--:--
                    </span>
                    <span
                      style={{
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <span
                        ref={(el) => {
                          evRef.current[i].kind = el;
                        }}
                        className="nl-num"
                        style={{ fontSize: 11, color: "var(--nl-paper)" }}
                      >
                        idle
                      </span>
                      <span
                        ref={(el) => {
                          evRef.current[i].note = el;
                        }}
                        style={{ fontSize: 11.5, color: "var(--nl-meta)" }}
                      >
                        {" · waiting"}
                      </span>
                    </span>
                    <span
                      ref={(el) => {
                        evRef.current[i].hot = el;
                      }}
                      style={{ fontSize: 10, color: "var(--nl-accent)" }}
                    />
                  </div>
                ))}
              </div>

              <span className="nl-mono-xs" style={{ color: "var(--nl-meta)", paddingTop: 6 }}>
                Session trace — where you have been
              </span>
              <svg
                viewBox="0 0 300 54"
                preserveAspectRatio="none"
                aria-hidden
                style={{ width: "100%", height: 54, display: "block", overflow: "visible" }}
              >
                {/* Paint goes in `style`, NOT in the presentation attribute:
                    var() inside an SVG presentation attribute does not resolve
                    in Chrome, and the trace would render black-on-navy. */}
                <line
                  x1="0"
                  y1="53"
                  x2="300"
                  y2="53"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  style={{ stroke: "var(--nl-r14)" }}
                />
                <polyline
                  ref={traceRef}
                  points="0,53"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ fill: "none", stroke: "var(--nl-accent)" }}
                />
                <circle
                  ref={traceDotRef}
                  cx="0"
                  cy="53"
                  r="2.2"
                  style={{ fill: "var(--nl-accent)" }}
                />
              </svg>
            </div>
          </div>

          {/* ── the five it flags ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,minmax(0,1fr))",
              gap: 1,
              background: "var(--nl-r14)",
              borderTop: "1px solid var(--nl-r14)",
            }}
          >
            {HOT_KEYS.map((k, i) => (
              <div
                key={k}
                style={{
                  background: "var(--nl-ink-band)",
                  paddingTop: 14,
                  paddingBottom: 15,
                  paddingLeft: i === 0 ? "var(--nl-gutter)" : 18,
                  paddingRight: i === HOT_KEYS.length - 1 ? "var(--nl-gutter)" : 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                }}
              >
                <span
                  ref={(el) => {
                    hotRef.current[i].dot = el;
                  }}
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    border: "1px solid var(--nl-r24)",
                    display: "block",
                    flexShrink: 0,
                  }}
                />
                <span className="flex flex-col gap-[2px]" style={{ minWidth: 0 }}>
                  <span
                    ref={(el) => {
                      hotRef.current[i].nm = el;
                    }}
                    className="nl-num"
                    style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--nl-meta)" }}
                  >
                    {k}
                  </span>
                  <span
                    ref={(el) => {
                      hotRef.current[i].st = el;
                    }}
                    className="nl-mono-xs"
                    style={{ color: "var(--nl-faint)" }}
                  >
                    waiting
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </PanelShell>

      <Turn>
        <p
          className="nl-h2 m-0"
          style={{
            fontSize: "clamp(27px,3.5vw,56px)",
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
            maxWidth: "19ch",
          }}
        >
          That&rsquo;s you.{" "}
          <span ref={t1Ref} data-tnum="1" style={{ color: "var(--nl-accent)" }}>
            0s
          </span>{" "}
          here,{" "}
          <span ref={t2Ref} data-tnum="1" style={{ color: "var(--nl-accent)" }}>
            0%
          </span>{" "}
          read, longest look at{" "}
          <span ref={t3Ref} className="nl-serif" style={{ color: "var(--nl-accent)" }}>
            the top of the page
          </span>
          . Your own site knows none of this about whoever is on it right now.
        </p>
      </Turn>
    </>
  );
}

/* ── TIER A — the honest static panel ──────────────────────────────────────────
   Phone, coarse pointer, reduced motion, or a low-tier device. No listeners, no
   rAF, no measurement at all — and therefore no numbers, because inventing them
   here would be exactly the fabrication this section exists to replace. The
   frame and the argument survive; only the read-out is absent, and the panel
   says so in the header rather than showing a dead instrument.

   One column throughout, deliberately. The 1px-gap rule grid only works when
   items fill every cell: a three-item auto-fit grid that lands on two columns
   exposes the container's hairline as a solid block (nl.css says so in the
   .nl-strip note). One column can never half-fill a row. */

const STATIC_COLUMNS: Array<{ label: string; head: string; body: string }> = [
  {
    label: "Time on this page",
    head: "Every session, timed.",
    body: "Arrival, seconds held, cursor distance travelled, worksheet drags, price-row hovers, and every attempt to leave through the top of the window.",
  },
  {
    label: "Scroll depth",
    head: "Deepest point, and where you are now.",
    body: "Plus seconds held at the 45% reading line for every section on the page — so a band that gets read is told apart from a band that gets scrolled past.",
  },
  {
    label: "Event stream",
    head: "Timestamped, in order.",
    body: "Every event as it fires, and the whole path through the page drawn as one trace. The same read-out we hand you in the portal after launch.",
  },
];

function StaticPanel() {
  return (
    <>
      <PanelShell>
        {/* header strip — no pulsing dot, because nothing is recording */}
        <div
          className="flex flex-wrap items-center gap-[18px]"
          style={{ padding: "12px var(--nl-gutter)", borderBottom: "1px solid var(--nl-r14)" }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              border: "1px solid var(--nl-r24)",
              display: "block",
            }}
          />
          <span className="nl-mono-sm" style={{ color: "var(--nl-paper)" }}>
            StrataMetrics — the tracking spine we install on every build
          </span>
          <span className="flex-1" style={{ minWidth: 20 }} />
          <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
            Recorder off on this device
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 1,
            background: "var(--nl-r14)",
          }}
        >
          {STATIC_COLUMNS.map((c) => (
            <div
              key={c.label}
              style={{
                background: "var(--nl-ink-band)",
                padding: "22px var(--nl-gutter) 24px",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                {c.label}
              </span>
              <span
                className="nl-h3"
                style={{ fontSize: "clamp(19px,2.4vw,26px)", color: "var(--nl-paper)" }}
              >
                {c.head}
              </span>
              <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--nl-body)" }}>
                {c.body}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 1,
            background: "var(--nl-r14)",
            borderTop: "1px solid var(--nl-r14)",
          }}
        >
          {HOT_KEYS.map((k) => (
            <div
              key={k}
              style={{
                background: "var(--nl-ink-band)",
                padding: "11px var(--nl-gutter) 12px",
                display: "flex",
                alignItems: "center",
                gap: 11,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  border: "1px solid var(--nl-r24)",
                  display: "block",
                  flexShrink: 0,
                }}
              />
              <span
                className="nl-num"
                style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--nl-meta)" }}
              >
                {k}
              </span>
              <span className="flex-1" />
              <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
                flagged on every build
              </span>
            </div>
          ))}
        </div>
      </PanelShell>

      <Turn>
        <p
          className="nl-h2 m-0"
          style={{
            fontSize: "clamp(27px,3.5vw,56px)",
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
            maxWidth: "20ch",
          }}
        >
          On a full-size screen this panel fills itself in{" "}
          <span className="nl-serif" style={{ color: "var(--nl-accent)" }}>
            from your own session
          </span>
          , live. Your own site knows none of it about whoever is on it right now.
        </p>
      </Turn>
    </>
  );
}
