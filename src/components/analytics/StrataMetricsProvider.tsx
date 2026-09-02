'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  captureFirstTouch,
  trackPageview,
  trackScrollDepth,
  trackTimeOnPage,
  flushAnalytics,
} from '@/lib/analytics';

export function StrataMetricsProvider() {
  const pathname = usePathname();
  const pageEnteredAt = useRef<number>(Date.now());
  const scrollMilestones = useRef<Set<number>>(new Set());
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AUDIT 2026-08-12 (P2): record the FIRST touch durably before anything else. Without this the
  // acquisition channel lived only in sessionStorage and was gone the moment the tab closed, so a
  // prospect who clicked a cold email on Monday and paid on Thursday looked like "direct".
  // captureFirstTouch() never overwrites an existing touch, so it is safe on every route change.
  useEffect(() => {
    captureFirstTouch();
  }, []);

  // Track pageview on route change
  useEffect(() => {
    trackPageview(pathname);

    // Reset for new page
    pageEnteredAt.current = Date.now();
    scrollMilestones.current = new Set();
  }, [pathname]);

  // Scroll depth tracking — 200ms throttle + self-removing after all milestones
  useEffect(() => {
    function checkMilestones() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          trackScrollDepth(milestone);
        }
      }

      // Self-remove after all milestones hit
      if (scrollMilestones.current.size >= 4) {
        window.removeEventListener('scroll', handleScroll);
      }
    }

    function handleScroll() {
      // 200ms throttle — only 4 coarse milestones needed
      if (throttleTimer.current) return;
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
        checkMilestones();
      }, 200);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
        throttleTimer.current = null;
      }
    };
  }, [pathname]);

  // Time on page tracking (fires on page exit)
  useEffect(() => {
    function handlePageExit() {
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (seconds > 0) {
        trackTimeOnPage(seconds);
        flushAnalytics();
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        handlePageExit();
      }
    }

    // Fire when navigating away or closing tab
    window.addEventListener('pagehide', handlePageExit);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      // Track time when route changes (component unmounts for new route)
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (seconds > 0) {
        trackTimeOnPage(seconds);
      }
      window.removeEventListener('pagehide', handlePageExit);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  return null;
}
