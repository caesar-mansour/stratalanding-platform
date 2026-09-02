// StrataMetrics — First-Party Analytics Tracking Library
// Zero third-party dependencies. All data stays in your database.
// Drop-in replacement for the old GA4 module — same exports, new backend.

// ============================================
// CONFIGURATION
// ============================================

const SITE_ID = "stratalanding";
const COLLECT_ENDPOINT = "/api/analytics/collect";
const FLUSH_INTERVAL_MS = 5000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEBUG_MODE = process.env.NEXT_PUBLIC_STRATA_METRICS_DEBUG === "true";
const SHOULD_TRACK = IS_PRODUCTION || DEBUG_MODE;

// Plan persistence key and expiry (24 hours)
const PLAN_STORAGE_KEY = "stratalanding_selected_plan";
const PLAN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const SESSION_KEY = "strata_session_id";
const UTM_KEY = "strata_utm";
// AUDIT 2026-08-12 (P2): FIRST-TOUCH attribution, in localStorage.
//
// Attribution used to live in sessionStorage, so it died the moment the tab closed. A prospect who
// clicks a cold email on Monday and pays on Thursday arrived as "direct" — which makes it
// impossible to answer the one question that matters when outbound starts: which channel produced
// a paying client. localStorage with a 90-day window survives the real buying cycle, and the FIRST
// touch is never overwritten by a later one (a prospect who arrives via email and later returns via
// a Google search should still be credited to the email).
const FIRST_TOUCH_KEY = "strata_first_touch";
const FIRST_TOUCH_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface FirstTouch {
  utm: UtmParams;
  referrer: string;
  landing_page: string;
  at: number;
}

/** Record the first touch once, and never overwrite it. Safe to call on every page view. */
export function captureFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FirstTouch;
      if (parsed && Date.now() - parsed.at < FIRST_TOUCH_TTL_MS) return parsed;
    }

    const params = new URLSearchParams(window.location.search);
    const utm: UtmParams = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
      const v = params.get(k);
      if (v) utm[k] = v;
    }

    const touch: FirstTouch = {
      utm,
      referrer: document.referrer || "",
      landing_page: window.location.pathname,
      at: Date.now(),
    };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return null; // private browsing / storage disabled — never break the page for analytics
  }
}

/** The first touch if one is recorded and still inside the window. */
export function getFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirstTouch;
    return parsed && Date.now() - parsed.at < FIRST_TOUCH_TTL_MS ? parsed : null;
  } catch {
    return null;
  }
}

// ============================================
// TYPES
// ============================================

export type AnalyticsEvent =
  | "pageview"
  | "cta_click"
  | "section_view"
  | "brief_view"
  | "brief_submit"
  | "quote_view"
  | "quote_submit"
  | "form_start"
  | "demo_view"
  | "plan_select"
  | "begin_checkout"
  | "purchase"
  | "scroll_depth"
  | "time_on_page"
  | "partner_view"
  | "partner_signup_start"
  | "partner_signup_submit"
  | "partner_link_copy";

export type PageType =
  | "home"
  | "brief"
  | "quote"
  | "demos"
  | "demo_detail"
  | "about"
  | "pricing"
  | "privacy"
  | "terms"
  | "partners"
  | "partner_portal";

export interface EventParams {
  cta_location?: string;
  cta_variant?: "primary" | "secondary" | "ghost";
  destination?: string;
  cta_source?: string;
  page_type?: PageType;
  form_type?: "brief" | "quote";
  form_step?: number;
  demo_slug?: string;
  demo_goal?: string;
  plan?: "starter" | "growth" | "scale";
  value?: number;
  currency?: string;
  // StrataMetrics additions
  depth?: number;
  seconds?: number;
}

interface StoredPlan {
  plan: "starter" | "growth" | "scale";
  timestamp: number;
}

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

interface QueuedEvent {
  session_id: string;
  event_type: string;
  url: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  props?: Record<string, unknown>;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_width?: number;
  screen_height?: number;
}

// ============================================
// SESSION & DEVICE DETECTION
// ============================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  // AUDIT 2026-08-12 (P2): prefer the durable FIRST touch. The per-tab value below only survives
  // the current session, so on its own it credited a returning buyer to "direct".
  const first = getFirstTouch();
  if (first && Object.keys(first.utm).length > 0) return first.utm;

  // Check sessionStorage first (persisted from initial landing)
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fall through to URL check
    }
  }

  // Extract from current URL
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  if (params.get("utm_source")) utm.utm_source = params.get("utm_source")!;
  if (params.get("utm_medium")) utm.utm_medium = params.get("utm_medium")!;
  if (params.get("utm_campaign")) utm.utm_campaign = params.get("utm_campaign")!;
  if (params.get("utm_term")) utm.utm_term = params.get("utm_term")!;
  if (params.get("utm_content")) utm.utm_content = params.get("utm_content")!;

  // Persist if we found any
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  }

  return utm;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

function getOS(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Other";
}

// ============================================
// EVENT QUEUE & FLUSHING
// ============================================

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function buildEvent(
  eventType: string,
  params?: EventParams
): QueuedEvent {
  const utm = getUtmParams();

  return {
    session_id: getSessionId(),
    event_type: eventType,
    url: typeof window !== "undefined" ? window.location.pathname : "",
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    ...utm,
    props: params ? { ...params } : {},
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screen_width: typeof window !== "undefined" ? window.screen.width : undefined,
    screen_height: typeof window !== "undefined" ? window.screen.height : undefined,
  };
}

function enqueueEvent(event: QueuedEvent): void {
  eventQueue.push(event);
  ensureFlushTimer();
}

function ensureFlushTimer(): void {
  if (typeof window === "undefined") return;

  if (!flushTimer) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);
  }
}

function flushEvents(): void {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  const payload = JSON.stringify({
    site_id: SITE_ID,
    events: eventsToSend,
  });

  // Use sendBeacon for reliability (works during page unload)
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon(COLLECT_ENDPOINT, blob);
    if (!sent) {
      // Fallback to fetch if sendBeacon fails
      fetchFallback(payload);
    }
  } else {
    fetchFallback(payload);
  }
}

function fetchFallback(payload: string): void {
  fetch(COLLECT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Silently fail — analytics should never break the app
  });
}

// Set up page unload flushing
if (typeof window !== "undefined") {
  // Flush on page visibility change (tab switch, minimize)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });

  // Flush before page unload
  window.addEventListener("pagehide", flushEvents);
}

// ============================================
// CORE TRACKING FUNCTION
// ============================================

export function track(eventName: AnalyticsEvent, params?: EventParams): void {
  // Always log in development for debugging
  if (!IS_PRODUCTION) {
    console.log(
      `[StrataMetrics${DEBUG_MODE ? " DEBUG" : ""}] ${eventName}`,
      params || {}
    );
  }

  if (!SHOULD_TRACK) return;
  if (typeof window === "undefined") return;

  const event = buildEvent(eventName, params);
  enqueueEvent(event);
}

// ============================================
// PLAN PERSISTENCE (localStorage)
// ============================================

export function persistPlan(plan: "starter" | "growth" | "scale"): void {
  if (typeof window === "undefined") return;

  const data: StoredPlan = {
    plan,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage not available or full
  }
}

export function getPersistedPlan():
  | "starter"
  | "growth"
  | "scale"
  | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!stored) return undefined;

    const data: StoredPlan = JSON.parse(stored);
    const age = Date.now() - data.timestamp;

    if (age <= PLAN_EXPIRY_MS) {
      return data.plan;
    }

    localStorage.removeItem(PLAN_STORAGE_KEY);
    return undefined;
  } catch {
    return undefined;
  }
}

export function clearPersistedPlan(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// ============================================
// TYPED HELPER FUNCTIONS
// ============================================

/**
 * ⚠️ `pageType` DEFAULTS TO "home", AND THAT DEFAULT IS A KNOWN HAZARD.
 *
 * A default that is right by coincidence is one that goes wrong the first time
 * the code is reused. It already has: `Band14Bedrock.tsx:177` ships on the
 * /pricing route and reports `page_type: "home"`, because it relies on this
 * default. Every homepage call site passes "home" explicitly.
 *
 * Making the parameter REQUIRED was tried — tsc is a cheaper and more reliable
 * enforcement than any gate script — and reverted. It breaks ten call sites,
 * SEVEN of them under src/components/strata/, which is another session's
 * in-progress work on this shared branch. Leaving the repo uncompilable for
 * someone else is a worse defect than the one being fixed, and editing their
 * files to fix it is how two sessions collide.
 *
 * TO FINISH THIS: when the strata/bands work lands, drop the default and let
 * tsc take over. The Band14Bedrock mislabel is real and should go with it.
 */
export function trackCtaClick(
  location: string,
  variant: "primary" | "secondary" | "ghost",
  destination: string,
  pageType: PageType = "home"
): void {
  track("cta_click", {
    cta_location: location,
    cta_variant: variant,
    destination,
    page_type: pageType,
  });
  // remember which CTA drove the journey so brief_submit is attributable
  try {
    sessionStorage.setItem("strata_cta_source", location);
  } catch {
    // ignore
  }
}

/** Fire once when a section (or its CTA) scrolls into view — gives reach a denominator. */
export function trackSectionView(section: string): void {
  track("section_view", { cta_location: section });
}

/**
 * H3 Goal Router — the buyer toggled a goal key. Measured as a cta_click so it shows in the
 * funnel ("which job resonates"), but deliberately does NOT persist strata_cta_source: a goal
 * toggle is an exploratory signal, not the journey-driving click (that's the demo/brief link).
 * Keeping cta_source clean means brief_submit attribution reflects the link the buyer actually
 * pursued, not their last idle toggle.
 */
export function trackGoalSelect(goal: string): void {
  track("cta_click", {
    cta_location: `what_we_build_goal_${goal}`,
    cta_variant: "ghost",
    destination: "select",
    page_type: "home",
  });
}

export function trackFormStart(formType: "brief" | "quote"): void {
  track("form_start", {
    form_type: formType,
  });
}

export function trackBriefView(): void {
  track("brief_view", {
    page_type: "brief",
  });
}

export function trackBriefSubmit(budgetSelection?: string): void {
  let plan = getPersistedPlan();

  if (!plan && budgetSelection) {
    plan = normalizePlan(budgetSelection);
  }

  let ctaSource: string | undefined;
  try {
    ctaSource = sessionStorage.getItem("strata_cta_source") ?? undefined;
  } catch {
    ctaSource = undefined;
  }

  track("brief_submit", {
    form_type: "brief",
    page_type: "brief",
    ...(plan && { plan }),
    ...(ctaSource && { cta_source: ctaSource }),
  });

  clearPersistedPlan();
  try {
    sessionStorage.removeItem("strata_cta_source");
  } catch {
    // ignore
  }
}

export function trackQuoteView(): void {
  track("quote_view", {
    page_type: "quote",
  });
}

export function trackQuoteSubmit(): void {
  const plan = getPersistedPlan();

  track("quote_submit", {
    form_type: "quote",
    page_type: "quote",
    ...(plan && { plan }),
  });

  clearPersistedPlan();
}

export function trackDemoView(slug: string, goal?: string): void {
  track("demo_view", {
    demo_slug: slug,
    page_type: "demo_detail",
    ...(goal && { demo_goal: goal }),
  });
}

export function trackPlanSelect(plan: "starter" | "growth" | "scale"): void {
  persistPlan(plan);

  track("plan_select", {
    plan,
    page_type: "home",
  });
}

export function trackBeginCheckout(
  plan: "starter" | "growth" | "scale",
  value: number
): void {
  track("begin_checkout", {
    plan,
    value,
    currency: "USD",
  });
}

export function trackPurchase(
  plan: "starter" | "growth" | "scale",
  value: number
): void {
  track("purchase", {
    plan,
    value,
    currency: "USD",
  });

  clearPersistedPlan();
}

// ============================================
// PAGEVIEW TRACKING (called by StrataMetricsProvider)
// ============================================

export function trackPageview(pathname: string): void {
  track("pageview", {
    page_type: inferPageType(pathname),
  });
}

function inferPageType(pathname: string): PageType {
  if (pathname === "/") return "home";
  if (pathname === "/brief") return "brief";
  if (pathname === "/quote") return "quote";
  if (pathname === "/demos") return "demos";
  if (pathname.startsWith("/demos/")) return "demo_detail";
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  if (pathname === "/partners") return "partners";
  if (pathname.startsWith("/partner-portal")) return "partner_portal";
  return "home";
}

// ============================================
// SCROLL DEPTH TRACKING (called by StrataMetricsProvider)
// ============================================

export function trackScrollDepth(depth: number): void {
  track("scroll_depth", { depth });
}

// ============================================
// TIME ON PAGE TRACKING (called by StrataMetricsProvider)
// ============================================

export function trackTimeOnPage(seconds: number): void {
  track("time_on_page", { seconds });
}

// ============================================
// PARTNER TRACKING
// ============================================

export function trackPartnerView(): void {
  track("partner_view", { page_type: "partners" });
}

export function trackPartnerSignupStart(): void {
  track("partner_signup_start", { page_type: "partners" });
}

export function trackPartnerSignupSubmit(): void {
  track("partner_signup_submit", { page_type: "partners" });
}

export function trackPartnerLinkCopy(): void {
  track("partner_link_copy", { page_type: "partner_portal" });
}

// ============================================
// FLUSH (exposed for provider cleanup)
// ============================================

export function flushAnalytics(): void {
  flushEvents();
}

// ============================================
// UTILITIES
// ============================================

function normalizePlan(
  budget?: string
): "starter" | "growth" | "scale" | undefined {
  if (!budget) return undefined;
  const lower = budget.toLowerCase();
  if (lower.includes("starter") || lower.includes("2,400")) return "starter";
  if (lower.includes("growth") || lower.includes("4,800")) return "growth";
  if (lower.includes("scale") || lower.includes("9,600")) return "scale";
  return undefined;
}

// ============================================
// STRATAMETRICS EVENT REFERENCE
// ============================================
/*
| Event          | Trigger                        | Key Props                              |
|----------------|--------------------------------|----------------------------------------|
| pageview       | Route change (auto)            | page_type                              |
| cta_click      | Any CTA button click           | cta_location, cta_variant, destination |
| brief_view     | /brief page load               | page_type                              |
| brief_submit   | Brief form submit success      | form_type, plan, page_type             |
| quote_view     | /quote page load               | page_type                              |
| quote_submit   | Quote form submit success      | form_type, plan, page_type             |
| form_start     | First form field interaction   | form_type                              |
| demo_view      | Demo page view                 | demo_slug, demo_goal, page_type        |
| plan_select    | Pricing card CTA click         | plan, page_type                        |
| begin_checkout | PayPal checkout initiated      | plan, value, currency                  |
| purchase       | PayPal payment success         | plan, value, currency                  |
| scroll_depth   | Scroll milestones (auto)       | depth (25, 50, 75, 100)               |
| time_on_page   | Page exit (auto)               | seconds                                |

CONVERSION FUNNEL:
- pageview (home) → plan_select → pageview (brief/quote) → brief_submit/quote_submit

PLAN ATTRIBUTION:
- plan_select persists plan to localStorage with 24hr expiry
- brief_submit and quote_submit include persisted plan if within window
- Plan is cleared after successful form submission
*/
