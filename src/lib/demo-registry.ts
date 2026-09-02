// Demo Registry — server-importable demo data for metadata, sitemap, and SEO
// This file must NOT have "use client" so server components can import it

export interface DemoEntry {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  category: string;
  href: string;
  goal: string;
  goalLabel: string;
  bestFor: string;
  keySections: string[];
  plan: string;
}

// Re-export the additional demos array (already has no "use client")
// AUDIT 2026-08-12 (Phase 6): this was a re-export only, so `additionalDemos` was NOT in this
// module's scope — getDemoBySlug() reached it via a require() call instead, which the updated
// lint config rejects. Import it properly and re-export, so both work.
import { additionalDemos } from "./additional-demos";
export { additionalDemos };

// NOTE: The main demo list is defined inline in src/app/demos/page.tsx (a "use client" file).
// To avoid duplicating entries, we dynamically build a slug→metadata map at build time.
// The generation script reads the demos data and creates per-directory layout.tsx files.

/**
 * Lookup a demo by its slug (directory name / id).
 * Falls back to generating a reasonable metadata from the slug itself.
 */
export function getDemoBySlug(slug: string): DemoEntry | null {
  // Try additional demos first (500 entries, server-importable)
  // AUDIT 2026-08-12 (Phase 6): was a require() call. Uses the static import at the top instead.
  const found = additionalDemos.find((d: DemoEntry) => d.id === slug);
  if (found) return found;
  return null;
}

/**
 * Build SEO-friendly title from a slug.
 * "ai-writing-tool" → "AI Writing Tool"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => {
      if (["ai", "hr", "it", "vr", "dj", "pos", "crm", "api", "tcm", "3d"].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
