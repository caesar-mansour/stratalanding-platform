"use client";

import { createContext, useContext, ReactNode } from "react";

/**
 * Server-detected mobile flag, propagated to client components via context.
 *
 * The point: motion components (AnimatedSection, AnimatedText, etc.) read
 * this and short-circuit to plain markup on phones. Result: zero Framer
 * Motion hydration on mobile devices, dramatically cutting TBT — while
 * desktop keeps the full animated experience untouched.
 *
 * Detection happens once on the server (from the User-Agent header) and is
 * passed in as a stable prop, so there is no hydration mismatch.
 */
const MobileContext = createContext(false);

export function MobileProvider({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: ReactNode;
}) {
  return (
    <MobileContext.Provider value={isMobile}>{children}</MobileContext.Provider>
  );
}

export function useIsMobile(): boolean {
  return useContext(MobileContext);
}
