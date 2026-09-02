'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ──────────────────────────────────────────────
   Types & defaults
   ────────────────────────────────────────────── */
interface A11ySettings {
  fontSize: number;       // 0 | 1 | 2
  contrast: boolean;
  monochrome: boolean;
  highlightLinks: boolean;
  bigCursor: boolean;
  lineHeight: boolean;
  letterSpacing: boolean;
  dyslexiaFont: boolean;
}

const defaultSettings: A11ySettings = {
  fontSize: 0,
  contrast: false,
  monochrome: false,
  highlightLinks: false,
  bigCursor: false,
  lineHeight: false,
  letterSpacing: false,
  dyslexiaFont: false,
};

/* ──────────────────────────────────────────────
   Persistence helpers
   ────────────────────────────────────────────── */
const STORAGE_KEY = 'a11y-settings';
const STYLE_ID = 'a11y-injected-styles';

function loadSettings(): A11ySettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveSettings(s: A11ySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/* ──────────────────────────────────────────────
   CSS injection — the reliable way
   ────────────────────────────────────────────── */
function applySettings(settings: A11ySettings) {
  let css = '';

  // 1. Font size
  if (settings.fontSize === 1) css += `html:root { font-size: 118% !important; }\n`;
  else if (settings.fontSize === 2) css += `html:root { font-size: 135% !important; }\n`;

  // 2. High contrast
  if (settings.contrast) {
    css += `
      html body { color: #000 !important; background-color: #fff !important; }
      html p, html span, html li, html div, html h1, html h2, html h3, html h4, html h5, html h6,
      html label, html td, html th, html button, html input, html textarea,
      html blockquote, html figcaption, html summary, html details { color: #000 !important; }
      html a { color: #0000EE !important; }
      html img { filter: contrast(1.25) !important; }
      html section, html header, html footer, html main, html nav, html aside, html article { background-color: #fff !important; }
    `;
  }

  // 3. Monochrome
  if (settings.monochrome) css += `html:root { filter: grayscale(100%) !important; }\n`;

  // 4. Highlight links
  if (settings.highlightLinks) {
    css += `
      html a {
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
        text-underline-offset: 3px !important;
        outline: 2px solid #1a56db !important;
        outline-offset: 2px !important;
        background-color: rgba(26,86,219,0.08) !important;
      }
    `;
  }

  // 5. Big cursor
  if (settings.bigCursor) {
    css += `html, html * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='2' d='M5 1L27 16.5 17.7 18.1 24 29.3l-4.7 2.7L12.7 20.3 5 26z'/%3E%3C/svg%3E") 4 2, auto !important; }\n`;
  }

  // 6. Line height
  if (settings.lineHeight) {
    css += `html p, html li, html span, html div, html td, html th, html label,
      html h1, html h2, html h3, html h4, html h5, html h6, html a, html button, html blockquote { line-height: 2 !important; }\n`;
  }

  // 7. Letter spacing
  if (settings.letterSpacing) {
    css += `html p, html li, html span, html div, html h1, html h2, html h3, html h4,
      html a, html button, html label, html input, html textarea { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }\n`;
  }

  // 8. Dyslexia font
  if (settings.dyslexiaFont) {
    css += `html body, html p, html li, html span, html div, html h1, html h2, html h3,
      html h4, html h5, html h6, html a, html button, html input, html textarea,
      html label, html td, html th, html blockquote { font-family: 'OpenDyslexic','Comic Sans MS','Trebuchet MS',sans-serif !important; }\n`;
  }

  // Widget isolation
  if (css) {
    css += `
      [data-a11y-widget], [data-a11y-widget] * {
        font-size: initial !important; line-height: 1.5 !important;
        letter-spacing: normal !important; word-spacing: normal !important;
        font-family: system-ui,-apple-system,sans-serif !important;
        color: inherit !important; background-color: transparent !important;
        text-decoration: none !important;
        filter: none !important; cursor: default !important;
      }
      /* AUDIT 2026-08-12 (P2): an "outline: none !important" rule used to sit in the reset above,
         applied to every descendant. So the moment a visitor enabled ANY accessibility setting, the
         accessibility panel stripped the focus indicator from its own controls — the one surface
         where a keyboard user is most likely to be. The outline reset is gone, and focus is
         given an explicit high-contrast ring that survives the !important cascade. */
      [data-a11y-widget] :focus-visible {
        outline: 3px solid #106793 !important;
        outline-offset: 2px !important;
      }
      [data-a11y-widget] button, [data-a11y-widget] [role="switch"] { cursor: pointer !important; }
    `;
  }

  // Inject into document.body (not head) so it can't be clobbered by SSR/hydration
  const old = document.getElementById(STYLE_ID);
  if (old) old.remove();
  if (css) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.setAttribute('type', 'text/css');
    el.textContent = css;
    document.body.appendChild(el);
  }

}

function countActive(s: A11ySettings): number {
  let c = 0;
  if (s.fontSize > 0) c++;
  if (s.contrast) c++;
  if (s.monochrome) c++;
  if (s.highlightLinks) c++;
  if (s.bigCursor) c++;
  if (s.lineHeight) c++;
  if (s.letterSpacing) c++;
  if (s.dyslexiaFont) c++;
  return c;
}

/* ──────────────────────────────────────────────
   Toggle options config
   ────────────────────────────────────────────── */
const toggleOptions: { key: keyof Omit<A11ySettings, 'fontSize'>; label: string; desc: string; color: string }[] = [
  { key: 'contrast',       label: 'High Contrast',    desc: 'Sharper color contrast',    color: '#f59e0b' },
  { key: 'monochrome',     label: 'Monochrome',       desc: 'Grayscale display',         color: '#6b7280' },
  { key: 'highlightLinks', label: 'Highlight Links',  desc: 'Outline all links',         color: '#3b82f6' },
  { key: 'bigCursor',      label: 'Big Cursor',       desc: 'Larger mouse pointer',      color: '#8b5cf6' },
  { key: 'lineHeight',     label: 'Line Height',      desc: 'More space between lines',  color: '#10b981' },
  { key: 'letterSpacing',  label: 'Letter Spacing',   desc: 'More space between letters',color: '#06b6d4' },
  { key: 'dyslexiaFont',   label: 'Dyslexia Font',    desc: 'Easier to read typeface',   color: '#ec4899' },
];

/* ──────────────────────────────────────────────
   Main component — NO framer-motion
   ────────────────────────────────────────────── */
export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [applied, setApplied] = useState<A11ySettings>(defaultSettings);
  const [pending, setPending] = useState<A11ySettings>(defaultSettings);
  const [showApplied, setShowApplied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Mount — restore saved settings
  useEffect(() => {
    const saved = loadSettings();
    setPending(saved);
    setApplied(saved);
    if (JSON.stringify(saved) !== JSON.stringify(defaultSettings)) {
      applySettings(saved);
    }
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    // Delay to avoid closing immediately on the button click
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [isOpen]);

  const updatePending = <K extends keyof A11ySettings>(key: K, val: A11ySettings[K]) => {
    setPending(prev => ({ ...prev, [key]: val }));
  };

  const handleApply = () => {
    // Read pending directly from state setter to avoid stale closure
    setPending(current => {
      applySettings(current);
      setApplied(current);
      saveSettings(current);
      setShowApplied(true);
      setTimeout(() => setShowApplied(false), 1500);
      return current;
    });
  };

  const resetAll = () => {
    setPending(defaultSettings);
    setApplied(defaultSettings);
    saveSettings(defaultSettings);
    applySettings(defaultSettings);
    // Also nuke the style element directly to be sure
    const old = document.getElementById(STYLE_ID);
    if (old) old.remove();
    localStorage.removeItem(STORAGE_KEY);
  };

  const appliedCount = countActive(applied);
  const hasUnapplied = JSON.stringify(pending) !== JSON.stringify(applied);
  const canReset = countActive(pending) > 0 || appliedCount > 0;

  if (!mounted) return null;

  return (
    <div data-a11y-widget="">
      {/* ── Floating trigger button ── */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #3A6A8A 0%, #5A9ABD 100%)',
          color: 'white',
          boxShadow: '0 4px 15px rgba(58,106,138,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        aria-label="Open accessibility settings"
        title="Accessibility"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
          <path d="M12 8v5m0 0l-3 5m3-5l3 5" />
          <path d="M7 10.5h10" />
        </svg>

        {/* Badge */}
        {appliedCount > 0 && !isOpen && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#22c55e', color: 'white',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px white',
          }}>
            {appliedCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Widget panel */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Accessibility settings"
            style={{
              position: 'fixed',
              bottom: 90,
              left: 24,
              zIndex: 9999,
              width: 360,
              maxHeight: '70vh',
              borderRadius: 16,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(58,106,138,0.08)',
              animation: 'a11y-slide-up 0.25s ease-out',
            }}
          >
            {/* Inline keyframes */}
            <style>{`
              @keyframes a11y-slide-up {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>

            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #2d5570 0%, #3A6A8A 40%, #6BA3C4 100%)',
              padding: 20, color: 'white', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
                      <path d="M12 8v5m0 0l-3 5m3-5l3 5" />
                      <path d="M7 10.5h10" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Accessibility</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                      {appliedCount > 0 ? `${appliedCount} feature${appliedCount > 1 ? 's' : ''} active` : 'Customize your experience'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: 'rgba(255,255,255,0.1)', color: 'white',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Options — minHeight:0 is critical for flex shrink + scroll */}
            <div style={{ overflowY: 'auto', padding: 16, flex: 1, minHeight: 0 }}>
              {/* Font size */}
              <div style={{
                borderRadius: 12, padding: 16, marginBottom: 8,
                background: pending.fontSize > 0 ? 'rgba(58,106,138,0.06)' : '#f9fafb',
                border: pending.fontSize > 0 ? '1px solid rgba(58,106,138,0.15)' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 12 }}>
                  Text Size
                  <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8, fontWeight: 400 }}>
                    {pending.fontSize === 0 ? 'Default' : pending.fontSize === 1 ? 'Large' : 'Extra Large'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Aa', sub: '100%', value: 0, size: 14 },
                    { label: 'Aa', sub: '118%', value: 1, size: 17 },
                    { label: 'Aa', sub: '135%', value: 2, size: 20 },
                  ].map(opt => {
                    const active = pending.fontSize === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updatePending('fontSize', opt.value)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 8, border: active ? 'none' : '1px solid #e5e7eb',
                          background: active ? 'linear-gradient(135deg, #3A6A8A, #5A9ABD)' : 'white',
                          color: active ? 'white' : '#6b7280',
                          fontWeight: 600, cursor: 'pointer',
                          boxShadow: active ? '0 2px 8px rgba(58,106,138,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: opt.size }}>{opt.label}</span>
                        <span style={{ display: 'block', fontSize: 10, marginTop: 4, opacity: active ? 0.8 : 0.5 }}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
                <span style={{ fontSize: 10, color: '#d1d5db', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Features</span>
                <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
              </div>

              {/* Toggles */}
              {toggleOptions.map(opt => {
                const active = pending[opt.key] as boolean;
                return (
                  <button
                    key={opt.key}
                    onClick={() => updatePending(opt.key, !active)}
                    role="switch"
                    aria-checked={active}
                    aria-label={`${opt.label}: ${active ? 'on' : 'off'}`}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12, border: active ? `1px solid ${opt.color}30` : '1px solid transparent',
                      background: active ? `${opt.color}12` : '#fafafa',
                      cursor: 'pointer', textAlign: 'left', marginBottom: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Icon box */}
                    <span style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: active ? opt.color : '#e5e7eb',
                      color: active ? 'white' : '#9ca3af',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: active ? `0 2px 8px ${opt.color}40` : 'none',
                      transition: 'all 0.2s',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {opt.key === 'contrast' && <><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 2a10 10 0 000 20V2z" fill="white" opacity="0.9" stroke="none" /></>}
                        {opt.key === 'monochrome' && <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 12h18" /></>}
                        {opt.key === 'highlightLinks' && <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>}
                        {opt.key === 'bigCursor' && <path d="M4 0l16 12.279-6.951 1.17L18 22l-3.5 2-4.95-8.378L4 19.554z" fill="currentColor" stroke="none" />}
                        {opt.key === 'lineHeight' && <><line x1="21" y1="6" x2="11" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><path d="M7 4v16" /><path d="M4 7l3-3 3 3" /><path d="M4 17l3 3 3-3" /></>}
                        {opt.key === 'letterSpacing' && <><path d="M5 12h14" /><path d="M5 12l3-3m-3 3l3 3" /><path d="M19 12l-3-3m3 3l-3 3" /></>}
                        {opt.key === 'dyslexiaFont' && <text x="3" y="19" fontSize="18" fontWeight="bold" fontFamily="serif" fill="currentColor" stroke="none">Aa</text>}
                      </svg>
                    </span>

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: active ? opt.color : '#374151', transition: 'color 0.15s' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.3 }}>{opt.desc}</div>
                    </div>

                    {/* Toggle switch */}
                    <div style={{
                      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                      background: active ? opt.color : '#d1d5db',
                      padding: '0 2px', display: 'flex', alignItems: 'center',
                      transition: 'background 0.2s',
                      boxShadow: active ? `0 0 8px ${opt.color}30` : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        transform: active ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: 16, flexShrink: 0,
              borderTop: '1px solid rgba(0,0,0,0.05)',
              background: 'rgba(249,250,251,0.8)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* Apply button */}
              <button
                onClick={handleApply}
                disabled={!hasUnapplied}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  border: 'none', fontSize: 14, fontWeight: 700,
                  background: hasUnapplied ? 'linear-gradient(135deg, #3A6A8A 0%, #5A9ABD 100%)' : '#e5e7eb',
                  color: hasUnapplied ? 'white' : '#9ca3af',
                  cursor: hasUnapplied ? 'pointer' : 'not-allowed',
                  boxShadow: hasUnapplied ? '0 4px 12px rgba(58,106,138,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {showApplied ? '✓ Applied!' : 'Apply Settings'}
              </button>

              {/* Reset button */}
              <button
                onClick={resetAll}
                disabled={!canReset}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 12,
                  border: 'none', fontSize: 13, fontWeight: 600,
                  background: canReset ? 'rgba(239,68,68,0.06)' : '#f3f4f6',
                  color: canReset ? '#dc2626' : '#d1d5db',
                  cursor: canReset ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                Reset All
              </button>

              {hasUnapplied && (
                <p style={{ fontSize: 11, color: '#3A6A8A', textAlign: 'center', margin: 0 }}>
                  You have unapplied changes
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
