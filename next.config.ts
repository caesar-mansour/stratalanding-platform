import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A production build and `next dev` both own `.next`, so verifying a build
  // meant killing whatever dev server was running — which on this repo is often
  // someone else's. NEXT_DIST_DIR lets a build go somewhere else:
  //   NEXT_DIST_DIR=.next-prod npx next build
  //   NEXT_DIST_DIR=.next-prod npx next start -p 3011
  // Unset, it is exactly the default, so nothing about a normal build or a
  // Netlify deploy changes.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Security headers — SAMEORIGIN allows our homepage to iframe demo pages
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // AUDIT 2026-08-12 (P3): kept byte-identical to netlify.toml — the two sets had
          // drifted, so a response served by the CDN carried a different policy from one
          // served by Next, and only one of them mentioned payment at all.
          { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), payment=(self "https://www.paypal.com" "https://www.sandbox.paypal.com")' },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // AUDIT 2026-08-12: the static CSP moved to src/proxy.ts, which issues a PER-REQUEST
          // NONCE. A second, static CSP here would be sent alongside it and the browser enforces
          // the INTERSECTION of all CSP headers — the weaker static one could not loosen the
          // nonce policy, but it would silently block anything the nonce policy allows and this
          // one does not. One policy, one place.
        ],
      },
    ];
  },
  // AUDIT 2026-08-12 (P2 PF-09): the build emitted 223.4 MB of .js.map into .next/server across
  // 5,871 files, against only 75.0 MB of actual server JS. Netlify/AWS caps a function bundle at
  // 250 MB unzipped and the Next runtime packages .next/server into the server handler, so this
  // alone could fail a deploy. Server source maps are not readable in Netlify's log UI anyway.
  productionBrowserSourceMaps: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  experimental: {
    // AUDIT 2026-08-12 (P2 PF-09): stop emitting server source maps (see note above).
    serverSourceMaps: false,
    optimizePackageImports: ['framer-motion', 'lucide-react'],
    // AUDIT 2026-08-12 (Phase 6): removed. `cssChunking: 'strict'` is a WEBPACK-only option and
    // this project builds with Turbopack, so it was silently doing nothing. Next 16.3.0 turned
    // that mismatch into a hard build error, which is how it surfaced.
    // AUDIT 2026-08-13: `optimizeCss` was REMOVED because it never did anything
    // here. Beasties' only call site in Next 16.3 is
    // next/dist/server/post-process.js, reached solely from server/render.js —
    // the PAGES router. app-render.js contains no reference to it, this repo has
    // no pages/ directory, and node_modules/critters does not exist, so the path
    // would throw if it were ever reached. The homepage prerenders and its
    // <head> still carried ZERO inlined CSS. Same class of dead config as the
    // `cssChunking: 'strict'` recorded above — that one became a hard build
    // error in 16.3, which is why it was noticed; this one validates silently,
    // which is why it was not.
    //
    // ⚠️ `inlineCss` WAS TRIED AND IS OFF. It is the live replacement for
    // optimizeCss and it does work under Turbopack — renderCssResource in
    // app-page-turbo.runtime.prod.js emitted <style> instead of <link>, zero
    // render-blocking requests, 254KB inlined into the head. It is also much
    // worse here, and the reason is not the one I expected:
    //
    //                    linked        inlined
    //   perf               87            73
    //   LCP               4.1s          4.5s
    //   TBT                11ms         408ms      <- 37x
    //   Speed Index        1.5s          2.0s
    //
    // Parsing a quarter of a megabyte of CSS on the main thread costs ~400ms at
    // Lighthouse mobile's 4x CPU throttle. The document went 347KB -> 1,107KB
    // raw (182KB over the wire gzipped), and trading a cacheable parallel
    // request for that much main-thread parse work is a straight loss. TBT was
    // this page's best metric and inlining destroyed it.
    //
    // Worth revisiting ONLY if the sheet gets dramatically smaller — full
    // route-scoped Tailwind for `/` would take it to ~16KB gz, at which point
    // the arithmetic changes. Not before.
  },
};

export default nextConfig;
