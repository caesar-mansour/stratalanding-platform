'use client';

import { usePerformanceMonitor } from '@/lib/animation-perf';

/**
 * Drop-in client component that starts the FPS monitor.
 * Mount once in the root layout. Self-disables after 10s on fast devices.
 */
export function PerformanceMonitor() {
  usePerformanceMonitor();
  return null;
}
