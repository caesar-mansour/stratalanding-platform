import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { MobileProvider } from '@/lib/MobileContext';

/**
 * Server-side mobile detection, scoped to the routes that actually consume it.
 *
 * AUDIT 2026-08-12 (PF-01): this read used to live in the ROOT layout, where a single
 * `await headers()` opted every route in the app into per-request rendering. It exists for a real
 * reason — the STRATA CUT bands read `useIsMobile()` to skip Framer Motion hydration on phones,
 * which is what keeps mobile TBT near zero — but only a handful of routes render those components.
 *
 * Wrapping just those routes keeps the optimisation exactly as it was while letting every other
 * route prerender. A route that uses this IS dynamic, and that is the correct trade: it renders
 * per-request because its OUTPUT genuinely depends on the request.
 *
 * `useIsMobile()` defaults to false without a provider, so a route that does not wrap itself in
 * this simply gets the desktop path — no crash, no mismatch.
 */
export async function MobileShell({ children }: { children: ReactNode }) {
  const ua = (await headers()).get('user-agent') ?? '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  return <MobileProvider isMobile={isMobile}>{children}</MobileProvider>;
}
