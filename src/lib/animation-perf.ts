'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// ─── Device Tier Detection ─────────────────────────────────────

export type DeviceTier = 'high' | 'mid' | 'low';
export type PerformanceLevel = 'full' | 'reduced' | 'minimal';

function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'high';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return 'low';

  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  const saveData = conn?.saveData ?? false;

  if (saveData) return 'low';
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'mid';
  return 'low';
}

function detectIsTouchOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(hover: hover)').matches;
}

// ─── Hooks ─────────────────────────────────────────────────────

let cachedTier: DeviceTier | null = null;
let cachedTouch: boolean | null = null;

/** Returns the device performance tier (cached across renders). */
export function useDeviceTier(): DeviceTier {
  const [tier] = useState<DeviceTier>(() => {
    if (cachedTier) return cachedTier;
    cachedTier = detectDeviceTier();
    return cachedTier;
  });
  return tier;
}

/** True when the device is touch-only (no hover capability). */
export function useIsTouchDevice(): boolean {
  const [touch] = useState<boolean>(() => {
    if (cachedTouch !== null) return cachedTouch;
    cachedTouch = detectIsTouchOnly();
    return cachedTouch;
  });
  return touch;
}

// ─── Runtime FPS Monitor ───────────────────────────────────────

const PERF_EVENTS = {
  DEGRADE: 'sl-perf-degrade',
  RESTORE: 'sl-perf-restore',
} as const;

/**
 * Monitors FPS in real-time using requestAnimationFrame.
 * Dispatches custom events when performance drops or recovers.
 * Self-disables after 10s if consistently smooth.
 *
 * Call once at the app root (e.g. in layout).
 */
export function usePerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameId: number;
    let lastTime = performance.now();
    const frameTimes: number[] = [];
    const MAX_SAMPLES = 30;

    let degradedSince: number | null = null;
    let recoveredSince: number | null = null;
    let currentLevel: PerformanceLevel = 'full';
    let stableFrames = 0;
    const STABLE_THRESHOLD = 600; // ~10s at 60fps

    function tick(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      // Only track reasonable deltas (skip tab-switch spikes)
      if (delta > 0 && delta < 200) {
        frameTimes.push(delta);
        if (frameTimes.length > MAX_SAMPLES) frameTimes.shift();
      }

      if (frameTimes.length >= 10) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avg;

        // Check for degradation
        if (fps < 45) {
          recoveredSince = null;
          if (!degradedSince) {
            degradedSince = now;
          } else if (now - degradedSince > 500) {
            if (currentLevel === 'full') {
              currentLevel = 'reduced';
              window.dispatchEvent(new CustomEvent(PERF_EVENTS.DEGRADE, { detail: { level: 'reduced' } }));
            } else if (currentLevel === 'reduced' && now - degradedSince > 1500) {
              currentLevel = 'minimal';
              window.dispatchEvent(new CustomEvent(PERF_EVENTS.DEGRADE, { detail: { level: 'minimal' } }));
            }
          }
          stableFrames = 0;
        } else if (fps > 55) {
          degradedSince = null;
          if (currentLevel !== 'full') {
            if (!recoveredSince) {
              recoveredSince = now;
            } else if (now - recoveredSince > 2000) {
              currentLevel = 'full';
              window.dispatchEvent(new CustomEvent(PERF_EVENTS.RESTORE));
              recoveredSince = null;
            }
          }
          stableFrames++;
        } else {
          // Middle ground — reset both timers
          degradedSince = null;
          recoveredSince = null;
          stableFrames++;
        }
      }

      // Self-disable if stable for ~10s
      if (stableFrames > STABLE_THRESHOLD && currentLevel === 'full') {
        return; // stop the loop
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);
}

/**
 * Listens to performance events and returns the current level.
 * Components use this to conditionally reduce their animations.
 */
export function usePerformanceLevel(): PerformanceLevel {
  const [level, setLevel] = useState<PerformanceLevel>('full');

  useEffect(() => {
    function onDegrade(e: Event) {
      const detail = (e as CustomEvent).detail;
      setLevel(detail?.level || 'reduced');
    }
    function onRestore() {
      setLevel('full');
    }

    window.addEventListener(PERF_EVENTS.DEGRADE, onDegrade);
    window.addEventListener(PERF_EVENTS.RESTORE, onRestore);
    return () => {
      window.removeEventListener(PERF_EVENTS.DEGRADE, onDegrade);
      window.removeEventListener(PERF_EVENTS.RESTORE, onRestore);
    };
  }, []);

  return level;
}

// ─── Shared IntersectionObserver Pool ──────────────────────────

type VisibilityCallback = (isVisible: boolean) => void;

const observerMap = new WeakMap<Element, VisibilityCallback>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = observerMap.get(entry.target);
        if (cb) cb(entry.isIntersecting);
      }
    },
    { rootMargin: '100px', threshold: 0.1 }
  );
  return sharedObserver;
}

/**
 * Observes an element's viewport visibility using a shared IntersectionObserver.
 * Returns `isVisible` (true when element is in/near viewport).
 */
export function useVisibility(ref: React.RefObject<Element | null>): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = getSharedObserver();
    observerMap.set(el, setIsVisible);
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      observerMap.delete(el);
    };
  }, [ref]);

  return isVisible;
}

// ─── Animation Lifecycle ───────────────────────────────────────

interface AnimationLifecycle {
  /** Whether the element is currently visible in the viewport. */
  isVisible: boolean;
  /** Whether the component should run animations at all. */
  shouldAnimate: boolean;
  /** Current runtime performance level. */
  performanceLevel: PerformanceLevel;
  /** Device capability tier (stable). */
  deviceTier: DeviceTier;
  /** Whether this is a touch-only device. */
  isTouchDevice: boolean;
}

/**
 * All-in-one hook for animation components.
 * Combines visibility + performance level + device tier.
 */
export function useAnimationLifecycle(
  ref: React.RefObject<Element | null>
): AnimationLifecycle {
  const isVisible = useVisibility(ref);
  const performanceLevel = usePerformanceLevel();
  const deviceTier = useDeviceTier();
  const isTouchDevice = useIsTouchDevice();

  const shouldAnimate = isVisible && performanceLevel !== 'minimal' && deviceTier !== 'low';

  return useMemo(
    () => ({
      isVisible,
      shouldAnimate,
      performanceLevel,
      deviceTier,
      isTouchDevice,
    }),
    [isVisible, shouldAnimate, performanceLevel, deviceTier, isTouchDevice]
  );
}

// ─── Battery-Aware Degradation ─────────────────────────────────

/**
 * Returns true if the device is on low battery (< 20% and discharging).
 * When true, components should reduce animations.
 */
export function useLowBattery(): boolean {
  const [isLow, setIsLow] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const nav = navigator as { getBattery?: () => Promise<{
      level: number;
      charging: boolean;
      addEventListener: (type: string, cb: () => void) => void;
      removeEventListener: (type: string, cb: () => void) => void;
    }> };

    if (!nav.getBattery) return;

    let battery: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | null = null;

    function check() {
      if (!battery) return;
      setIsLow(battery.level < 0.2 && !battery.charging);
    }

    nav.getBattery().then((b) => {
      battery = b;
      check();
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
    });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', check);
        battery.removeEventListener('chargingchange', check);
      }
    };
  }, []);

  return isLow;
}
