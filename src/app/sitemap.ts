import { MetadataRoute } from "next";
import { solutionNicheData } from "@/lib/seo/niche-data";
import { getAllPosts } from "@/lib/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://stratalanding.com";
  // AUDIT 2026-08-12 (P2 SEO-26): every entry used `new Date()`, so each deploy told Google the
  // entire site had just changed. Google learns to distrust a lastmod that is always "now" and
  // starts ignoring it, which costs you the signal on the pages that DID change. A fixed date per
  // content-stability tier is honest and useful: bump these when the content actually changes.
  const CONTENT_UPDATED = new Date("2026-08-12T00:00:00.000Z"); // marketing copy last revised
  const LEGAL_UPDATED = new Date("2026-08-12T00:00:00.000Z");   // privacy/terms last revised
  const currentDate = CONTENT_UPDATED;

  // ── Static pages ──────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/demos`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/brief`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/case-studies`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      // AUDIT 2026-08-12 (P2 SEO-27): /partners was missing from the sitemap entirely.
      url: `${baseUrl}/partners`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: LEGAL_UPDATED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // ── Pricing subpages ──────────────────────────────────────────
  const pricingSlugs = ["presence-page", "lead-page", "purchase-page"];
  const pricingPages: MetadataRoute.Sitemap = pricingSlugs.map((slug) => ({
    url: `${baseUrl}/pricing/${slug}`,
    lastModified: currentDate,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // ── Solution pages by niche (reads dynamically from niche-data) ──
  const solutionPages: MetadataRoute.Sitemap = Object.keys(solutionNicheData).map(
    (niche) => ({
      url: `${baseUrl}/solutions/${niche}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })
  );

  // ── Blog posts ──────────────────────────────────────────────
  const blogPages: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── Demo pages — DELIBERATELY EXCLUDED ────────────────────────────
  // AUDIT 2026-08-12 (P1 SEO-17). The 793 demos are sales assets, not SEO assets (founder
  // decision), and are served noindex,follow via generateDemoMetadata(). Listing noindex URLs in
  // a sitemap sends Google a contradictory signal, so they are not emitted here.
  //
  // This ALSO removes a latent production bug: the previous implementation discovered demo slugs
  // with fs.readdirSync("src/app/demos") AT RUNTIME. The source tree is not present in the Netlify
  // serverless bundle, so the try/catch silently yielded [] in production — the sitemap worked
  // locally and shipped without those URLs anyway.

  return [
    ...staticPages,
    ...pricingPages,
    ...solutionPages,
    ...blogPages,
  ];
}
