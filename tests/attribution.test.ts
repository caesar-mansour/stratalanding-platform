import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Regression tests for AUDIT 2026-08-12 P2 — revenue attribution.
 *
 * THE BUSINESS QUESTION these protect: "which acquisition channel produced this paying client?"
 *
 * It was unanswerable. UTM parameters lived in sessionStorage, so they died the moment the tab
 * closed — a prospect who clicked a cold email on Monday and paid on Thursday arrived as "direct".
 * And trackPurchase/trackBeginCheckout had ZERO call sites, so no revenue event ever fired.
 */

// Minimal localStorage/sessionStorage for a node environment.
function makeStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

describe('first-touch attribution survives the real buying cycle', () => {
  let captureFirstTouch: typeof import('@/lib/analytics').captureFirstTouch;
  let getFirstTouch: typeof import('@/lib/analytics').getFirstTouch;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', makeStorage());
    vi.stubGlobal('sessionStorage', makeStorage());
    // The analytics module registers visibility/unload listeners at import time.
    vi.stubGlobal('document', {
      referrer: 'https://mail.google.com/',
      addEventListener: () => {},
      removeEventListener: () => {},
      visibilityState: 'visible',
    });
    vi.stubGlobal('window', {
      location: { search: '?utm_source=coldemail&utm_medium=email&utm_campaign=medspa', pathname: '/' },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    vi.resetModules();
    const mod = await import('@/lib/analytics');
    captureFirstTouch = mod.captureFirstTouch;
    getFirstTouch = mod.getFirstTouch;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('records the acquisition channel on first visit', () => {
    const touch = captureFirstTouch();
    expect(touch?.utm.utm_source).toBe('coldemail');
    expect(touch?.utm.utm_medium).toBe('email');
    expect(touch?.utm.utm_campaign).toBe('medspa');
    expect(touch?.referrer).toBe('https://mail.google.com/');
    expect(touch?.landing_page).toBe('/');
  });

  // The core fix: attribution must live in localStorage, not sessionStorage.
  it('persists in localStorage so it survives a closed tab', () => {
    captureFirstTouch();
    expect(localStorage.getItem('strata_first_touch')).toBeTruthy();
    expect(sessionStorage.getItem('strata_first_touch')).toBeNull();
  });

  // A buyer who arrives via cold email and later returns via Google must still credit the email.
  it('never overwrites the first touch with a later one', () => {
    const first = captureFirstTouch();
    expect(first?.utm.utm_source).toBe('coldemail');

    vi.stubGlobal('window', {
      location: { search: '?utm_source=google&utm_medium=organic', pathname: '/pricing' },
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    const second = captureFirstTouch();
    expect(second?.utm.utm_source).toBe('coldemail');
    expect(second?.landing_page).toBe('/');
  });

  it('expires the touch after the 90-day window', () => {
    captureFirstTouch();
    const stored = JSON.parse(localStorage.getItem('strata_first_touch') as string);
    stored.at = Date.now() - 91 * 24 * 60 * 60 * 1000;
    localStorage.setItem('strata_first_touch', JSON.stringify(stored));
    expect(getFirstTouch()).toBeNull();
  });

  it('keeps a touch that is still inside the window', () => {
    captureFirstTouch();
    const stored = JSON.parse(localStorage.getItem('strata_first_touch') as string);
    stored.at = Date.now() - 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('strata_first_touch', JSON.stringify(stored));
    expect(getFirstTouch()?.utm.utm_source).toBe('coldemail');
  });

  it('records a direct visit without inventing attribution', () => {
    vi.stubGlobal('window', { location: { search: '', pathname: '/' }, addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal('document', { referrer: '', addEventListener: () => {}, removeEventListener: () => {}, visibilityState: 'visible' });
    const touch = captureFirstTouch();
    expect(touch?.utm).toEqual({});
    expect(touch?.referrer).toBe('');
  });

  // Private browsing / storage disabled must degrade, never throw into the page.
  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    });
    expect(() => captureFirstTouch()).not.toThrow();
    expect(captureFirstTouch()).toBeNull();
    expect(getFirstTouch()).toBeNull();
  });
});
