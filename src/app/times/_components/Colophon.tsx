'use client';

/**
 * Page footer for every outreach view. Heavy brass rule + small italic
 * Fraunces colophon copy. Mirrors the issue numbering of the masthead so
 * every page reads as the same edition.
 */

const VOL_ROMAN = 'IV';
const ISSUE_EPOCH = new Date('2025-10-20T00:00:00Z');

export function Colophon({ today = new Date() }: { today?: Date }) {
  const issue = Math.max(1, Math.floor((today.getTime() - ISSUE_EPOCH.getTime()) / (24 * 60 * 60 * 1000)) + 1);

  return (
    <footer className="mt-16 mb-4">
      <div className="brass-rule mb-3" />
      <div className="brass-rule-thin mb-5" />
      <div className="text-center font-display ink-soft text-[12px]" style={{ fontStyle: 'italic' }}>
        <span className="brass-text">✦</span>
        <span className="mx-3">Set in Fraunces &amp; Inter</span>
        <span className="brass-text">·</span>
        <span className="mx-3">Vol. {VOL_ROMAN}, Issue No. {issue}</span>
        <span className="brass-text">·</span>
        <span className="mx-3">The Strata Times</span>
        <span className="brass-text">·</span>
        <span className="mx-3">Toronto Bureau</span>
        <span className="brass-text">·</span>
        <span className="mx-3">Printed nightly</span>
        <span className="brass-text">✦</span>
      </div>
    </footer>
  );
}
