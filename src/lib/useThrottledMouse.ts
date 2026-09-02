'use client';

import { useRef, useCallback } from 'react';

interface ThrottledMouseResult {
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

/**
 * rAF-throttled mouse tracking with cached getBoundingClientRect.
 * - Only updates once per animation frame (max 60Hz)
 * - Caches element rect on mouseenter (not every mousemove)
 * - Cleans up rAF on unmount via the returned handlers
 */
export function useThrottledMouse(
  onMove: (relX: number, relY: number, rect: DOMRect) => void,
  onLeave: () => void
): ThrottledMouseResult {
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number>(0);
  const latestEvent = useRef<{ clientX: number; clientY: number } | null>(null);

  const handleEnter = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    rectRef.current = el.getBoundingClientRect();
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      latestEvent.current = { clientX: e.clientX, clientY: e.clientY };

      if (rafRef.current) return; // already queued

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const ev = latestEvent.current;
        const rect = rectRef.current;
        if (!ev || !rect) return;
        onMove(ev.clientX, ev.clientY, rect);
      });
    },
    [onMove]
  );

  const handleLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    latestEvent.current = null;
    rectRef.current = null;
    onLeave();
  }, [onLeave]);

  return {
    onMouseEnter: handleEnter,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
  };
}
