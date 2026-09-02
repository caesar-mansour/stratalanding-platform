'use client';

/**
 * Admin Command Palette (⌘K)
 * -------------------------------------------------------------
 * Linear/Raycast-style quick navigator over ADMIN_NAV. Opens on
 * ⌘K / Ctrl+K or when any code dispatches `window.dispatchEvent(
 * new CustomEvent('admin:cmdk'))` (the sidebar hint chip does this).
 *
 * Light-premium styling, keyboard-driven, reduced-motion aware,
 * self-hides on /admin/login.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ADMIN_NAV, type AdminNavItem } from './nav';

const ADMIN_EASE = [0.16, 1, 0.3, 1] as const;

/** Lightweight fuzzy score: label + keywords + group. Higher = better. */
function score(item: AdminNavItem, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const label = item.label.toLowerCase();
  if (label === needle) return 100;
  if (label.startsWith(needle)) return 80;
  if (label.includes(needle)) return 60;
  if (item.group.toLowerCase().includes(needle)) return 40;
  if (item.keywords?.some((k) => k.toLowerCase().includes(needle))) return 30;
  // subsequence match (e.g. "anl" -> "analytics")
  let i = 0;
  for (const ch of label) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return 15;
  }
  return 0;
}

export default function CommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    return ADMIN_NAV.map((item) => ({ item, s: score(item, query.trim()) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.item);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  // Global open triggers: ⌘K / Ctrl+K + the custom event from the sidebar chip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('admin:cmdk', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('admin:cmdk', onOpen as EventListener);
    };
  }, []);

  // Reset + focus when opened.
  useEffect(() => {
    if (open) {
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Clamp the active index to the current result set.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.href);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  if (pathname === '/admin/login') return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close command palette"
            onClick={close}
            className="absolute inset-0 bg-[#0B1B3A]/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: ADMIN_EASE }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-surface ring-1 ring-border shadow-[var(--shadow-xl)]"
          >
            {/* Search row */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <svg className="h-5 w-5 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search admin…"
                className="w-full bg-transparent py-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                aria-label="Search admin"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
              {results.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-text-muted">
                  No matches for “{query}”
                </li>
              ) : (
                results.map((item, i) => {
                  const isActive = i === active;
                  return (
                    <li key={item.href} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item.href)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-accent/10' : 'hover:bg-background'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              isActive ? 'bg-accent' : 'bg-border'
                            }`}
                          />
                          <span className="truncate text-sm font-medium text-text-primary">
                            {item.label}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                          {item.group}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5">↑</kbd>
                  <kbd className="rounded border border-border bg-background px-1 py-0.5">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5">↵</kbd>
                  open
                </span>
              </span>
              <span className="font-medium">{results.length} result{results.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
