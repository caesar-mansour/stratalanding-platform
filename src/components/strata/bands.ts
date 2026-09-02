/**
 * THE STRATA CUT — the band manifest. Single source of truth for the Rail,
 * the Depth Line, and page composition. Order is the descent.
 *
 * anchor = DOM id (external contract: #pricing, #how-it-works, #proof,
 * #what-we-build, #ai-assistant, #testimonials must survive).
 * analyticsId = section_view id (dashboard contract — never rename).
 * railTone = the stratum's fill color in the collected core.
 */

export type StrataBand = {
  key: string;
  code: string; // marginalia code, "" for non-stratum bands
  name: string;
  anchor?: string;
  analyticsId?: string;
  world: "paper" | "deep";
  railTone?: string; // only strata + bedrock appear in the core rail
};

export const BANDS: StrataBand[] = [
  { key: "surface",     code: "",      name: "SURFACE",         world: "paper" },
  { key: "cleave",      code: "",      name: "THE CLEAVE",      world: "paper" },
  { key: "bores",       code: "",      name: "THE BORES",       anchor: "what-we-build", analyticsId: "what_we_build", world: "paper" },
  { key: "claim",       code: "ST.01", name: "THE CLAIM",       world: "paper", railTone: "#CFE2EF" },
  { key: "design",      code: "ST.02", name: "THE DESIGN",      world: "paper", railTone: "#AECBE2" },
  { key: "motion",      code: "ST.03", name: "THE MOTION",      world: "paper", railTone: "#8AB0D2" },
  { key: "watertable",  code: "",      name: "THE WATER TABLE", anchor: "why-not-diy", analyticsId: "why_not_diy", world: "deep" },
  { key: "speed",       code: "ST.04", name: "THE SPEED",       anchor: "proof", analyticsId: "proof", world: "deep", railTone: "#0E2A52" },
  { key: "proof",       code: "ST.05", name: "THE PROOF",       anchor: "testimonials", analyticsId: "testimonials", world: "deep", railTone: "#0C2244" },
  { key: "archive",     code: "",      name: "THE ARCHIVE",     anchor: "demo-preview", analyticsId: "demo_preview", world: "deep" },
  { key: "mechanics",   code: "ST.06", name: "THE MECHANICS",   world: "deep", railTone: "#0A1B36" },
  { key: "window",      code: "ST.07", name: "THE MEASUREMENT", anchor: "client-portal", analyticsId: "client_portal", world: "deep", railTone: "#081428" },
  { key: "foundation",  code: "ST.08", name: "THE FOUNDATION",  anchor: "how-it-works", analyticsId: "how_it_works", world: "deep", railTone: "#060D1C" },
  { key: "assay",       code: "",      name: "THE ASSAY",       anchor: "ai-assistant", analyticsId: "ai_assistant", world: "deep" },
  { key: "bedrock",     code: "",      name: "BEDROCK",         anchor: "pricing", analyticsId: "pricing", world: "deep", railTone: "#05070D" },
  { key: "resurfacing", code: "",      name: "THE RESURFACING", analyticsId: "cta_band", world: "deep" },
];

/** The 9 segments the core rail collects (8 strata + bedrock). */
export const RAIL_SEGMENTS = BANDS.filter((b) => b.railTone);

/** data-strata-band attribute → BANDS key; sentinels observed by Rail/DepthLine. */
export const BAND_ATTR = "data-strata-band";
