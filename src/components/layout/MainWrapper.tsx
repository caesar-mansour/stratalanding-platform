"use client";

import { usePathname } from "next/navigation";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No padding on admin/portal/demo routes (they have their own headers or none)
  const isAdminOrPortal = pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.startsWith('/partner-portal');
  const isIndividualDemo = pathname.startsWith('/demos/') && pathname !== '/demos';
  const noPadding = isAdminOrPortal || isIndividualDemo;

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* AUDIT 2026-08-12 (P2): this was a <main>, nested inside MarketingChrome's <main
          id="main-content">. Two (sometimes three) main landmarks on a page is invalid — a
          screen reader offers several "main content" targets and the skip link's destination
          becomes ambiguous. There must be exactly one, and MarketingChrome owns it because that
          is what the skip link points at. */}
      <div className={`flex-1 ${noPadding ? '' : ''}`}>
        {children}
      </div>
    </div>
  );
}
