'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Drop into any layout to auto-refresh server data on an interval.
 * Uses Next.js router.refresh() — re-runs server components without a full page reload.
 *
 * COST (Neon): each refresh re-queries the database, and anything that queries more often than
 * Neon's 5-minute scale-to-zero window keeps the DB awake 24/7. So this only refreshes when you're
 * ACTIVELY using the page: it skips while the tab is hidden AND while you've been idle (no mouse/
 * key/scroll) for `idleSeconds`. Walk away or switch tabs → polling stops → the DB sleeps → no cost.
 * Come back / interact → it refreshes immediately so data is never stale.
 */
export default function AutoRefresh({
  interval = 60,
  idleSeconds = 120,
}: { interval?: number; idleSeconds?: number }) {
  const router = useRouter();
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    const markActive = () => { lastActivity.current = Date.now(); };
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;           // tab not visible
      if (Date.now() - lastActivity.current > idleSeconds * 1000) return;       // idle → let DB sleep
      router.refresh();
    };
    const id = setInterval(tick, interval * 1000);

    const onVisible = () => {
      if (!document.hidden) { lastActivity.current = Date.now(); router.refresh(); }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      activityEvents.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, [router, interval, idleSeconds]);

  return null;
}
