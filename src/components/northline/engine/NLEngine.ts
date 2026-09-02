/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NORTHLINE — the scroll engine.
 *
 * PORTED, NOT REWRITTEN. This is the approved design's own requestAnimationFrame
 * class, moved out of the original design prototype runtime with two changes: the class shell,
 * and the studio colour literals swapped for StrataLanding's. Every easing, every
 * window edge, every tuned constant is byte-for-byte what shipped in
 * "Northline Studio v4 APPROVED.dc.html".
 *
 * WHY IT IS NOT FRAMER MOTION. The reason this page feels expensive is the
 * spring-damped copy of scrollTop in tick(): k/c are tuned so one wheel notch
 * takes ~28 frames to settle instead of 4. useScroll gives you the raw value and
 * you lose the glide. Do not "modernise" this.
 *
 * HOW IT ATTACHES. Pure DOM, via attributes the React tree emits:
 *   [data-nl="root"]        engine scope
 *   [data-nlstage="name"]   a pinned scene; supplies its own 0..1 progress
 *   [data-anim="key"]       node cache key -> this.n[key] is an ARRAY
 *   [data-tone="dark"]      nav inverts when this band crosses y=46
 *   [data-para="0.045"]     generic parallax
 *   [data-cursor="Label"]   cursor ring label
 *   [data-magnet]           magnetic hover
 *   [data-in]/[data-out]    band() window
 *
 * THE ONE-WRITER LAW. An element driven from here must NEVER also carry
 * data-row / data-fade / data-reveal / data-wm / data-rule — a running CSS
 * animation beats an inline transform and the element will jitter or freeze.
 * scripts/nl-audit.cjs asserts this mechanically.
 *
 * NAME COLLISIONS KILL THIS CLASS SILENTLY. The build notes record that a stray
 * `const q` and a `this.watch` collision each cost a full session. Check before
 * adding a field.
 *
 * Regenerate: node <scratchpad>/nl/port-engine.cjs
 */

export interface NLEngineOptions {
  /** Multiplies every pinned stage's authored height. 0.6 is the shipped pace. */
  scrollPace?: number;
  /** Set false to disable the engine's own wheel smoothing. */
  smoothScroll?: boolean;
  cameraZoom?: number;
  frameTilt?: number;
  /** Desktop labelled cursor. Off under coarse pointer / reduced motion. */
  customCursor?: boolean;
  /** In-scene journey annotations; hidden on narrow viewports. */
  showAnnotations?: boolean;
}

export class NLEngine {
  /* The engine assigns ~90 fields dynamically across its scenes; an index
     signature is the honest way to type a ported imperative driver. */
  [key: string]: any;

  opts: NLEngineOptions;
  /** data-anim key -> matching elements. Always an array, never a single node. */
  n: Record<string, any[]>;
  stages: any[];

  constructor(opts: NLEngineOptions = {}) {
    this.opts = opts;
    this.n = {};
    this.stages = [];
  }

  /** The accent, resolved against whichever ground the chrome is currently over. */
  acc() {
    return this.frameDark ? "#22d3ee" : "#0891b2";
  }


  cl(v: any, a: any, b: any) { return v < a ? a : v > b ? b : v; }
  ez(t: any) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  eo(t: any) { return 1 - Math.pow(1 - t, 3); }
  ex(t: any) { return t >= 1 ? 1 : 1 - Math.pow(2, -9 * t); }
  ei(t: any) { return t <= 0 ? 0 : Math.pow(2, 9 * (t - 1)); }
  eb(t: any) { const c = 1.42; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  eq(t: any) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  seg(p: any, a: any, b: any) { return this.cl((p - a) / (b - a), 0, 1); }
  kf(p: any, st: any) {
    if (p <= st[0][0]) return st[0][1];
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], b = st[i + 1];
      if (p <= b[0]) return a[1] + (b[1] - a[1]) * this.ez(this.cl((p - a[0]) / (b[0] - a[0]), 0, 1));
    }
    return st[st.length - 1][1];
  }
  mix(c1: any, c2: any, t: any) {
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t), g = Math.round(c1[1] + (c2[1] - c1[1]) * t), b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  band(el: any, p: any) {
    const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
    const inT = a > 0 ? this.seg(p, a, a + 0.035) : 1;
    return this.eo(this.cl(Math.min(inT, 1 - this.seg(p, b - 0.035, b)), 0, 1));
  }
  /* selection: eases in and STAYS (a chip you picked stays picked) */
  sel(el: any, p: any, a: any, b: any, from: any, to: any, fromFg?: any, toFg?: any) {
    const w = b - a;
    const t = this.ez(this.cl((p - a) / (w * 0.62), 0, 1));
    const dip = Math.sin(this.cl((p - a) / w, 0, 1) * Math.PI);
    el.style.background = this.mix(from, to, t);
    if (fromFg) el.style.color = this.mix(fromFg, toFg, t);
    el.style.transform = 'scale(' + (1 - 0.035 * dip).toFixed(4) + ')';
    el.style.transition = 'none';
    return t;
  }

  /* momentary press: down fast, release with back-out overshoot */
  tap(el: any, p: any, a: any, b: any, base: any, active: any) {
    const w = b - a;
    const u = this.cl((p - a) / w, 0, 1);
    const down = this.cl(u / 0.34, 0, 1);
    const up = this.cl((u - 0.34) / 0.66, 0, 1);
    const press = down * (1 - this.eb(up));
    el.style.background = this.mix(base, active, press);
    el.style.transform = 'scale(' + (1 - 0.052 * press).toFixed(4) + ')';
    el.style.transition = 'none';
    return press;
  }

  /* human typing rhythm — per-char weights, cached, monotonic */
  typeInto(el: any, p: any, a: any, b: any) {
    const txt = el.dataset.text || '';
    if (el.__tw !== txt) {
      el.__tw = txt;
      const acc: any[] = [];
      let sum = 0;
      for (let i = 0; i < txt.length; i++) {
        const r = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
        sum += 0.55 + 1.5 * r + (txt[i] === ' ' ? 0.9 : 0);
        acc.push(sum);
      }
      el.__tt = acc.map((v: any) => v / (sum || 1));
    }
    const u = this.cl((p - a) / (b - a), 0, 1);
    const thr = el.__tt || [];
    let cnt = 0;
    while (cnt < thr.length && thr[cnt] <= u) cnt++;
    const next = txt.slice(0, cnt);
    if (el.textContent !== next) el.textContent = next;
  }
  num(n: any) { return n.toLocaleString('en-US'); }

  mount() {
    this.n = this.n || {};
    this.stages = this.stages || [];
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    try { this.boot(); }
    catch (e: any) { console.error('BOOT THREW', e); }
    // WATCHDOG — a React double-mount can cancel the rAF handle the second mount just
    // created, leaving the page fully styled with zero motion (the silent failure that
    // has cost several sessions). Re-arm whenever no frame has run since the last check.
    this.watch = setInterval(() => {
      const f = this.frames || 0;
      if (f === this.lastWatch) { try { cancelAnimationFrame(this.raf); } catch (e: any) {} this.raf = requestAnimationFrame(this.loop); }
      this.lastWatch = f;
    }, 400);
    // No visible failure badge: it false-positived on a cold load (the rAF loop had
    // not ticked yet) and then never removed itself, so the page told the user its
    // engine was offline while animating perfectly. A dev aid must never be able to
    // reach the delivered page — document.title carries the diagnostic instead.
  }

  boot() {
    this.n = {};
    this.onResize = () => { this.fit(); try { this.layout(); } catch (e: any) {} this.measure(); this.update(); };
    window.addEventListener('resize', this.onResize);
    this.onScroll = () => this.update();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    this.onPointer = (e: any) => {
      const px = this.cx, py = this.cy;
      this.cx = e.clientX; this.cy = e.clientY;
      if (this.sess && px != null) this.sess.dist += Math.abs(this.cx - px) + Math.abs(this.cy - py);
      this.cursorHit(e); this.magnet(e);
    };
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.cx = (window.innerWidth || 1200) / 2; this.cy = (window.innerHeight || 800) / 2;
    this.rx = this.cx; this.ry = this.cy;
    this.t0 = performance.now();
    this.vel = 0; this.marqX = 0; this.lastNavY = 0; this.navHidden = false;
    const sc0 = document.scrollingElement || document.documentElement;
    this.sTarget = sc0.scrollTop; this.sCur = this.sTarget; this.lastSet = sc0.scrollTop; this.stuck = 0;
    // Smooth wheel scrolling. The resync rule in tick() is what makes this safe: it only
    // adopts the browser's position AT REST, never while driving, and killSmooth() hands
    // scrolling straight back if three consecutive frames fail to move the page.
    this.smooth = this.opts.smoothScroll !== false && !!(window.matchMedia
      && window.matchMedia('(pointer:fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (this.smooth) {
      this.onWheel = (e: any) => {
        if (e.ctrlKey || e.metaKey || !this.smooth) return;
        const sc = document.scrollingElement || document.documentElement;
        const max = Math.max(0, sc.scrollHeight - window.innerHeight);
        if (max < 10) { this.killSmooth(); return; }
        e.preventDefault();
        this.sTarget = this.cl(this.sTarget + e.deltaY * (e.deltaMode === 1 ? 22 : 1), 0, max);
      };
      window.addEventListener('wheel', this.onWheel, { passive: false });
      this.onClick = (e: any) => {
        const a = e.target && (e.target as any).closest ? (e.target as any).closest('a[href^="#"]') : null;
        if (!a) return;
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        const sc = document.scrollingElement || document.documentElement;
        const max = Math.max(0, sc.scrollHeight - window.innerHeight);
        this.sTarget = this.cl(t.getBoundingClientRect().top + (window.scrollY || 0) - 8, 0, max);
      };
      document.addEventListener('click', this.onClick, true);
    }
    this.collect();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.poll = setInterval(() => this.collect(), 400);
    this.stopPoll = setTimeout(() => clearInterval(this.poll), 9000);
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    clearInterval(this.poll);
    clearTimeout(this.stopPoll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('pointermove', this.onPointer);
    if (this.onWheel) window.removeEventListener('wheel', this.onWheel);
    if (this.onClick) document.removeEventListener('click', this.onClick, true);
    if (this.onExit) document.documentElement.removeEventListener('pointerleave', this.onExit);
  }

  collect() {
    const root = document.querySelector('[data-nl="root"]') as any;
    if (!root) return;
    this.root = root;
    const n: Record<string, any[]> = {};
    root.querySelectorAll('[data-anim]').forEach((el: any) => {
      const k = el.getAttribute('data-anim');
      (n[k] = n[k] || []).push(el);
    });
    this.n = n;
    this.stages = Array.prototype.slice.call(root.querySelectorAll('[data-nlstage]'));
    this.bgEls = null;
    this.darkBands = Array.prototype.slice.call(root.querySelectorAll('[data-tone="dark"]'));
    this.magnets = Array.prototype.slice.call(root.querySelectorAll('[data-magnet]'));
    const pace = this.opts.scrollPace || 1;
    const j = root.querySelector('[data-nlstage="journey"]') as HTMLElement | null;
    if (j) j.style.height = Math.round(760 * pace) + 'vh';
    if (n.spineline && !this.spineLen) {
      try { this.spineLen = n.spineline[0].getTotalLength(); } catch (e: any) { this.spineLen = 0; }
      if (this.spineLen) {
        n.spineline[0].style.strokeDasharray = this.spineLen;
        n.spineline[0].style.strokeDashoffset = this.spineLen;
        if (n.node) n.node.forEach((el: any) => {
          const pt = n.spineline[0].getPointAtLength(this.spineLen * parseFloat(el.dataset.at));
          const xp = pt.x / 1240 * 100;
          el.style.left = xp + '%';
          el.style.top = (pt.y / 300 * 100) + '%';
          // The node is a ZERO-SIZE anchor sitting exactly on the path; the dot is offset
          // from it and the label is pushed clear. The old markup centred the whole column
          // on the point, which put the dot off the line and ran the label straight through
          // the curve. Label goes below a peak and above a trough — always into open air —
          // and anchors left/right instead of centring when it is near an edge.
          const lab = el.querySelector('[data-nlab]');
          if (!lab) return;
          const win = el.dataset.win;
          lab.style.top = (pt.y < 150 ? (win ? 19 : 17) : (win ? -32 : -30)) + 'px';
          lab.style.transform = xp < 13 ? 'translateX(-4px)' : xp > 87 ? 'translateX(-100%) translateX(4px)' : 'translateX(-50%)';
        });
      }
    }
    if (n.calcin && !this.calcWired) {
      this.calcWired = true;
      this.calc = { v: 3000, r: 12, c: 780 };
      n.calcin.forEach((el: any) => {
        el.addEventListener('input', () => {
          this.calc[el.dataset.k] = parseFloat(el.value);
          this.paintCalc();
        });
      });
      this.paintCalc();
    }
    if (n.cmp && !this.cmpWired) {
      this.cmpWired = true;
      const box = n.cmp[0];
      const set = (clientX: any) => {
        const r = box.getBoundingClientRect();
        const x = this.cl((clientX - r.left) / r.width, 0.04, 0.96);
        if (this.n.cmptop) this.n.cmptop[0].style.clipPath = 'inset(0 0 0 ' + (x * 100) + '%)';
        if (this.n.cmphandle) this.n.cmphandle[0].style.left = (x * 100) + '%';
      };
      box.addEventListener('pointerdown', (e: any) => { this.cmpTouched = true; this.cmpDrag = true; box.setPointerCapture(e.pointerId); set(e.clientX); });
      box.addEventListener('pointermove', (e: any) => { if (this.cmpDrag) set(e.clientX); });
      box.addEventListener('pointerup', () => { this.cmpDrag = false; });
      box.addEventListener('pointercancel', () => { this.cmpDrag = false; });
    }
    try { this.wireBlueprint(); } catch (e: any) {}
    try { this.wireSess(); } catch (e: any) {}
    this.fit();
    // after the journey's height has been written from scrollPace, so layout() caches
    // the real wide value rather than a placeholder
    try { this.layout(); } catch (e: any) {}
    this.measure();
  }

  paintCalc() {
    const n = this.n, c = this.calc;
    /* THE AFTER-RATE IS THE READER'S, NOT OURS. This was a literal 6.4, which
       the source captioned "the median across the last eleven builds" — a
       benchmark StrataLanding has never measured. The worksheet now carries a
       fourth slider ([data-k="a"], tenths of a percent like `r`) so the visitor
       sets the rate they are aiming for and every figure below it is a model of
       their own inputs. 30 (= 3.0%) is only the fallback for the frame before
       the first input event fires, because collect() seeds this.calc without
       `a`; it must stay in step with the slider default in Math.tsx. */
    const rate = c.r / 10, after = (c.a == null ? 30 : c.a) / 10;
    const now = c.v * rate / 100, aft = c.v * after / 100;
    const gap = Math.max(0, (aft - now) * c.c);
    if (n.calcv) n.calcv[0].textContent = this.num(c.v);
    if (n.calcr) n.calcr[0].textContent = rate.toFixed(1) + '%';
    if (n.calcc) n.calcc[0].textContent = '$' + this.num(c.c);
    if (n.calca) n.calca[0].textContent = after.toFixed(1) + '%';
    this.calcT = { now: now, aft: aft, gap: gap };
    if (!this.calcD) { this.calcD = { now: now, aft: aft, gap: gap }; this.tickCalc(true); }
  }

  tickCalc(force?: any) {
    const n = this.n, t = this.calcT, d = this.calcD;
    if (!t || !d) return;
    let moved = false;
    const keys = ['now', 'aft', 'gap'];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i], gapv = t[k] - d[k];
      if (Math.abs(gapv) > 0.4) { d[k] += gapv * 0.14; moved = true; } else if (d[k] !== t[k]) { d[k] = t[k]; moved = true; }
    }
    if (!moved && !force) return;
    if (n.calcnow) n.calcnow[0].textContent = this.num(Math.round(d.now));
    if (n.calcafter) n.calcafter[0].textContent = this.num(Math.round(d.aft));
    if (n.calcgap) n.calcgap[0].textContent = '$' + this.num(Math.round(d.gap));
    if (n.calcpay) {
      /* The build cost used to be a literal 9600. It is now read off the node's
         data-build, which Math.tsx writes from the highest tier in brand.ts —
         so the payback figure cannot drift from published pricing, and this
         file keeps no price of its own. */
      const build = parseFloat(n.calcpay[0].dataset.build) || 0;
      const days = (build > 0 && d.gap > 0) ? Math.max(1, Math.round(build / (d.gap / 30))) : 999;
      n.calcpay[0].textContent = days > 365 ? '—' : days + (days === 1 ? ' day' : ' days');
    }
  }

  magnet(e: any) {
    if (!this.magnets) return;
    for (let i = 0; i < this.magnets.length; i++) {
      const el = this.magnets[i];
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const reach = Math.max(r.width, r.height) * 1.15 + 40;
      if (d < reach) {
        const k = (1 - d / reach) * 0.32;
        el.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
      } else if (el.style.transform) {
        el.style.transform = '';
      }
    }
  }

  // Narrow viewports. Inline-only styling means no media queries, so the breakpoint
  // lives here: every [data-nrw] grid collapses to the column spec in its attribute,
  // and the pinned scenes give back most of their scroll — 900vh of pinned deck on a
  // phone is punishment, not cinema. Idempotent; called from collect() and on resize.
  layout() {
    if (!this.root) return;
    const w = window.innerWidth || 1200;
    const narrow = w < 1040;
    this.narrow = narrow;
    const g = this.root.querySelectorAll('[data-nrw]');
    for (let i = 0; i < g.length; i++) {
      const el = g[i];
      const spec = el.getAttribute('data-nrw');
      if (spec === 'skip') continue;
      if (el.__gtc == null) { el.__gtc = el.style.gridTemplateColumns || ''; el.__gap = el.style.gap || ''; }
      el.style.gridTemplateColumns = narrow ? spec : el.__gtc;
      el.style.gap = narrow ? '20px' : el.__gap;
    }
    // A pinned 100vh scene cannot stack — there is no vertical room to stack INTO, and
    // halving the section height only shortens scroll, not the frame. So the anatomy
    // scene stays two-column and its ledger shrinks instead: the deck is the point.
    const led = this.root.querySelector('[data-analedger]');
    if (led) {
      if (led.__k == null) { led.__k = 1; led.__rows = led.querySelectorAll('[data-anim="chrow"]'); }
      const tiny = narrow || (window.innerHeight || 800) < 620;
      led.style.gap = tiny ? '6px' : '13px';
      for (let i = 0; i < led.__rows.length; i++) {
        const r = led.__rows[i];
        r.style.padding = tiny ? '4px 0' : '10px 0';
        const sub = r.children[1] && r.children[1].children[1];
        if (sub) sub.style.display = tiny ? 'none' : '';
      }
      const h2 = led.querySelector('h2');
      if (h2) h2.style.display = tiny ? 'none' : '';
    }
    for (let i = 0; i < this.stages.length; i++) {
      const s = this.stages[i];
      const cur = parseFloat(s.style.height) || 0;
      if (!cur) continue;
      if (!narrow) { if (s.__wideH) { s.style.height = s.__wideH; s.__wideH = null; } continue; }
      // Most pinned scenes can give back half their scroll on a narrow screen. #anatomy
      // cannot: it spends its travel on FIVE sequential holds, and at 0.5 each hold is
      // ~18vh — the layers cross-fade through each other instead of presenting one at a
      // time, which is exactly the "they all mush together" defect. Per-section override.
      const f = parseFloat(s.getAttribute('data-nrwh')) || 0.5;
      if (!s.__wideH) { s.__wideH = s.style.height; s.style.height = Math.round(cur * f) + 'vh'; }
    }
    this.stageTops = null;
  }

  measure() {
    const y = window.scrollY || 0;
    this.stageTops = (this.stages || []).map((el: any) => el.getBoundingClientRect().top + y);
  }

  fit() {
    const w = window.innerWidth || 1200, h = window.innerHeight || 800;
    this.scale = Math.min((w * 0.80) / 1060, (h * 0.65) / 662, 1.0);
    this.pscale = Math.min((w * 0.88) / 1180, (h * 0.78) / 700, 1.0);
  }

  killSmooth() {
    this.smooth = false;
    if (this.onWheel) { window.removeEventListener('wheel', this.onWheel); this.onWheel = null; }
    this.vel = 0;
  }

  loop() {
    this.raf = requestAnimationFrame(this.loop);
    try { this.tick(); } catch (e: any) {
      if (!this.tickErr) { this.tickErr = 1; console.error('LOOP THREW', e); }
    }
    this.update();
    return;
  }

  // the scroll spring, isolated so a throw in it can never stop the frame
  tick() {
    if (this.smooth) {
      const sc = document.scrollingElement || document.documentElement;
      const max = Math.max(0, sc.scrollHeight - window.innerHeight);
      const y = sc.scrollTop;
      const d = this.sTarget - this.sCur;
      if (Math.abs(d) < 0.4) {
        // AT REST is the ONLY safe moment to adopt the browser's position. The old code
        // resynced every frame on a 3px tolerance, so any disagreement between what we
        // wrote and what the browser reported wiped the pending delta and the page
        // simply would not scroll. Never resync while actively driving.
        // lastSet MUST be refreshed here. It is the baseline the "moved by something
        // else" test below compares against; if it is ever stale (it initialised to
        // -9999) that test is true on the first drive frame, resyncs, and wipes the
        // pending wheel delta — and because the drive branch is never reached, lastSet
        // never updates and the page can NEVER scroll. That was the whole bug, twice.
        this.sTarget = y; this.sCur = y; this.lastSet = y; this.vel *= 0.85; this.stuck = 0;
      } else if (Math.abs(y - this.lastSet) > 14) {
        // moved by something that isn't us — scrollbar drag, keyboard, find-in-page
        this.sTarget = y; this.sCur = y; this.stuck = 0;
      } else {
        const before = y;
        this.sCur += d * 0.13;
        this.vel = this.vel * 0.82 + d * 0.18;
        this.lastSet = Math.round(this.sCur);
        sc.scrollTop = this.sCur;
        // hard safety: if we cannot actually move the page, hand scrolling straight back
        if (Math.abs(sc.scrollTop - before) < 0.5 && Math.abs(d) > 2 && max > 10) {
          if ((this.stuck = (this.stuck || 0) + 1) > 3) this.killSmooth();
        } else { this.stuck = 0; }
      }
    }
    const sc2 = document.scrollingElement || document.documentElement;
    const real = sc2.scrollTop;
    if (this.sy == null) this.sy = real;
    const nowT = performance.now();
    const dt = this.cl((nowT - (this.lastT || nowT)) / 16.667, 0.5, 3);
    this.lastT = nowT;
    const d2 = real - this.sy;
    /* spring-damper: acceleration toward target, heavy damping. k/c tuned so a
       single wheel notch takes ~28 frames to settle instead of 4 — this is the
       difference between "stepping" and "gliding". */
    this.sv = (this.sv || 0) * Math.pow(0.58, dt) + d2 * 0.055 * dt;
    this.sy += this.sv * dt;
    this.svel = this.sv;
    if (Math.abs(d2) < 0.25 && Math.abs(this.sv) < 0.25) { this.sy = real; this.sv = 0; }
    this.update();
  }

  cursorHit(e: any) {
    const n = this.n;
    if (!n.curringinner) return;
    const t = e.target && (e.target as any).closest ? (e.target as any).closest('[data-cursor],a,input[type=range]') : null;
    let label = '';
    if (t) label = t.getAttribute('data-cursor') || (t.tagName === 'A' ? '\u2192' : t.tagName === 'INPUT' ? 'Pull' : '');
    if (this.curLabel === label) return;
    this.curLabel = label;
    const big = !!label;
    const inner = n.curringinner[0];
    const size = big ? (label.length > 2 ? 74 : 56) : 40;
    inner.style.width = size + 'px';
    inner.style.height = size + 'px';
    inner.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
    inner.style.background = big ? this.acc() : 'rgba(8,145,178,0)';
    inner.style.borderColor = big ? this.acc() : 'rgba(8,145,178,0.85)';
    if (n.curlabel) { n.curlabel[0].textContent = label; n.curlabel[0].style.opacity = big ? '1' : '0'; }
  }

  // WHOLE-PAGE SCROLL PHYSICS. The five pinned scenes were cinematic while the nine static
  // sections had nothing but one-shot CSS entrances — 60% of the page was inert once seen.
  // This makes every static section respond continuously to scroll POSITION and VELOCITY,
  // so scrubbing back and forth animates instead of sitting still.
  statics(vh: any) {
    if (!this.stx || !this.stx.length || !this.stx[0].isConnected) {
      this.stx = Array.prototype.slice.call(document.querySelectorAll('section:not([data-nlstage])') as any);
      this.stH = Array.prototype.slice.call(document.querySelectorAll('section:not([data-nlstage]) h1, section:not([data-nlstage]) h2') as any);
      this.stM = Array.prototype.slice.call(document.querySelectorAll('[data-para]') as any);
    }
    // velocity from REAL scroll, not the spring — the spring only runs when smoothScroll
    // is on, and it is off by default, which would leave every velocity effect dead
    const v = this.rvel || 0;
    const sk = this.cl(v * 0.017, -1.15, 1.15);
    for (let i = 0; i < this.stx.length; i++) {
      const el = this.stx[i];
      const r = el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      // the page BENDS when you fling it and settles flat when you stop
      el.style.transform = sk > 0.008 || sk < -0.008 ? 'skewY(' + sk.toFixed(3) + 'deg)' : '';
    }
    const tight = -this.cl(Math.abs(v) * 0.022, 0, 1.5);
    for (let i = 0; i < this.stH.length; i++) {
      const h = this.stH[i];
      const r = h.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      if (h.__ls0 == null) h.__ls0 = parseFloat(getComputedStyle(h).letterSpacing) || 0;
      // display type tracks tighter the faster you move, and drifts across as it passes
      const t = this.cl((vh - r.top) / (vh + r.height), 0, 1);
      h.style.letterSpacing = (h.__ls0 + tight).toFixed(2) + 'px';
      h.style.transform = 'translate3d(' + ((0.5 - t) * 30).toFixed(1) + 'px,0,0)';
      h.style.transition = 'none';
    }
    // ledger heads counter-drift against the headings so the two registers separate
    for (let i = 0; i < this.stM.length; i++) {
      const m = this.stM[i];
      const r = m.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      const k = parseFloat(m.dataset.para) || 0;
      const off = (r.top + r.height / 2 - vh / 2) / vh;
      m.style.transform = 'translate3d(' + (-off * 26).toFixed(1) + 'px,' + (off * k * vh).toFixed(1) + 'px,0)';
    }
  }

  // BLUEPRINT MODE. The studio's whole argument is that structure decides the outcome —
  // so the page can show its own. Toggle from the nav or press G.
  wireBlueprint() {
    if (this.bpWired) return;
    const t = document.querySelector('[data-anim="bptoggle"]') as any;
    if (!t) return;
    this.bpWired = 1;
    const go = () => this.setBlueprint(!this.blue);
    t.addEventListener('click', go);
    this.onKey = (e: any) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA') return;
      go();
    };
    window.addEventListener('keydown', this.onKey);
  }

  setBlueprint(on: any) {
    this.blue = on;
    try { if (on) this.sflag('blueprint_open', 'the reader opened the grid overlay'); } catch (e: any) {}
    const g = document.querySelector('[data-anim="bpgrid"]') as any;
    if (g) g.style.opacity = on ? '1' : '0';
    const d = document.querySelector('[data-anim="bpdot"]') as any;
    if (d) d.style.background = on ? this.acc() : '#6b7a92';
    const l = document.querySelector('[data-anim="bplabel"]') as any;
    if (l) l.style.color = on ? this.acc() : '#5a6a85';
    // curated selector, cached once — outlining every node would cost a full restyle
    if (!this.bpNodes) {
      this.bpNodes = Array.prototype.slice.call(
        document.querySelectorAll('section h1, section h2, section h3, section > div > p, [data-row], [data-spec], [data-fade]') as any);
    }
    for (let i = 0; i < this.bpNodes.length; i++) {
      const e = this.bpNodes[i];
      e.style.outline = on ? '1px dashed rgba(8,145,178,0.45)' : '';
      e.style.outlineOffset = on ? '4px' : '';
    }
  }

  hex(h: any) {
    if (!this.__hx) this.__hx = {};
    if (this.__hx[h]) return this.__hx[h];
    const v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    this.__hx[h] = v;
    return v;
  }

  // ONE continuous colour field behind everything. Fourteen sections used to hard-cut
  // between bone / panel / ink; now the field lerps across each seam, so the page reads
  // as one surface changing temperature rather than a stack of differently-painted boxes.
  bgfield(vh: any) {
    const n = this.n;
    // Do NOT trust the node cache for this one. collect() only polls for the first ~9s,
    // so an element added to the template after that is never cached — n.field stays
    // undefined and the field silently never paints. Same failure the footer clock had.
    if (!this.fieldEl || !this.fieldEl.isConnected) {
      this.fieldEl = (n.field && n.field[0]) || document.querySelector('[data-anim="field"]') as any;
    }
    const fe = this.fieldEl;
    if (!fe) {
      // Every section is transparent now, so a missing field means invisible text, not a
      // wrong-but-readable page. Degrade to the old hard cuts rather than to nothing.
      if (!this.bgFallback) {
        this.bgFallback = 1;
        const q = document.querySelectorAll('[data-bg]') as any;
        for (let i = 0; i < q.length; i++) q[i].style.background = q[i].getAttribute('data-bg');
      }
      return;
    }
    // Queried fresh every frame, never cached: a hot reload leaves orphaned references
    // whose rects are all zeros, and the field then silently freezes on its last colour.
    // Fourteen rect reads is nothing next to losing the page's base colour.
    // document, NOT this.root — #receipts, #refusal, #pricing and #start are not
    // descendants of [data-nl="root"], so a root-scoped scan saw only 10 of 14 bands and
    // froze on bone for the whole tail of the page. Same trap the footer clock fell into.
    const els = document.querySelectorAll('[data-bg]') as any;
    if (!els.length) return;
    const mid = vh * 0.42, SEAM = 300;
    // "last band whose top has passed mid" — a containment test can fall through a gap
    // between sections and leave the field stale; this cannot miss.
    let ci = 0, curR = null;
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (r.top > mid) break;
      ci = i; curR = r;
    }
    if (!curR) curR = els[0].getBoundingClientRect();
    const a = this.hex(els[ci].getAttribute('data-bg'));
    const nx = els[ci + 1];
    const d = curR.bottom - mid;
    // The blend window must never exceed HALF the band it is blending out of. A fixed
    // 300px seam ate the 71px marquee whole — the field went bone while the strip was
    // still on screen, so its #fbf9f4 text sat at 1.12:1. Every other band is >600px.
    const seam = Math.min(SEAM, curR.height * 0.5);
    // d goes negative when mid sits in a GAP between bands (the marquee is 71px of flow
    // that deliberately owns no band). A negative d means the transition to the next band
    // is already complete, so cl() pins the factor at 1 and the gap shows the NEXT colour.
    // Do NOT re-add a `d >= 0` guard: it routes gaps to the solid branch and the field
    // jumps BACKWARDS to the previous band. `nx` already covers the last band.
    const col = (d < seam && nx)
      ? this.mix(a, this.hex(nx.getAttribute('data-bg')), this.ez(this.cl(1 - d / seam, 0, 1)))
      : 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
    if (col !== this.__field) { this.__field = col; fe.style.background = col; }
  }

  shell(doc: any, vh: any) {
    const n = this.n, now = performance.now();
    // FIRST thing in shell(), deliberately. It used to sit last, after the nav, rail,
    // tickCalc and event-ticker blocks, and never ran — the footer shipped a dead
    // "--:--:--". Anything that must always paint goes before anything that might not.
    if (!this.clockAt || now - this.clockAt > 1000) {
      this.clockAt = now;
      // NOTE: this node lives OUTSIDE [data-nl="root"], so collect() (which only scans
      // inside root) can never cache it and a root-scoped fallback fails too. Query the
      // document. That single scoping detail is why the footer clock was dead.
      const ck = (n.clock && n.clock[0]) || document.querySelector('[data-anim="clock"]') as any;
      if (ck) ck.textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour12: false });
    }
    if (n.introcount) {
      const v = Math.round(this.eo(this.cl((now - this.t0) / 1520, 0, 1)) * 100);
      const s = (v < 10 ? '0' : '') + v;
      if (n.introcount[0].textContent !== s) n.introcount[0].textContent = s;
    }
    if (n.intro && now - this.t0 > 2800 && n.intro[0].style.display !== 'none') n.intro[0].style.display = 'none';
    if (this.opts.customCursor === false && n.curdot && n.curdot[0].style.display !== 'none') {
      n.curdot[0].style.display = 'none';
      if (n.curring) n.curring[0].style.display = 'none';
      if (this.root) this.root.style.cursor = 'auto';
    }
    if (n.curdot && window.innerWidth > 1000 && this.opts.customCursor !== false) {
      this.rx += (this.cx - this.rx) * 0.17;
      this.ry += (this.cy - this.ry) * 0.17;
      n.curdot[0].style.transform = 'translate(' + (this.cx - 3.5) + 'px,' + (this.cy - 3.5) + 'px)';
      if (n.curring) n.curring[0].style.transform = 'translate(' + this.rx + 'px,' + this.ry + 'px)';
    }
    if (n.marq) {
      // MARQUEE PHYSICS. It used to read this.vel — the smooth-scroll spring, which is off
      // by default, so the strip crawled at a constant 0.6px whatever you did. It now rides
      // the real scroll velocity: fling it and the strip tears past, scroll up and it runs
      // backwards. rvel is clamped so a trackpad flick can't teleport it a full cycle.
      const w = (n.marq[0].scrollWidth || 2) / 2;
      const mv = this.cl((this.rvel || 0) + (this.vel || 0) * 0.35, -74, 74);
      this.marqX = (this.marqX - 0.55 - mv * 0.30) % w;
      if (this.marqX > 0) this.marqX -= w;
      n.marq[0].style.transform = 'translateX(' + this.marqX + 'px) skewX(' + this.cl(mv * -0.09, -7, 7) + 'deg)';
    }
    const y = doc.scrollTop;
    if (n.nav) {
      if (y > this.lastNavY + 5 && y > vh * 0.85) this.navHidden = true;
      else if (y < this.lastNavY - 5) this.navHidden = false;
      n.nav[0].style.transition = 'transform .55s cubic-bezier(.16,.84,.28,1), background .5s ease, border-color .5s ease';
      n.nav[0].style.transform = this.navHidden ? 'translateY(-104%)' : 'none';
      this.lastNavY = y;
    }
    if (n.rail) {
      n.rail[0].style.opacity = (y > vh * 0.5 && window.innerWidth > 1140) ? '1' : '0';
      if (!this.railEls) this.railEls = Array.prototype.slice.call(this.root.querySelectorAll('[data-rail]'));
      let active = null;
      for (let i = 0; i < this.railEls.length; i++) {
        const sec = document.getElementById(this.railEls[i].getAttribute('data-rail'));
        if (!sec) continue;
        const r = sec.getBoundingClientRect();
        if (r.top <= vh * 0.45 && r.bottom > vh * 0.45) active = this.railEls[i];
      }
      for (let i = 0; i < this.railEls.length; i++) {
        const on = this.railEls[i] === active;
        this.railEls[i].style.color = on ? this.acc() : '#6b7a92';
        const ln = this.railEls[i].querySelector('[data-railline]');
        if (ln) { ln.style.width = on ? '30px' : '14px'; ln.style.background = on ? this.acc() : '#6b7a92'; }
      }
    }
    this.tickCalc();

  }

  update() {
    this.frames = (this.frames || 0) + 1;
    try { this.run(); }
    catch (e: any) {
      if (!this.engineErr) {
        this.engineErr = String(e && e.stack || e);
        console.error('ENGINE THROW', e);
        try { document.title = 'ENGINE: ' + (e && e.message || e); } catch (e2: any) {}
      }
    }
  }

  run() {
    if (!this.root) return;
    const doc = document.scrollingElement || document.documentElement;
    const vh = window.innerHeight || 800;
    const real = doc.scrollTop;
    if (this.sy == null || Math.abs(real - this.sy) > vh * 1.2) this.sy = real;
    const sy = this.sy;
    this.frT = null;
    this.frOwner = null;
    if (!this.stages || !this.stages.length) {
      this.stages = Array.prototype.slice.call(this.root.querySelectorAll('[data-nlstage]'));
      this.stageTops = null;
    }
    if (!this.stageTops || this.stageTops.length !== this.stages.length) this.measure();
    // stageTops is cached, but the journey's height is written from a prop in collect()
    // and section heights can change after load — so any stale cache silently shifts
    // every scene's progress. Re-measure whenever the first stage has drifted.
    // Section heights change after load (the journey's is written from a prop in
    // collect()), and a stale cache silently shifts every scene's progress. Five
    // rect reads every 20 frames is nothing; a wrong offset costs the whole scene.
    if ((this.mtick = (this.mtick || 0) + 1) % 20 === 0) this.measure();
    const dp = this.cl(sy / Math.max(1, doc.scrollHeight - doc.clientHeight), 0, 1);
    if (this.n.progbar) this.n.progbar[0].style.transform = 'scaleX(' + dp + ')';
    // its own try/catch, and called before the scene loop — the page's base colour must
    // never be starved by a throw somewhere downstream in a scene
    this.rvel = (this.rvel || 0) * 0.72 + (real - (this.lastReal == null ? real : this.lastReal)) * 0.28;
    this.lastReal = real;
    try { this.bgfield(vh); } catch (e: any) {}
    try { this.statics(vh); } catch (e: any) {}
    try { this.scramble(vh); } catch (e: any) {}
    try { this.sheets(vh); } catch (e: any) { if (!this.shErr) { this.shErr = 1; console.error('SHEETS THREW', e); } }
    try { this.session(vh, doc); } catch (e: any) { if (!this.sessErr) { this.sessErr = String(e && e.stack || e); console.error('SESSION THROW', e); } }
    if (!this.stages || !this.stages.length) { try { this.collect(); } catch (e: any) {} }
    this.frameDark = false;
    if (this.darkBands) for (let i = 0; i < this.darkBands.length; i++) {
      const br = this.darkBands[i].getBoundingClientRect();
      if (br.top <= 46 && br.bottom > 46) { this.frameDark = true; break; }
    }
    for (let i = 0; i < this.stages.length; i++) {
      const s = this.stages[i];
      const h = s.offsetHeight, rel = sy - (this.stageTops[i] || 0);
      if (rel < -vh - 300 || rel > h + 300) continue;
      const p = this.cl(rel / Math.max(1, h - vh), 0, 1);
      const sticky = s.firstElementChild as any;
      if (sticky) {
        const f = this.ei(this.cl((p - 0.95) / 0.05, 0, 1));
        sticky.style.opacity = String(1 - f * 0.94);
        sticky.style.filter = f > 0.02 ? 'blur(' + (f * 9).toFixed(2) + 'px)' : 'none';
        sticky.style.transform = f > 0.02 ? 'scale(' + (1 - f * 0.035).toFixed(4) + ')' : 'none';
      }
      const name = s.getAttribute('data-nlstage');
      try {
        if (name === 'journey') this.journey(p, rel >= -46 && rel < h - 46);
        else if (name === 'spine') this.spine(p);
        else if (name === 'portal') this.portal(p);
        else if (name === 'process') this.process(p);
        else if (name === 'anatomy') this.anatomy(p);
      } catch (err: any) {
        if (!this.sceneErr) this.sceneErr = {};
        if (!this.sceneErr[name]) { this.sceneErr[name] = String(err); console.error('SCENE ' + name, err); }
      }
    }
    if (!this.paras) this.paras = Array.prototype.slice.call(this.root.querySelectorAll('[data-para]'));
    for (let i = 0; i < this.paras.length; i++) {
      const el = this.paras[i], b = el.getBoundingClientRect();
      if (b.bottom < -80 || b.top > vh + 80) continue;
      const c = (b.top + b.height / 2 - vh / 2) / vh;
      el.style.transform = 'translateY(' + (c * parseFloat(el.dataset.para) * vh).toFixed(1) + 'px)';
    }
    try { this.startFrame(vh); } catch (e: any) {}
    this.chrome(doc, vh);
    this.shell(doc, vh);
    try { this.applyFrame(vh); } catch (e: any) { if (!this.frErr) { this.frErr = 1; console.error('FRAME THROW', e); } }
  }

  chrome(doc: any, vh: any) {
    const n = this.n;
    if (!n.nav) return;
    const dark = this.frameDark === true;
    const solid = doc.scrollTop > vh * 0.5;
    const el = n.nav[0];
    el.style.background = solid ? (dark ? 'rgba(10,23,48,0.82)' : 'rgba(246,243,236,0.86)') : 'rgba(0,0,0,0)';
    el.style.backdropFilter = solid ? 'blur(14px)' : 'none';
    el.style.borderBottomColor = solid ? (dark ? 'rgba(251,249,244,0.12)' : 'rgba(11,27,58,0.12)') : 'rgba(11,27,58,0)';
    if (n.navmark) n.navmark[0].style.color = dark ? '#fbf9f4' : '#071022';
    if (n.navlink) n.navlink.forEach((a: any) => { a.style.color = dark ? '#9aa7bd' : '#5a6a85'; });
  }

  journey(p: any, covers: any) {
    const n = this.n, S = this.seg.bind(this), K = this.kf.bind(this);
    const zoom = this.opts.cameraZoom == null ? 1 : this.opts.cameraZoom;
    const tilt = this.opts.frameTilt == null ? 1 : this.opts.frameTilt;
    const base = this.scale || 0.8;
    const vhJ = window.innerHeight || 800;
    this.framePage('journey');

    const tone = this.cl(K(p, [[0.575, 0], [0.635, 1], [0.775, 1], [0.83, 0]]), 0, 1);
    if (covers) this.frameDark = tone > 0.5;
    if (n.jstick) n.jstick[0].style.background = this.mix([246, 243, 236], [10, 23, 48], tone);
    if (n.grid) {
      n.grid[0].style.opacity = String(1 - tone * 0.55);
      n.grid[0].style.transform = 'translateY(' + (-p * 90) + 'px)';
    }

    if (n.hero) {
      const o = this.ei(S(p, 0.045, 0.125));
      const el = n.hero[0];
      el.style.opacity = String(1 - o);
      el.style.transform = 'translateY(' + (-100 * o) + 'px) scale(' + (1 - 0.1 * o) + ')';
      el.style.filter = o > 0.01 ? 'blur(' + (8 * o) + 'px)' : 'none';
      el.style.pointerEvents = o > 0.5 ? 'none' : 'auto';
    }
    if (n.hline) n.hline.forEach((el: any, i: any) => { el.style.transform = 'none'; });
    if (n.scrollcue) n.scrollcue[0].style.transform = 'translateX(' + (Math.sin(Date.now() / 900) * 60 + 62) + 'px)';

    if (n.ghost) n.ghost.forEach((el: any) => {
      const t = this.band(el, p);
      el.style.opacity = String(t);
      el.style.transform = 'translateX(' + ((0.5 - p) * 260) + 'px)';
    });

    const dockT = this.ez(S(p, 0.795, 0.875));
    {
      // SWING B — the journey no longer OWNS a frame, it PUBLISHES a target rect for the
      // one root-level frame. Every camera keyframe, the scale-through and the dock math
      // are byte-identical to before; what changed is who writes the transform.
      const camS = 1 + K(p, [[0.17, 0], [0.30, 0], [0.42, 0.12], [0.55, 0.14], [0.60, 0.14], [0.73, 0.15], [0.79, 0]]) * (0.22 + 0.78 * zoom);
      const camX = K(p, [[0.17, 0], [0.30, 0], [0.42, 110], [0.55, 86], [0.60, -96], [0.73, -88], [0.79, 0]]) * (0.22 + 0.78 * zoom) * base;
      const camY = K(p, [[0.17, 0], [0.30, -16], [0.42, 22], [0.55, 22], [0.60, 16], [0.73, 8], [0.79, 0]]) * (0.22 + 0.78 * zoom) * base;
      const rx = K(p, [[0.06, 16], [0.17, 0], [0.30, 0], [0.345, 2.5], [0.40, 0]]) * tilt;
      const ry = K(p, [[0.17, -7], [0.30, -2], [0.42, 4], [0.55, 3], [0.60, -3], [0.73, -1], [0.79, 0]]) * tilt;
      const dockTarget = (459 * this.pscale) / (1060 * base);
      const dScale = 1 + (dockTarget - 1) * dockT;
      const dX = -142.5 * this.pscale * dockT, dY = -122.5 * this.pscale * dockT;
      const sk = this.cl((this.svel || this.vel || 0) * 0.030, -2.6, 2.6);
      const lifeY = Math.sin(p * 5.4) * 5.5 + Math.sin(p * 2.1) * 3.5;
      const lifeR = Math.sin(p * 3.7) * 0.55 + Math.sin(p * 1.3) * 0.35;
      // the frame is never faded IN — it waits below the fold behind the hero and rises,
      // so the hero → journey boundary is a move, not an appearance
      const rise = this.ez(S(p, 0.004, 0.145));
      const gone = this.ei(S(p, 0.955, 1));
      // The seed sits just under the hero, not at a fixed fraction: on a short viewport
      // the hero already runs past the fold, so a fixed offset would slice through the
      // instrument strip. When there is no room the seed simply fades in on the rise.
      const seedS = base * 0.62;
      let seedTop = vhJ * 0.70, seedO = 1;
      if (n.hero) {
        const hb = n.hero[0].getBoundingClientRect().bottom;
        seedO = this.cl((vhJ - hb - 12) / 46, 0, 1);
        seedTop = Math.max(hb + 16, vhJ * 0.60);
      }
      const seedY = seedTop + 331 * seedS * 1.15 - vhJ / 2;
      const M = (a: any, b: any) => a + (b - a) * rise;
      this.pubFrame({
        own: 'journey', k: 1, pv: 2200,
        x: M(0, camX + dX),
        y: M(seedY, camY + dY + lifeY * (1 - dockT)) - 26 * gone,
        s: M(seedS, base * camS * dScale) * (1 - 0.035 * gone),
        rx: M(26, rx), ry: M(-8, ry + lifeR * (1 - dockT)), rz: 0, sk: sk * rise,
        o: (1 - gone) * (seedO + (1 - seedO) * rise), z: dockT > 0.05 ? 4 : 6
      });
    }
    if (n.portalLayer) {
      const t = this.ez(S(p, 0.80, 0.87));
      const el = n.portalLayer[0];
      el.style.opacity = String(t);
      el.style.transform = 'scale(' + (this.pscale * (0.94 + 0.06 * t)) + ')';
      el.style.zIndex = '3';
    }
    if (n.dockhint) n.dockhint[0].style.opacity = String(1 - this.ez(S(p, 0.80, 0.85)));

    if (n.url) {
      const u = p < 0.35 ? 'sample-client.example' : p < 0.575 ? 'sample-client.example/book' : p < 0.79 ? 'sample-client.example/checkout' : 'stratalanding.com/portal';
      if (n.url[0].textContent !== u) n.url[0].textContent = u;
    }

    if (n.s1) {
      const t = Math.min(this.eo(S(p, 0.14, 0.17)), 1 - this.eo(S(p, 0.365, 0.40)));
      n.s1[0].style.opacity = String(this.cl(t, 0, 1));
      n.s1[0].style.transform = 'scale(' + (1 + 0.05 * this.eo(S(p, 0.335, 0.40))) + ')';
    }
    if (n.s1scroll) {
      if (this.s1Max == null || this.s1MeasureAt !== window.innerHeight) {
        this.s1MeasureAt = window.innerHeight;
        const ch = n.content ? n.content[0].offsetHeight : 620;
        this.s1Max = Math.max(0, n.s1scroll[0].offsetHeight - ch - 14);
      }
      n.s1scroll[0].style.transform = 'translateY(' + (-K(p, [[0.175, 0], [0.30, this.s1Max]])) + 'px)';
    }
    if (n.s1cta) {
      const hot = S(p, 0.285, 0.315);
      const press = this.tap(n.s1cta[0], p, 0.285, 0.315, [14,107,122], [10,84,96]);
      n.s1cta[0].style.boxShadow = '0 ' + (10 - 7 * press).toFixed(1) + 'px ' + (24 - 15 * press).toFixed(1) + 'px -10px rgba(14,107,122,0.8)';
      if (hot > 0.5 && !this.ctaRect && n.content) {
        const cr = n.content[0].getBoundingClientRect(), br = n.s1cta[0].getBoundingClientRect();
        // divide by the scale MEASURED IN THIS LAYOUT PASS, not by a cached one: content
        // spans the frame's full 1060px, so cr.width/1060 is exactly the projection that
        // br was measured in. A stale scale skews the inset the scale-through grows from.
        const s = cr.width ? cr.width / 1060 : (this.lastScale || 1);
        this.ctaRect = { x: (br.left - cr.left) / s, y: (br.top - cr.top) / s, w: br.width / s, h: br.height / s };
      }
    }

    if (n.s2) {
      const el = n.s2[0];
      const grow = this.eq(S(p, 0.335, 0.405));
      el.style.opacity = String(p > 0.33 ? 1 : 0);
      if (grow < 1 && grow > 0) {
        const R = this.ctaRect || { x: 60, y: 330, w: 132, h: 42 };
        const W = 1060, H = 622;
        const t = grow;
        const top = R.y * (1 - t), left = R.x * (1 - t);
        const right = (W - R.x - R.w) * (1 - t), bottom = (H - R.y - R.h) * (1 - t);
        el.style.clipPath = 'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px round ' + (3 * (1 - t)) + 'px)';
      } else if (grow >= 1) {
        el.style.clipPath = 'none';
      } else {
        el.style.clipPath = 'inset(50% 50% 50% 50%)';
      }
    }

    if (n.flip) {
      const f = this.cl(S(p, 0.575, 0.645), 0, 1);
      const a = -180 * this.ez(f);
      n.flip[0].style.transform = 'rotateY(' + a + 'deg)';
      if (n.content) {
        const g = this.cl((Math.abs(a) - 30) / 45, 0, 1);
        n.content[0].style.background = this.mix([255, 255, 255], [11, 27, 58], g * (a > -160 ? 1 : 0));
      }
      if (n.s2) n.s2[0].style.visibility = a > -90 ? 'visible' : 'hidden';
      if (n.s3) {
        n.s3[0].style.visibility = a <= -90 ? 'visible' : 'hidden';
        n.s3[0].style.opacity = p > 0.56 ? '1' : '0';
      }
    }

    if (n.holdclock) {
      const left = Math.max(0, 598 - Math.round(this.cl((p - 0.37) / 0.21, 0, 1) * 62));
      const t = Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60);
      if (n.holdclock[0].textContent !== '0' + t) n.holdclock[0].textContent = '0' + t;
    }
    if (n.jbar) { const bt = this.eo(S(p, 0.855, 0.975)); n.jbar.forEach((el: any) => { el.style.height = (parseFloat(el.dataset.h) * bt) + '%'; }); }
    // the step bar GLIDES between thirds — a 0.017-wide ramp read as a jump
    if (n.s2bar) n.s2bar[0].style.width = K(p, [[0.40, 33], [0.448, 33], [0.492, 66], [0.508, 66], [0.556, 100]]) + '%';
    const sub = (key: any, a: any, b: any, r: any) => {
      if (!n[key]) return;
      const t = this.tz(p, a, b, r || 0.026);
      const el = n[key][0];
      el.style.opacity = String(t);
      el.style.transform = 'translateY(' + ((1 - t) * 7).toFixed(2) + 'px) scale(' + (0.984 + 0.016 * t).toFixed(4) + ')';
      el.style.filter = t > 0.985 ? 'none' : 'blur(' + ((1 - t) * 6).toFixed(2) + 'px)';
    };
    sub('s2a', 0.40, 0.445, 0.020);
    sub('s2b', 0.462, 0.498, 0.014);
    sub('s2c', 0.515, 0.575, 0.026);
    if (n.s2opt) {
      const t = this.sel(n.s2opt[0], p, 0.428, 0.444, [255,255,255], [242,247,247]);
      n.s2opt[0].style.boxShadow = t < 0.01 ? 'none' : 'inset 0 0 0 ' + (1.6 * t).toFixed(2) + 'px rgba(14,107,122,' + t.toFixed(3) + ')';
    }
    if (n.s2day) this.sel(n.s2day[0], p, 0.478, 0.492, [255,255,255], [11,27,58], [11,27,58], [255,255,255]);
    if (n.s2time) this.sel(n.s2time[0], p, 0.494, 0.508, [255,255,255], [11,27,58], [11,27,58], [255,255,255]);
    if (n.type1) this.typeInto(n.type1[0], p, 0.522, 0.539);
    if (n.type2) this.typeInto(n.type2[0], p, 0.541, 0.556);
    if (n.s2submit) this.tap(n.s2submit[0], p, 0.560, 0.576, [14,107,122], [10,84,96]);
    if (n.sum1) n.sum1[0].style.opacity = String(0.25 + 0.75 * S(p, 0.435, 0.45));
    if (n.sum2) n.sum2[0].style.opacity = String(0.25 + 0.75 * S(p, 0.49, 0.505));
    if (n.sum3) n.sum3[0].style.opacity = String(0.25 + 0.75 * S(p, 0.515, 0.53));

    if (n.type3) this.typeInto(n.type3[0], p, 0.655, 0.695);
    if (n.type4) this.typeInto(n.type4[0], p, 0.698, 0.710);
    if (n.type5) this.typeInto(n.type5[0], p, 0.713, 0.724);
    if (n.s3pay) this.tap(n.s3pay[0], p, 0.730, 0.748, [11,27,58], [34,211,238]);
    if (n.s3paid) {
      const t = this.cl(S(p, 0.744, 0.775), 0, 1);
      n.s3paid[0].style.opacity = String(this.ex(t));
      n.s3paid[0].style.transform = 'scale(' + (0.955 + 0.045 * this.eb(t)).toFixed(4) + ')';
    }

    if (n.count) n.count.forEach((el: any) => {
      const to = parseFloat(el.dataset.to) || 0;
      const s = (el.dataset.prefix || '') + this.num(Math.round(to * this.eo(S(p, 0.855, 0.955))));
      if (el.textContent !== s) el.textContent = s;
    });
    if (n.ev) n.ev.forEach((el: any, i: any) => {
      const t = this.eo(S(p, 0.865 + i * 0.016, 0.888 + i * 0.016));
      el.style.opacity = String(t);
      el.style.transform = 'translateX(' + ((1 - t) * -14) + 'px)';
    });
    if (n.s4chat) { const t = this.eo(S(p, 0.96, 0.99)); n.s4chat[0].style.opacity = String(t); n.s4chat[0].style.transform = 'translateY(' + ((1 - t) * 14) + 'px)'; }

    if (n.cursor) {
      const el = n.cursor[0];
      const vis = Math.min(this.eo(S(p, 0.22, 0.25)), 1 - this.eo(S(p, 0.745, 0.775)));
      el.style.opacity = String(this.cl(vis, 0, 1));
      const x = K(p, [[0.22, 720], [0.29, 128], [0.32, 128], [0.40, 300], [0.428, 300], [0.462, 300], [0.478, 214], [0.494, 300], [0.522, 330], [0.562, 330], [0.60, 700], [0.655, 700], [0.732, 700], [0.775, 700]]);
      const y = K(p, [[0.22, 430], [0.29, 236], [0.32, 236], [0.40, 210], [0.428, 210], [0.462, 250], [0.478, 250], [0.494, 306], [0.522, 386], [0.562, 458], [0.60, 300], [0.655, 240], [0.732, 520], [0.775, 520]]);
      const clicks = [0.30, 0.437, 0.483, 0.499, 0.567, 0.737];
      let ring = 0;
      for (let i = 0; i < clicks.length; i++) { const d = Math.abs(p - clicks[i]); if (d < 0.014) ring = Math.max(ring, 1 - d / 0.014); }
      el.style.left = x + 'px';
      el.style.top = (y - Math.sin(this.cl(p, 0, 1) * Math.PI * 9) * 9).toFixed(1) + 'px';
      el.style.transform = 'scale(' + (1 - 0.22 * ring).toFixed(3) + ')';
      if (n.cring) { n.cring[0].style.opacity = String(ring * 0.9); n.cring[0].style.transform = 'scale(' + (0.35 + 0.8 * (1 - ring)) + ')'; }
    }

    const showAnn = this.opts.showAnnotations !== false && window.innerWidth > 1180;
    if (n.ann) n.ann.forEach((el: any) => {
      const t = showAnn ? this.band(el, p) : 0;
      el.style.opacity = String(t);
      el.style.transform = 'translateX(' + ((1 - t) * 18) + 'px)';
    });
    if (n.anntext) n.anntext.forEach((el: any) => { el.style.color = tone > 0.5 ? '#6b7a92' : '#6b7a92'; });
    if (n.cap) n.cap.forEach((el: any) => {
      const t = this.band(el, p);
      el.style.opacity = String(t);
      el.style.transform = 'translateY(' + ((1 - t) * 14).toFixed(1) + 'px)';
      el.style.filter = t > 0.98 ? 'none' : 'blur(' + ((1 - t) * 5).toFixed(2) + 'px)';
    });
    if (n.railitem) n.railitem.forEach((el: any) => {
      const a = parseFloat(el.dataset.a), b = parseFloat(el.dataset.b);
      const on = p >= a && p < b;
      const vis = this.ez(S(p, 0.08, 0.17)) * (window.innerWidth > 1180 ? 1 : 0);
      el.style.opacity = String((on ? 1 : 0.3) * vis);
      el.style.color = on ? this.acc() : (tone > 0.5 ? '#fbf9f4' : '#071022');
      const line = el.firstElementChild as any;
      if (line) {
        line.style.background = on ? this.acc() : (tone > 0.5 ? '#fbf9f4' : '#071022');
        line.style.width = on ? '40px' : '22px';
        line.style.transition = 'width .5s cubic-bezier(.16,.84,.28,1)';
      }
    });
  }

  spine(p: any) {
    const n = this.n;
    if (n.spineline && this.spineLen) {
      const t = this.eo(this.cl(this.seg(p, 0.08, 0.86), 0, 1));
      n.spineline[0].style.strokeDashoffset = String(this.spineLen * (1 - t));
    }
    const prog = this.cl(this.seg(p, 0.08, 0.86), 0, 1);
    // the same eased value the line is drawn with, so a node fires exactly as the ink
    // reaches it rather than a few pixels early or late
    const dp = this.eo(prog);
    let fired = -1;
    if (n.node) n.node.forEach((el: any, i: any) => {
      const at = parseFloat(el.dataset.at);
      const t = this.eo(this.cl((dp - at) / 0.045, 0, 1));
      el.style.opacity = String(t);
      const dot = el.children[0];
      if (dot) {
        dot.style.transition = 'none';
        dot.style.transform = 'scale(' + (0.3 + 0.7 * t).toFixed(3) + ')';
        // a halo that blooms as the event lands and settles out again
        const h = Math.sin(this.cl(t, 0, 1) * Math.PI);
        dot.style.boxShadow = h > 0.02 ? '0 0 0 ' + (h * 9).toFixed(1) + 'px rgba(' + (el.dataset.win ? '31,122,77' : '217,69,31') + ',' + (h * 0.26).toFixed(3) + ')' : 'none';
      }
      if (t > 0.5) fired = i;
    });
    // THE LEDGER. The curve on its own was decoration — a wavy line with three labels. The
    // spine's actual product is a readable chain of events with one identity on it, so the
    // three most recent events print here as the ink reaches them, the identity upgrades
    // from anonymous to lead to patient, and the attributed value follows behind it.
    if (n.splog && n.node) {
      const keys = n.splog[0].querySelectorAll('[data-slk]');
      const mets = n.splog[0].querySelectorAll('[data-slm]');
      for (let r = 0; r < keys.length; r++) {
        const src = (fired - r) >= 0 ? n.node[fired - r] : null;
        const k = src ? (src.dataset.ev || '') : (r === 0 ? '—' : '');
        const m = src ? (src.dataset.meta || '') : (r === 0 ? 'waiting for the first hit' : '');
        if (keys[r].textContent !== k) keys[r].textContent = k;
        if (mets[r].textContent !== m) mets[r].textContent = m;
        const c = src && src.dataset.win ? '#1F7A4D' : '#fbf9f4';
        if (keys[r].style.color !== c) keys[r].style.color = c;
      }
    }
    if (n.spid) {
      const id = fired >= 5 ? 'patient_1180' : fired >= 3 ? 'lead_4471' : 'anon_8f2c';
      if (n.spid[0].textContent !== id) n.spid[0].textContent = id;
    }
    if (n.spval) {
      const v = fired >= 5 ? 780 : fired >= 3 ? 49 : 0;
      if (this.spv == null) this.spv = 0;
      this.spv += (v - this.spv) * 0.10;
      if (Math.abs(v - this.spv) < 0.6) this.spv = v;
      const s = '$' + this.num(Math.round(this.spv));
      if (n.spval[0].textContent !== s) n.spval[0].textContent = s;
    }
    if (n.spinestat) n.spinestat.forEach((el: any) => {
      const to = parseFloat(el.dataset.to) || 0;
      const t = this.eo(this.seg(p, 0.62, 0.92));
      const s = (el.dataset.prefix || '') + this.num(Math.round(to * t)) + (el.dataset.suffix || '');
      if (el.textContent !== s) el.textContent = s;
    });
    if (n.packet && this.spineLen && n.spineline) {
      const bt = performance.now() / 5200;
      n.packet.forEach((el: any, i: any) => {
        const u = (bt + i / 3) % 1;
        if (u > prog || prog < 0.02) { el.style.opacity = '0'; return; }
        const pt = n.spineline[0].getPointAtLength(this.spineLen * u);
        el.style.left = (pt.x / 1240 * 100) + '%';
        el.style.top = (pt.y / 300 * 100) + '%';
        el.style.opacity = String(0.3 + 0.7 * Math.sin(u * Math.PI));
      });
    }
  }

  portal(p: any) {
    const n = this.n;
    if (n.pp) n.pp.forEach((el: any) => {
      const a = parseFloat(el.dataset.a), b = parseFloat(el.dataset.b);
      const t = this.tz(p, a, b, 0.042);
      el.style.opacity = String(t);
      el.style.transform = 'translateX(' + ((1 - t) * (p > (a + b) / 2 ? -38 : 38)).toFixed(1) + 'px) scale(' + (0.985 + 0.015 * t).toFixed(4) + ')';
      el.style.filter = t > 0.985 ? 'none' : 'blur(' + ((1 - t) * 6).toFixed(2) + 'px)';
      el.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
    });
    if (n.pcap) n.pcap.forEach((el: any) => {
      const t = this.band(el, p);
      el.style.opacity = String(t);
      el.style.transform = 'translateY(' + ((1 - t) * 16).toFixed(1) + 'px)';
      el.style.filter = t > 0.98 ? 'none' : 'blur(' + ((1 - t) * 5).toFixed(2) + 'px)';
    });
    let active = 0;
    if (n.pnav) n.pnav.forEach((el: any, i: any) => {
      const a = parseFloat(el.dataset.a), b = parseFloat(el.dataset.b);
      const on = p >= a && p < b;
      if (on) active = i;
      el.style.color = on ? '#fbf9f4' : '#6b7a92';
      el.style.fontWeight = on ? '600' : '400';
    });
    if (n.ppill) {
      n.ppill[0].style.transform = 'translateY(' + (active * 36) + 'px)';
      n.ppill[0].style.transition = 'transform .62s cubic-bezier(.34,1.42,.42,1)';
    }
    // The left column used to end in four anonymous 34px dashes, which told the reader
    // nothing and left two thirds of the column empty. It is now a real index: the four
    // panels named, the active one inked, its rule drawing out to 46px.
    if (n.pidx) n.pidx.forEach((el: any) => {
      const a = parseFloat(el.dataset.a), b = parseFloat(el.dataset.b);
      const on = p >= a && p < b;
      const num = el.children[0], lab = el.children[1], ln = el.children[2];
      if (num) { num.style.transition = 'color .4s ease'; num.style.color = on ? this.acc() : '#6b7a92'; }
      if (lab) { lab.style.transition = 'color .4s ease'; lab.style.color = on ? '#071022' : '#6b7a92'; }
      if (ln) {
        ln.style.transition = 'width .55s cubic-bezier(.16,.84,.28,1),background-color .4s ease';
        ln.style.width = on ? '46px' : '14px';
        ln.style.background = on ? this.acc() : '#6b7a92';
      }
    });
    if (n.pbar) n.pbar[0].style.width = (62 * this.eo(this.seg(p, 0.04, 0.2))) + '%';
    if (n.pmile2) n.pmile2[0].style.width = (50 * this.eo(this.seg(p, 0.08, 0.24))) + '%';
    if (n.pmiledot) {
      // a milestone releasing an invoice deserves better than a colour flip: the green
      // fills from below, the tick fades up with it, and the dot pops on eb overshoot
      const t = this.cl(this.seg(p, 0.345, 0.425), 0, 1);
      const e = this.ez(t);
      const el = n.pmiledot[0];
      el.style.transition = 'none';
      el.style.background = 'linear-gradient(0deg, #1F7A4D ' + (e * 100).toFixed(1) + '%, #dfe3ea ' + (e * 100).toFixed(1) + '%)';
      el.style.color = 'rgba(255,255,255,' + this.ez(this.cl((t - 0.45) / 0.55, 0, 1)).toFixed(3) + ')';
      el.style.transform = 'scale(' + (1 + 0.30 * Math.sin(t * Math.PI) * this.eb(this.cl(t / 0.6, 0, 1))).toFixed(3) + ')';
    }
    if (n.pcode) {
      const digits = '419286';
      n.pcode.forEach((el: any, i: any) => {
        // each digit is a keypress, not an appearance: the box presses in, the border
        // lights, the glyph lands and settles with a back-out rebound
        const a0 = 0.826 + i * 0.019;
        const t = this.cl(this.seg(p, a0, a0 + 0.017), 0, 1);
        el.style.transition = 'none';
        el.style.transform = 'scale(' + (1 - 0.085 * Math.sin(this.cl(t / 0.5, 0, 1) * Math.PI)).toFixed(3) + ')';
        el.style.borderColor = this.mix([236, 230, 215], [11, 27, 58], this.ez(t));
        const gt = this.cl((t - 0.30) / 0.70, 0, 1);
        el.style.opacity = String(0.35 + 0.65 * gt);
        const on = t > 0.30;
        const ch = on ? digits[i] : '';
        if (el.textContent !== ch) el.textContent = ch;

      });
    }
  }

  tz(p: any, a: any, b: any, r: any) {
    const inT = a > 0 ? this.ez(this.cl((p - a) / r, 0, 1)) : 1;
    const outT = 1 - this.ez(this.cl((p - b) / r, 0, 1));
    return this.cl(Math.min(inT, outT), 0, 1);
  }

  // Each of the five layers PRESENTS ITSELF, one by one. The v3 scene only lifted the
  // active layer 34px and dimmed the rest to 0.62 — three defects in one:
  //   1. a layer tilted 54deg extends ~+/-140px in z around its own slot, so a 34px lift left
  //      the "focused" card still physically INSIDE its neighbours. preserve-3d does true
  //      plane INTERSECTION, so the compositor sliced them together — that is the mush.
  //      z-index does nothing inside preserve-3d; only z CLEARANCE fixes it.
  //   2. the focused layer kept the deck's rotation, so its content was read at a 54/-30
  //      skew. It was never actually legible.
  //   3. `on` was a boolean behind a CSS transition — a hard step, not scroll-linked.
  // Now: the card LEAVES the deck, turns to face the camera, holds while the others recede
  // hard, and returns. Nothing steps; every value is a continuous function of p.
  anatomy(p: any) {
    const n = this.n, S = this.seg.bind(this), cl = this.cl.bind(this);
    if (!n.anastack) return;
    const turn = this.ez(S(p, 0.02, 0.30));
    const sep = this.ez(S(p, 0.08, 0.40));
    // pull is live across the whole focus run; its out-ramp starts only after layer 5's hold
    // in-ramp ends at 0.455, BEFORE layer 01's hold opens at 0.479 — overlapping them cost
    // layer 01 4/10 of its dwell (the card was still moving forward during its own beat)
    const pull = this.ez(S(p, 0.40, 0.455)) * (1 - this.ez(S(p, 0.895, 0.935)));
    const flat = this.ez(S(p, 0.902, 0.950));
    const sepE = sep * (1 - flat);
    // THE CAMERA LOWERS AS THE CARDS PRESENT, and this is load-bearing for clearance, not
    // just mood. Every quantity that causes plane intersection scales with sin(rx): the
    // pulled card's own z-extent (halfH*sin rx), the neighbours' depth spread, and the
    // screen lift that has to be compensated. Dropping the tilt 48 -> 22 shrinks all three
    // at once. Two terms so the camera still never freezes: a fast settle as the first card
    // comes out, then a slow drift across the rest of the run.
    const d1 = this.ez(S(p, 0.40, 0.56)), d2 = this.ez(S(p, 0.56, 0.93));
    let rx = 8 + 40 * turn - 18 * d1 - 8 * d2;
    let rz = -(2 + 30 * turn) + 12 * d1 + 8 * d2;
    rx = rx * (1 - flat) + 2 * flat;
    rz = rz * (1 - flat);
    // the exploded deck is ~595px tall at scale 1 in a min(640px,78vh) cell — without vfit
    // the pulled card rides off the top of a short viewport
    const vfit = cl(((window.innerHeight || 800) - 100) / 720, 0.66, 1);
    const sc = (0.94 + 0.06 * turn) * vfit;
    if (!this.anaHost) this.anaHost = n.anastack[0].parentElement;
    n.anastack[0].style.transition = 'none';
    n.anastack[0].style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) +
      'deg) scale(' + sc.toFixed(4) + ')';

    // fc walks 0 -> 4 across the focus run; each layer's weight is a TRAPEZOID (ramp, flat
    // hold, ramp) off its distance from fc, so every layer gets a real dwell instead of
    // being crossed through. One fc unit per 0.097p; each hold is ~0.066p (~36vh).
    // The fc window starts AFTER pull completes (0.48) and ends BEFORE it decays (0.895).
    // Overlapping them cost layer 01 half its hold (its peak arrived while the card was
    // still moving forward) and gave layer 05 a double-length one (fc pins at 4.5 and sits
    // there). One fc unit = 0.087p, so every hold is an equal 0.059p / ~32vh.
    const fc = cl(S(p, 0.465, 0.90) * 5 - 0.5, -0.5, 4.5);
    const raw = (i: any) => { const d = Math.abs(fc - i); return d <= 0.34 ? 1 : cl(1 - (d - 0.34) / 0.66, 0, 1); };
    // POSITION IS EXCLUSIVE — this is the whole fix for the sliced-card seam. `raw` ramps
    // over 0.66 fc units so consecutive layers OVERLAP, which is right for a crossfade but
    // fatal for geometry: at every handover two adjacent cards were both pulled forward to
    // nearly the same depth (measured z 227 vs 235) with slightly different tilts, so their
    // planes intersected and preserve-3d sliced them together. Measured worst clearance was
    // -59px. `pos` ramps over 0.18 and therefore reaches 0 at d=0.52, exactly where the
    // next layer's ramp leaves 0 — so at most ONE card is ever out of the deck. The
    // outgoing card is home before the next one moves; clearance is now +124px at a hold
    // and never below +77 mid-ramp. Opacity/blur/labels keep the soft overlapping `raw`,
    // so the exchange still reads as a crossfade rather than a shuffle.
    const pos = (i: any) => { const d = Math.abs(fc - i); return d <= 0.34 ? 1 : cl(1 - (d - 0.34) / 0.18, 0, 1); };
    // compress the deck while any card is out — the second half of the z-clearance fix
    const sepC = sepE * (1 - 0.80 * pull);
    const W: any[] = [], P: any[] = [];
    for (let i = 0; i < 5; i++) { W.push(this.ez(raw(i)) * pull); P.push(this.ez(pos(i)) * pull); }
    let wLead = 0;
    for (let i = 0; i < 5; i++) if (P[i] > wLead) wLead = P[i];

    if (n.analayer) n.analayer.forEach((el: any) => {
      // q drives GEOMETRY (depth + counter-rotation), w drives APPEARANCE (opacity, blur,
      // labels). Keeping them separate is what makes an exclusive position compatible with
      // a soft crossfade — do not collapse these back into one weight.
      const i = parseInt(el.dataset.i, 10), w = W[i], q = P[i], k = 1 - q;
      // k fades the slot offset out as the card leaves, so a back layer does not stay
      // BEHIND the front of the deck and get occluded; pow(q,0.55) makes the forward move
      // LEAD the rotation, so the card clears the deck before it turns
      const z = (i - 2) * 108 * sepC * k + 252 * Math.pow(q, 0.55);
      const entry = this.eo(cl(S(p, 0.05 + i * 0.03, 0.16 + i * 0.03), 0, 1));
      const rec = (1 - w) * pull;
      el.style.transition = 'none';
      // counter-rotate to face the camera: parent is rotateX then rotateZ, so the inverse is
      // rotateZ then rotateX — THAT ORDER or it skews. translateY last = screen space.
      // NEVER put the framing compensation in THIS transform. A translateY here sits inside
      // the counter-rotation, so in the deck's frame it carries a z component of
      // -ty*sin(rx): the card's true depth becomes z*cos^2(rx) - ty*sin(rx). Compensating a
      // 162px lift dragged the card from z=252 back to z=136, straight into the neighbours
      // at 41 and 82 — and preserve-3d sliced them, which is the hard diagonal seam the
      // user photographed. Framing is corrected in 2D on the perspective host instead.
      // THE ROTATION LAGS THE FORWARD MOVE. Turning toward the camera is what gives a card
      // z-extent (halfH*sin(angle)); while it is still emerging it must stay FLAT so it can
      // clear the compressed deck. With rotation on q directly, worst clearance was +3px at
      // p=0.47 — one rounding error from slicing again. pow(q,1.7) holds the turn back until
      // the card is out, and is 1 at the hold so the presented card is fully face-on.
      const qr = Math.pow(q, 1.7);
      el.style.transform = 'translateZ(' + z.toFixed(1) + 'px) rotateZ(' + (-rz * qr).toFixed(2) +
        'deg) rotateX(' + (-rx * qr).toFixed(2) + 'deg) translateY(' + (16 * q).toFixed(1) + 'px)';
      el.style.opacity = (entry * (1 - 0.5 * rec)).toFixed(3);
      // quantised to 5 steps — a filter string that changes every frame repaints the layer.
      // NAMED fq, NOT q: `q` is the geometry weight above, and a second `const q` in this
      // same block is a SyntaxError that kills the WHOLE logic class — every scene on the
      // page silently falls back to template-only. Check for collisions before naming.
      const fq = Math.round(rec * 5) / 5;
      el.style.filter = fq > 0.01
        ? 'saturate(' + (1 - 0.55 * fq).toFixed(2) + ') brightness(' + (1 - 0.34 * fq).toFixed(2) + ') blur(' + (fq * 2.6).toFixed(1) + 'px)'
        : 'none';
    });

    // FRAMING, in 2D, on the element that owns `perspective`. A transform there is OUTSIDE
    // the 3D context, so it re-centres the scene without touching depth, ordering or
    // intersection. The pulled card's screen offset is derived from the same numbers the
    // card uses: local depth zl, then the stack's rotateX, then scale, then perspective.
    // Compensated at 0.85 — full compensation drives the receded deck off the bottom.
    if (this.anaHost) {
      const rad = rx * Math.PI / 180, sr = Math.sin(rad), cs = Math.cos(rad);
      const zl = 252 - 16 * sr;
      const yl = 16 * cs * cs - zl * sr;
      const zz = 16 * cs * sr + zl * cs;
      const mag = 1600 / Math.max(240, 1600 - zz * sc);
      const comp = -yl * sc * mag * 0.85 * wLead;
      this.anaHost.style.transform = Math.abs(comp) > 0.4 ? 'translateY(' + comp.toFixed(1) + 'px)' : 'none';
    }

    if (n.analabel) n.analabel.forEach((el: any) => {
      const i = parseInt(el.dataset.i, 10), w = W[i];
      el.style.transition = 'none';
      el.style.opacity = (0.32 + 0.68 * w).toFixed(3);
      const num = el.firstElementChild;
      if (num) num.style.color = this.mix([107, 122, 146], [217, 69, 31], w);
      const job = el.children[2];
      if (job) job.style.color = this.mix([107, 122, 146], [251, 249, 244], w);
    });

    // THE LEDGER READOUT. act is the row the deck is presenting; both writes are
    // !== guarded so a frame that changes nothing touches no DOM.
    if (n.analabel && (n.chread || n.anacount)) {
      const total = n.analabel.length;
      const act = cl(Math.round(fc), 0, total - 1);
      const pad2 = (v: any) => (v < 10 ? '0' + v : String(v));
      if (n.chread) {
        let row = null;
        for (let i = 0; i < total; i++) {
          if (parseInt(n.analabel[i].dataset.i, 10) === act) { row = n.analabel[i]; break; }
        }
        // children are [number, name, description, rule] — the same order the
        // job-colour write above depends on. Re-nesting them breaks both.
        if (row && row.children.length > 1) {
          const txt = row.children[0].textContent + ' \u2014 ' + row.children[1].textContent;
          if (n.chread[0].textContent !== txt) n.chread[0].textContent = txt;
        }
      }
      if (n.anacount) {
        const c = pad2(act + 1) + ' / ' + pad2(total);
        if (n.anacount[0].textContent !== c) n.anacount[0].textContent = c;
      }
    }
  }

  spacerW() { return this.spacer ? (this.spacer.getBoundingClientRect().width || 0) : 0; }

  process(p: any) {
    const n = this.n;
    if (!n.track) return;
    const track = n.track[0];
    const vw = window.innerWidth || 1200;
    const need = vw * 0.55;
    if (!this.spacer) {
      this.spacer = track.querySelector('[data-trackspacer]');
      if (!this.spacer) {
        this.spacer = document.createElement('div');
        this.spacer.setAttribute('data-trackspacer', '1');
        this.spacer.style.cssText = 'flex:0 0 0px;height:1px';
        track.appendChild(this.spacer);
      }
    }
    const raw = track.scrollWidth - this.spacerW() - vw;
    const pad = Math.max(34, Math.ceil(vw * 0.55 - raw));
    if (this.trackPad !== pad) { this.trackPad = pad; this.spacer.style.flex = '0 0 ' + pad + 'px'; }
    const total = Math.max(0, track.scrollWidth - vw);
    const t = this.cl(this.seg(p, 0.06, 0.94), 0, 1);
    track.style.transform = 'translateX(' + (-total * t) + 'px)';
    if (n.trackbar) n.trackbar[0].style.width = (t * 100) + '%';
    if (n.daycount) {
      const steps = parseFloat(n.daycount[0].dataset.steps) || 1;
      const d = Math.max(1, Math.round(1 + (steps - 1) * t));
      const s = (d < 10 ? '0' : '') + d;
      if (n.daycount[0].textContent !== s) n.daycount[0].textContent = s;
    }
  }

  /* ================= SWING B — ONE CONTINUOUS FRAME ============================
     There is exactly one browser frame on this page and it lives at root level as a
     fixed element. No scene owns a frame of its own; scenes PUBLISH a target rect
     (x, y, scale, rotX, rotY, rotZ, skew, opacity, perspective) and applyFrame() is
     the single writer. Stations, in scroll order:
        hero      — waits below the fold, rises into the stage (journey p 0 → 0.145)
        journey   — the presence page, the scale-through, the 3D flip, the dock
        anatomy   — registers EXACTLY on the five-panel stack and dissolves into it
        start     — flies into the docking bay and becomes the real audit-call form
     k is the lerp factor per publisher: 1 where the rect must be exact (the dock's
     verified math, a target anchored to page flow), 0.34 where a handoff should have
     weight. Un-owned frames lerp to opacity 0 — that is the only "transit" state. */
  pubFrame(t: any) {
    this.frT = t;
    this.frOwner = t.own || null;
  }

  applyFrame(vh: any) {
    const el = (this.n.stageWrap && this.n.stageWrap[0]) || document.querySelector('[data-oneframe]') as any;
    if (!el) return;
    if (!this.fr) this.fr = { x: 0, y: vh * 0.58, s: 0.3, rx: 26, ry: -8, rz: 0, sk: 0, o: 0, pv: 2200 };
    const f = this.fr;
    const t = this.frT || { x: f.x, y: f.y, s: f.s, rx: f.rx, ry: f.ry, rz: f.rz, sk: 0, o: 0, k: 0.25, pv: f.pv };
    // while the frame is invisible it teleports between stations; a visible frame never
    // slides across the page just because ownership changed
    const dark = f.o < 0.02 && (t.o == null ? 0 : t.o) < 0.02;
    const k = dark ? 1 : (t.k == null ? 0.34 : t.k);
    const L = (a: any, b: any) => a + ((b == null ? a : b) - a) * k;
    f.x = L(f.x, t.x); f.y = L(f.y, t.y); f.s = L(f.s, t.s);
    f.rx = L(f.rx, t.rx); f.ry = L(f.ry, t.ry); f.rz = L(f.rz, t.rz); f.sk = L(f.sk, t.sk);
    f.o = f.o + ((t.o == null ? 0 : t.o) - f.o) * (dark ? 1 : 0.55);
    f.pv = t.pv || 2200;
    el.style.transition = 'none';
    el.style.opacity = f.o.toFixed(3);
    el.style.visibility = f.o < 0.004 ? 'hidden' : 'visible';
    el.style.transform = 'perspective(' + f.pv + 'px) translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px) scale(' + f.s.toFixed(4) + ') rotateX(' + f.rx.toFixed(2) + 'deg) rotateY(' + f.ry.toFixed(2) + 'deg) rotateZ(' + f.rz.toFixed(2) + 'deg) skewY(' + f.sk.toFixed(2) + 'deg)';
    el.style.zIndex = String(t.z || 6);
    el.style.pointerEvents = t.pe ? 'auto' : 'none';
    // ctaRect divides screen deltas by the scale actually on the element, not by base
    this.lastScale = f.s;
  }

  // what the one frame is SHOWING. Guarded so it only writes on a change.
  framePage(w: any) {
    const n = this.n;
    if (this.framePg === w) return;
    this.framePg = w;
    const set = (k: any, o: any) => { if (n[k]) { n[k][0].style.opacity = String(o); n[k][0].style.visibility = o > 0 ? 'visible' : 'hidden'; } };
    if (w === 'journey') { set('s5', 0); if (n.s5done) { n.s5done[0].style.opacity = '0'; n.s5done[0].style.visibility = 'hidden'; } return; }
    if (n.flip) n.flip[0].style.transform = 'rotateY(0deg)';
    if (n.cursor) n.cursor[0].style.opacity = '0';
    if (w === 'presence') {
      if (n.content) n.content[0].style.background = '#FFFFFF';
      set('s1', 1); set('s2', 0); set('s3', 0); set('s5', 0);
      if (n.s1) n.s1[0].style.transform = 'none';
      if (n.s1scroll) n.s1scroll[0].style.transform = 'translateY(0px)';
      if (n.url) n.url[0].textContent = 'sample-client.example';
    } else if (w === 'audit') {
      if (n.content) n.content[0].style.background = '#071022';
      set('s1', 0); set('s2', 0); set('s3', 0); set('s5', 1);
      if (n.url) n.url[0].textContent = 'stratalanding.com/teardown';
    }
  }

  // START STATION. The frame flies back out of the page and lands in the docking bay,
  // where it stops being a mockup: the fields are real and submitting writes the reader
  // into the same event stream the tracking panel was just showing them.
  startFrame(vh: any) {
    if (!this.bay || !this.bay.isConnected) this.bay = document.querySelector('[data-startbay]') as any;
    const b = this.bay;
    if (!b) return;
    const r = b.getBoundingClientRect();
    if (!r.width || r.bottom < -240 || r.top > vh + 520) return;
    const de = document.documentElement;
    const vw = de.clientWidth || window.innerWidth || 1200;
    vh = de.clientHeight || vh;
    const cx = r.left + r.width / 2 - vw / 2, cy = r.top + r.height / 2 - vh / 2;
    // scroll-linked arrival, and k:1 so a fixed frame tracking a target in page flow
    // never rubber-bands behind the scroll
    const u = this.cl(1 - (r.top + r.height / 2 - vh * 0.46) / (vh * 0.74), 0, 1);
    const a = this.ez(u);
    this.framePage('audit');
    this.pubFrame({
      own: 'start', k: 1, pv: 2200,
      x: cx + (1 - a) * 160, y: cy + (1 - a) * 250,
      s: (r.width / 1060) * (0.64 + 0.36 * a),
      rx: (1 - a) * 14, ry: (1 - a) * -9, rz: 0, sk: 0,
      o: this.cl(u * 1.9, 0, 1), z: 6, pe: a > 0.9
    });
    if (this.n.baylabel) this.n.baylabel[0].style.opacity = this.cl(1 - u * 1.9, 0, 1).toFixed(3);
  }

  /* ================= SWING A — "we are tracking you right now" =================
     The studio sells a tracking spine; this points it at the reader. Everything
     here is in-memory for the life of the tab: no cookie, no storage, no network,
     nothing that outlives a refresh. The panel renders it in the same instrument
     language as anatomy channel 05 and the portal dashboard. ================== */
  initSess() {
    if (this.sess) return;
    const now = performance.now(), d = new Date();
    this.sess = {
      t0: now, last: now, start: d,
      id: 'NS-' + String(1000 + Math.floor(Math.random() * 8999)),
      depth: 0, dDepth: 0, pos: 0, dPos: 0, dist: 0, dDist: 0,
      exits: 0, exAt: 0, drags: 0, hov: {}, cur: null, entAt: 0,
      dwell: {}, deep: {}, ev: [], flags: {}, trace: [], traceAt: 0,
      dirty: 1, hotDirty: 1, traceDirty: 1
    };
    this.slog('session_start', d.toLocaleTimeString('en-US', { hour12: false }) + ' · ' + (window.innerWidth || 0) + '×' + (window.innerHeight || 0), 0);
  }

  slog(k: any, note: any, hot: any) {
    const s = this.sess;
    if (!s) return;
    s.ev.unshift({ k: k, n: note || '', h: hot ? 1 : 0, t: new Date() });
    if (s.ev.length > 26) s.ev.pop();
    s.dirty = 1;
  }

  sflag(k: any, note: any) {
    const s = this.sess;
    if (!s || s.flags[k]) return;
    s.flags[k] = new Date();
    s.hotDirty = 1;
    this.slog(k, note, 1);
  }

  // Wired from collect(), which polls for the first ~9s — so a late DOM is fine.
  // Every query is document-scoped on purpose: #pricing and #watching are NOT
  // descendants of [data-nl="root"], the trap that has cost this page two features.
  wireSess() {
    if (this.sessWired) return;
    this.initSess();
    const rows = document.querySelectorAll('#pricing [data-row],#pricing [data-lay]') as any;
    if (!rows.length) return;
    this.sessWired = true;
    // `self` is required: the listeners below are `function` expressions, not
    // arrows, so their own `this` is the element the event fired on.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const s = this.sess, self = this;
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i], ns = el.querySelector('span');
      const nm = ns ? (ns.textContent || 'row').trim() : 'row';
      el.addEventListener('pointerenter', function () {
        const first = !s.hov[nm];
        s.hov[nm] = (s.hov[nm] || 0) + 1;
        if (first) {
          if (!s.flags['price_hover']) { s.flags['price_hover'] = new Date(); s.hotDirty = 1; }
          self.slog('price_hover', nm.toLowerCase() + ' · row held', 1);
        }
      }, { passive: true });
    }
    const ins = document.querySelectorAll('[data-anim="calcin"]') as any;
    for (let i = 0; i < ins.length; i++) {
      ins[i].addEventListener('input', function () { self.sflag('worksheet_drag', 'the math worksheet was moved'); }, { passive: true });
      ins[i].addEventListener('change', function (e: any) {
        s.drags++;
        self.slog('worksheet_set', ((e.target as any).dataset.k || 'value') + ' = ' + (e.target as any).value, 0);
      }, { passive: true });
    }
    // SWING B closes the loop on SWING A: the audit form inside the one frame is real,
    // and submitting writes the reader into the same event stream they were just shown.
    const fin = document.querySelectorAll('[data-anim="s5in"]') as any;
    for (let i = 0; i < fin.length; i++) {
      const fl = fin[i].getAttribute('data-f') || 'field';
      fin[i].addEventListener('focus', function () {
        if (s.flags['form_focus_' + fl]) return;
        s.flags['form_focus_' + fl] = new Date();
        self.slog('form_focus', fl, 0);
      });
      fin[i].addEventListener('input', function () { self.sflag('form_typing', 'the reader started filling the audit form'); }, { passive: true });
    }
    const go = document.querySelector('[data-anim="s5go"]') as any;
    if (go) go.addEventListener('click', function () {
      const who = (document.querySelector('[data-anim="s5in"][data-f="practice"]') as any || {}).value;
      const nm = (who || '').trim();
      const nn = self.n;
      if (nn.s5time) nn.s5time[0].textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
      if (nn.s5who) nn.s5who[0].textContent = ' · ' + (nm || 'you') + ' · teardown request';
      if (nn.s5done) { nn.s5done[0].style.visibility = 'visible'; nn.s5done[0].style.opacity = '1'; nn.s5done[0].style.transition = 'opacity .5s cubic-bezier(.16,.84,.28,1)'; }
      self.slog('lead_submitted', (nm || 'you') + ' · teardown request', 1);
      if (!s.flags['lead_submitted']) { s.flags['lead_submitted'] = new Date(); s.hotDirty = 1; }
    });
    this.onExit = function (e: any) {
      if (e && e.clientY != null && e.clientY > 8) return;
      const now = performance.now();
      if (now - s.exAt < 1500) return;
      s.exAt = now;
      s.exits++;
      if (!s.flags['exit_intent']) { s.flags['exit_intent'] = new Date(); s.hotDirty = 1; }
      self.slog('exit_intent', 'pointer left through the top of the window', 1);
    };
    document.documentElement.addEventListener('pointerleave', this.onExit);
  }

  session(vh: any, doc: any) {
    this.initSess();
    const s = this.sess, now = performance.now();
    let dt = now - s.last;
    s.last = now;
    if (!(dt > 0) || dt > 400 || document.hidden) dt = 0;
    const H = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pos = this.cl(doc.scrollTop / H, 0, 1);
    s.pos = pos;
    if (pos > s.depth) s.depth = pos;
    // every readout lerps — a tracking panel that steps looks like a debug console
    s.dDepth += (s.depth - s.dDepth) * 0.12;
    s.dPos += (pos - s.dPos) * 0.20;
    s.dDist += (s.dist - s.dDist) * 0.12;
    if (!this.wsecs || !this.wsecs.length || !this.wsecs[0].el.isConnected) {
      const ids = ['journey', 'system', 'anatomy', 'compare', 'spine', 'portal', 'process', 'math', 'watching', 'receipts', 'pricing', 'start'];
      this.wsecs = [];
      for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (el) this.wsecs.push({ id: ids[i], el: el });
      }
    }
    // the same 45% reading line the rail uses, so the two instruments agree
    let cur = null;
    for (let i = 0; i < this.wsecs.length; i++) {
      const r = this.wsecs[i].el.getBoundingClientRect();
      if (r.top <= vh * 0.45 && r.bottom > vh * 0.45) cur = this.wsecs[i].id;
    }
    if (cur) {
      s.dwell[cur] = (s.dwell[cur] || 0) + dt;
      if (cur !== s.cur) {
        s.cur = cur;
        if (now - s.entAt > 650) { s.entAt = now; this.slog('section_enter', cur, 0); }
      }
      if (s.dwell[cur] > 14000 && !s.deep[cur]) { s.deep[cur] = 1; this.slog('deep_read', cur + ' · held past 14 seconds', 0); }
    }
    if (s.depth > 0.5) this.sflag('scroll_50', 'half the page');
    if (s.depth > 0.75) this.sflag('scroll_75', 'three quarters');
    if (s.depth > 0.94) this.sflag('scroll_end', 'reached the last section');
    if (now - s.traceAt > 400) {
      s.traceAt = now;
      s.trace.push(pos);
      if (s.trace.length > 90) s.trace.shift();
      s.traceDirty = 1;
    }
    this.paintWatch(vh);
  }

  // NOT named watch(): componentDidMount already owns this.watch as the rAF
  // watchdog INTERVAL ID, so a method of that name is shadowed by a number and
  // every call throws into session()'s catch — silent, and the panel never paints.
  paintWatch(vh: any) {
    const s = this.sess;
    if (!this.wpanel || !this.wpanel.isConnected) {
      this.wpanel = document.querySelector('[data-watch="panel"]') as any;
      this.wq = null;
    }
    const p = this.wpanel;
    if (!p) return;
    const pr = p.getBoundingClientRect();
    if (pr.bottom < -700 || pr.top > vh + 700) return;
    if (!this.wq) {
      // scope to the SECTION, not the panel — the turn line lives after the panel's
      // closing div, so a panel-scoped query silently left t1/t2/t3 at their defaults
      const sc = document.getElementById('watching') || p;
      const q = (k: any) => sc.querySelector('[data-w="' + k + '"]');
      const rowEls = Array.prototype.slice.call(p.querySelectorAll('[data-wrow]'));
      this.wq = {
        time: q('time'), depth: q('depth'), depthbar: q('depthbar'), depthnow: q('depthnow'),
        dist: q('dist'), exits: q('exits'), drags: q('drags'), hovers: q('hovers'),
        trace: q('trace'), tracedot: q('tracedot'),
        t1: q('t1'), t2: q('t2'), t3: q('t3'),
        rows: rowEls.map((el: any) => ({
          id: el.getAttribute('data-wrow'), lab: el.getAttribute('data-wl'),
          bar: el.querySelector('[data-wb]'), val: el.querySelector('[data-wv]'), nm: el.querySelector('[data-wn]')
        })),
        evs: Array.prototype.slice.call(p.querySelectorAll('[data-wev]')),
        hots: Array.prototype.slice.call(p.querySelectorAll('[data-whot]')).map((el: any) => ({
          k: el.getAttribute('data-whot'), dot: el.querySelector('[data-wd]'),
          nm: el.querySelector('[data-wn]'), st: el.querySelector('[data-ws]')
        }))
      };
      const idEl = q('id'), srcEl = q('src'), vpEl = q('vp'), enEl = q('entered');
      if (idEl) idEl.textContent = s.id;
      if (srcEl) {
        let ref = 'direct';
        try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : 'direct'; } catch (e: any) { ref = 'direct'; }
        srcEl.textContent = ref || 'direct';
      }
      if (vpEl) vpEl.textContent = (window.innerWidth || 0) + '×' + (window.innerHeight || 0);
      if (enEl) enEl.textContent = s.start.toLocaleTimeString('en-US', { hour12: false });
      s.dirty = 1; s.hotDirty = 1; s.traceDirty = 1;
    }
    const w = this.wq;
    const put = (el: any, v: any) => { if (el && el.textContent !== v) el.textContent = v; };
    const secs = (performance.now() - s.t0) / 1000;
    const mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
    put(w.time, (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss);
    put(w.depth, Math.round(s.dDepth * 100) + '%');
    if (w.depthbar) w.depthbar.style.width = (s.dDepth * 100).toFixed(2) + '%';
    if (w.depthnow) w.depthnow.style.left = (s.dPos * 100).toFixed(2) + '%';
    put(w.dist, this.num(Math.round(s.dDist)) + ' px');
    put(w.exits, s.exits + ' ×');
    put(w.drags, s.drags + (s.drags === 1 ? ' drag' : ' drags'));
    let hc = 0;
    for (const hk in s.hov) if (s.hov[hk]) hc++;
    put(w.hovers, hc + ' / 3');

    let mx = 1, top = null, topV = 0;
    for (const dk in s.dwell) {
      if (s.dwell[dk] > mx) mx = s.dwell[dk];
      if (s.dwell[dk] > topV) { topV = s.dwell[dk]; top = dk; }
    }
    for (let i = 0; i < w.rows.length; i++) {
      const rw = w.rows[i], v = s.dwell[rw.id] || 0, on = rw.id === s.cur;
      if (rw.bar) {
        rw.bar.style.width = (v / mx * 100).toFixed(2) + '%';
        rw.bar.style.background = on ? this.acc() : 'rgba(251,249,244,0.42)';
      }
      put(rw.val, (v / 1000).toFixed(1));
      if (rw.val) rw.val.style.color = on ? this.acc() : (v > 0 ? '#9aa7bd' : '#6b7a92');
      if (rw.nm) rw.nm.style.color = on ? '#fbf9f4' : (v > 0 ? '#9aa7bd' : '#55617a');
    }

    if (s.dirty) {
      s.dirty = 0;
      for (let i = 0; i < w.evs.length; i++) {
        const row = w.evs[i], it = s.ev[i], c = row.children;
        if (!it || c.length < 3) { row.style.opacity = '0.22'; continue; }
        row.style.opacity = String(1 - i * 0.12);
        c[0].textContent = it.t.toLocaleTimeString('en-US', { hour12: false });
        c[1].children[0].textContent = it.k;
        c[1].children[0].style.color = it.h ? this.acc() : '#fbf9f4';
        c[1].children[1].textContent = it.n ? ' · ' + it.n : '';
        c[2].textContent = it.h ? '●' : '';
        c[2].style.color = this.acc();
      }
    }

    if (s.hotDirty) {
      s.hotDirty = 0;
      for (let i = 0; i < w.hots.length; i++) {
        const h = w.hots[i], at = s.flags[h.k];
        if (h.dot) {
          h.dot.style.background = at ? this.acc() : 'transparent';
          h.dot.style.borderColor = at ? this.acc() : 'rgba(251,249,244,0.30)';
          h.dot.style.boxShadow = at ? '0 0 0 4px rgba(8,145,178,0.18)' : 'none';
        }
        if (h.nm) h.nm.style.color = at ? '#fbf9f4' : '#6b7a92';
        if (h.st) {
          h.st.textContent = at ? at.toLocaleTimeString('en-US', { hour12: false }) : 'waiting';
          h.st.style.color = at ? this.acc() : '#5f6c81';
        }
      }
    }

    if (s.traceDirty && w.trace) {
      s.traceDirty = 0;
      const n = s.trace.length;
      let pts = '';
      for (let i = 0; i < n; i++) {
        const x = n < 2 ? 0 : (i / (n - 1)) * 300;
        pts += (i ? ' ' : '') + x.toFixed(1) + ',' + (53 - s.trace[i] * 48).toFixed(1);
      }
      w.trace.setAttribute('points', pts || '0,53');
      if (w.tracedot) {
        w.tracedot.setAttribute('cx', n < 2 ? '0' : '300');
        w.tracedot.setAttribute('cy', (53 - (s.trace[n - 1] || 0) * 48).toFixed(1));
      }
    }

    put(w.t1, mm > 0 ? mm + 'm ' + ss + 's' : ss + 's');
    put(w.t2, Math.round(s.dDepth * 100) + '%');
    const lab = top ? (this.wlabOf(w, top) || top) : 'the top of the page';
    put(w.t3, lab);
  }

  wlabOf(w: any, id: any) {
    for (let i = 0; i < w.rows.length; i++) {
      if (w.rows[i].id === id) {
        const l = w.rows[i].lab || id;
        return l.charAt(0).toLowerCase() + l.slice(1);
      }
    }
    return id;
  }

  // ── THE SHEET PASS ────────────────────────────────────────────────────────────
  // The pinned scenes are glass and light. The static sections are PAPER — so their rows
  // are laid: each one lies flat in the depth of the page and rises to face you as it
  // reaches the reading line, hinged on its own bottom edge. Scroll-linked and reversible.
  // One vocabulary, eleven rows, three sections (#system, #refusal, #pricing).
  //
  // Perspective is applied PER ROW inside the transform (`perspective(1500px) …`) rather
  // than on the parent. Two reasons, both load-bearing: the pricing container carries
  // [data-fade], which writes a filter — a filtered parent renders as a group and its
  // 3D context is not something to build on — and a per-element perspective means no
  // parent ever needs `transform-style:preserve-3d`, so the plane-INTERSECTION class of
  // bug that cost three sessions on the anatomy deck is mathematically impossible here.
  sheets(vh: any) {
    if (this.rmo == null) this.rmo = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!this.lays || !this.lays.length || !this.lays[0].el.isConnected) {
      const els = Array.prototype.slice.call(document.querySelectorAll('[data-lay],[data-spec]') as any);
      // Side-by-side sheets deal in from the left instead of arriving as a slab: anything
      // sharing a top edge with an earlier sibling gets a stagger index.
      const seen: any[] = [];
      this.lays = els.map((el: any) => {
        el.style.transformOrigin = '50% 100%';
        el.style.backfaceVisibility = 'hidden';
        el.style.willChange = 'transform';
        const top = el.getBoundingClientRect().top;
        let s = 0;
        for (let j = 0; j < seen.length; j++) if (seen[j].p === el.parentElement && Math.abs(seen[j].t - top) < 24) s++;
        seen.push({ p: el.parentElement, t: top });
        return { el: el, s: s };
      });
    }
    // The window used to run 0.90vh -> 0.60vh, which on a tall screen means every sheet has
    // finished landing before the reader's eye reaches it. It now STARTS below the fold and
    // finishes at 0.42vh — the reading line — so the landing happens where you are looking.
    if (!this.rmo) for (let i = 0; i < this.lays.length; i++) {
      const el = this.lays[i].el, r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 320) continue;
      const t = this.cl((vh * (1.0 - this.lays[i].s * 0.045) - r.top) / (vh * 0.62), 0, 1);
      const e = this.ez(t), k = 1 - e;
      if (k < 0.003) {
        if (el.__laid !== 1) { el.__laid = 1; el.style.transform = 'none'; el.style.opacity = ''; el.style.filter = 'none'; }
        continue;
      }
      el.__laid = 0;
      // SMALL AND EXACT beats big and mushy. 64°/-300px read as a cheap flip-in and, worse,
      // kept type illegible through the whole travel. 22°/-110px is unmistakably depth while
      // the words stay readable the entire way down.
      el.style.transform = 'perspective(1600px) translate3d(0,' + (k * 16).toFixed(1) + 'px,' + (-k * 110).toFixed(0) + 'px) rotateX(' + (k * 22).toFixed(2) + 'deg)';
      el.style.opacity = (0.22 + 0.78 * this.cl(e * 1.25, 0, 1)).toFixed(3);
      // Blur is the single most expensive thing here and a per-frame filter string forces a
      // repaint every frame — which is what "not smooth" actually was. Quantised to 5 steps
      // and gone entirely for the last third, so the landing is pin sharp.
      const b = k > 0.14 ? Number((Math.round(k * 5) / 5 * 2).toFixed(1)) : 0;
      const f = b > 0 ? 'blur(' + b.toFixed(1) + 'px)' : 'none';
      if (el.__f !== f) { el.__f = f; el.style.filter = f; }
    }

    // THE RECEIPTS LEDGER WRITES ITSELF. Each row's sparkline draws left to right as the
    // row reaches the reading line and its AFTER number rolls up out of its BEFORE number —
    // the section's whole argument performed instead of printed. Reversible: scrub back and
    // the ink runs out and the numbers fall to what the client had before.
    if (!this.rcp || !this.rcp.length || !this.rcp[0].row.isConnected) {
      this.rcp = [];
      const rows = document.querySelectorAll('#receipts [data-row]') as any;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], cells = row.querySelectorAll('[data-tnum]'), nums = [];
        // cells: 0 = index, 1 = booking rate, 2 = cost per booked, 3 = build days
        for (let c = 1; c <= 2; c++) {
          const cell = cells[c];
          if (!cell || !cell.children[1]) continue;
          const raw = cell.children[1].textContent || '';
          const from = parseFloat((cell.firstChild && cell.firstChild.textContent || '').replace(/[^0-9.]/g, ''));
          const to = parseFloat(raw.replace(/[^0-9.]/g, ''));
          if (!isFinite(from) || !isFinite(to)) continue;
          nums.push({ el: cell.children[1], from: from, to: to, pre: raw.charAt(0) === '$' ? '$' : '', suf: raw.indexOf('%') > 0 ? '%' : '', dec: raw.indexOf('.') > 0 ? 1 : 0 });
        }
        this.rcp.push({ row: row, svg: row.querySelector('svg'), nums: nums });
      }
    }
    for (let i = 0; i < this.rcp.length; i++) {
      const R = this.rcp[i], r = R.row.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 140) continue;
      // the write has to happen where the reader is LOOKING: a row starts inking just below
      // the fold and finishes at 0.58vh, so it resolves under the eye rather than off it
      const t = this.cl((vh * 1.0 - r.top) / (vh * 0.56), 0, 1), e = this.eo(t);
      if (R.svg) {
        // a horizontal wipe, not stroke-dashoffset: the polyline is stretched by
        // preserveAspectRatio="none" and carries vector-effect:non-scaling-stroke, so dash
        // lengths do not map cleanly onto the drawn line. A wipe is exact and cheaper.
        const cp = e > 0.995 ? 'none' : 'inset(-6px ' + ((1 - e) * 100).toFixed(2) + '% -6px -2px)';
        if (R.svg.style.clipPath !== cp) R.svg.style.clipPath = cp;
      }
      for (let j = 0; j < R.nums.length; j++) {
        const N = R.nums[j], v = N.from + (N.to - N.from) * e;
        const s = N.pre + (N.dec ? v.toFixed(1) : this.num(Math.round(v))) + N.suf;
        if (N.el.textContent !== s) N.el.textContent = s;
      }
    }

    // THE PROCESS TRACK IS PHYSICAL. A horizontal strip that only slides sideways is a
    // slideshow; each card now turns to face the reader as it reaches the middle of the
    // window and turns away as it leaves. Per-card perspective again, so no parent ever
    // needs preserve-3d and the cards can never intersect each other's planes. The falloff
    // is squared, so the centre of the track is dead flat and only the edges lean.
    const tr = this.n.track && this.n.track[0];
    if (tr && !this.rmo) {
      const W = document.documentElement.clientWidth || window.innerWidth || 1200, mid = W / 2;
      const kids = tr.children;
      for (let i = 0; i < kids.length; i++) {
        const c = kids[i], b = c.getBoundingClientRect();
        if (b.bottom < -60 || b.top > vh + 60 || b.right < -320 || b.left > W + 320) {
          if (c.style.transform) { c.style.transform = ''; c.style.opacity = ''; }
          continue;
        }
        const d = this.cl(((b.left + b.width / 2) - mid) / (W * 0.66), -1, 1), a = d * d;
        c.style.transform = 'perspective(2400px) rotateY(' + (-d * 24).toFixed(2) + 'deg) translateZ(' + (-a * 190).toFixed(0) + 'px)';
        c.style.opacity = (1 - a * 0.45).toFixed(3);
      }
    }

    // THE SEAM DRIVES ITSELF. #compare's slider only ever moved if you dragged it, so a
    // reader who scrolled past saw a static screenshot. It now sweeps across the section's
    // own travel and hands control over permanently the first time a pointer touches it.
    const box = this.n.cmp && this.n.cmp[0];
    if (box && !this.cmpTouched) {
      const r = box.getBoundingClientRect();
      if (r.bottom > -40 && r.top < vh + 40) {
        const x = 0.11 + 0.76 * this.ez(this.cl((vh * 0.86 - r.top) / (r.height + vh * 0.44), 0, 1));
        const pc = (x * 100).toFixed(2) + '%';
        if (this.n.cmptop) this.n.cmptop[0].style.clipPath = 'inset(0 0 0 ' + pc + ')';
        if (this.n.cmphandle) this.n.cmphandle[0].style.left = pc;
      }
    }
  }

  // Ledger heads PRINT themselves as they arrive: a scroll-linked character scramble that
  // resolves left to right. Scrub back up and they come apart again — it is a position
  // effect, never a one-shot entrance. Only spans of 5+ characters are touched, so the
  // ember diamond and the [data-rule] span are never hit.
  scramble(vh: any) {
    if (this.rmo == null) this.rmo = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (this.rmo) return;
    if (!this.scH || !this.scH.length || !this.scH[0].host.isConnected) {
      const heads = Array.prototype.slice.call(document.querySelectorAll('[data-para]') as any);
      this.scH = [];
      for (let i = 0; i < heads.length; i++) {
        const sp = [], kids = heads[i].children;
        for (let j = 0; j < kids.length; j++) {
          const k = kids[j];
          if (k.tagName !== 'SPAN') continue;
          const t = k.textContent || '';
          if (t.trim().length < 5) continue;
          sp.push({ el: k, txt: t });
        }
        if (sp.length) this.scH.push({ host: heads[i], sp: sp, on: 0 });
      }
    }
    const G = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\u00B7\u2014/#%';
    const step = ((this.frames || 0) % 5) === 0;
    for (let i = 0; i < this.scH.length; i++) {
      const H = this.scH[i], r = H.host.getBoundingClientRect();
      const gone = r.bottom < -40 || r.top > vh + 70;
      const t = this.cl((vh * 0.94 - r.top) / (vh * 0.30), 0, 1);
      if (gone || t >= 1) {
        if (H.on) { for (let j = 0; j < H.sp.length; j++) H.sp[j].el.textContent = H.sp[j].txt; H.on = 0; }
        continue;
      }
      H.on = 1;
      if (!step) continue;
      const e = this.eo(t);
      for (let j = 0; j < H.sp.length; j++) {
        const s = H.sp[j], L = s.txt.length, cut = Math.floor(L * e);
        let out = s.txt.slice(0, cut);
        for (let c = cut; c < L; c++) out += (s.txt[c] === ' ' ? ' ' : G[(Math.random() * G.length) | 0]);
        s.el.textContent = out;
      }
    }
  }

}
