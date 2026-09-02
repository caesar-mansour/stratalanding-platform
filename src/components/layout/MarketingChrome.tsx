'use client';

/*
 * Marketing chrome (Navbar, Footer, Lenis wrapper, widgets, analytics) behind a
 * CLIENT boundary with dynamic imports. Client-side next/dynamic only fetches a
 * chunk when the component actually renders — so standalone shells (/preview,
 * /times), which never render this, stop shipping ~400KB of marketing JS.
 * (next/dynamic inside the server root layout does NOT achieve this split.)
 * {children} arrives as a server-rendered slot and stays RSC.
 */

import { Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const Navbar = dynamic(() => import('@/components/layout').then((m) => m.Navbar));
const Footer = dynamic(() => import('@/components/layout').then((m) => m.Footer));
const MainWrapper = dynamic(() => import('@/components/layout').then((m) => m.MainWrapper));
const ScrollReset = dynamic(() => import('@/components/layout').then((m) => m.ScrollReset));
const ReferralCapture = dynamic(() => import('@/components/layout').then((m) => m.ReferralCapture));
const SkipLink = dynamic(() => import('@/components/layout/SkipLink').then((m) => m.SkipLink));
const StrataMetricsProvider = dynamic(() => import('@/components/analytics/StrataMetricsProvider').then((m) => m.StrataMetricsProvider));
const LazyWidgets = dynamic(() => import('@/components/layout/LazyWidgets').then((m) => m.LazyWidgets));

/**
 * AUDIT 2026-08-12 (PF-01): the standalone-shell decision moved HERE from the root layout.
 *
 * The root layout used to read `headers()` for an `x-pathname` the proxy injected, purely to decide
 * whether to render marketing chrome. Reading a request API in the ROOT layout opts the ENTIRE
 * route tree into dynamic rendering — that single line is why 982 of 988 routes rendered
 * per-request. `usePathname()` gives the same answer in a client component, works during SSR and
 * during static prerendering, and costs the route nothing.
 *
 * /times ships its own dark newspaper shell and /preview its own letterhead shell; both must not
 * inherit the marketing Navbar/Footer.
 */
const STANDALONE_PREFIXES = ['/times', '/preview'];

/**
 * Routes that close on their own footer.
 *
 * The homepage's final section (northline/sections/Start.tsx) IS the footer: the
 * close, the teardown form, the navigation columns and the full-width wordmark
 * all live inside one navy band, and the wordmark only works as the last thing
 * on the page. Rendering the global Footer underneath it produced two stacked
 * footers with duplicate navigation. The Navbar still renders here — the page
 * needs site navigation and the standing CTA — it just re-tones itself over the
 * northline grounds.
 */
const OWN_FOOTER_ROUTES = ['/'];

/**
 * Routes that render their own fixed header.
 *
 * The homepage's header is northline/NLChrome.tsx. It is not a restyled Navbar
 * — the scroll engine WRITES that element's background, backdrop-filter,
 * border-bottom-colour and transform on every frame, and it carries the
 * blueprint control. Rendering the global Navbar as well would put two fixed
 * bars on top of each other and give the engine's nav element a second writer.
 * NLChrome renders at every tier and in server HTML, and carries
 * `navigation.main`, the /login portal link and `cta.primary` unchanged, so
 * nothing is lost by standing the global bar down here.
 *
 * Same mechanism, same reason as OWN_FOOTER_ROUTES above.
 */
const OWN_HEADER_ROUTES = ['/'];

export function MarketingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  if (STANDALONE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  const ownFooter = OWN_FOOTER_ROUTES.includes(pathname);
  const ownHeader = OWN_HEADER_ROUTES.includes(pathname);

  return (
    <>
      <ScrollReset />
      <SkipLink />
      {ownHeader ? null : <Navbar />}
      <MainWrapper>
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </MainWrapper>
      {ownFooter ? null : <Footer />}
      <StrataMetricsProvider />
      <LazyWidgets />
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
    </>
  );
}
