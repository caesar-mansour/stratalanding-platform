'use client';

/**
 * Editorial headline. Three scales:
 *   display  — section banners ("TONIGHT'S DISPATCH")
 *   section  — inside-card title ("FIFTY letters set in tray.")
 *   byline   — small caps editor's note
 *
 * All ink-text on paper, Fraunces.
 */
import { ReactNode } from 'react';

export function Headline({
  children,
  scale = 'section',
  italic = false,
  className = '',
}: {
  children: ReactNode;
  scale?: 'display' | 'section' | 'byline' | 'kicker';
  italic?: boolean;
  className?: string;
}) {
  if (scale === 'kicker') {
    // Department label with leading dingbat — for column headers.
    return (
      <div className={`smallcaps text-[11px] tracking-[0.22em] brass-text flex items-center gap-2 ${className}`}>
        <span style={{ fontSize: '14px', lineHeight: 1 }}>✦</span>
        <span>{children}</span>
      </div>
    );
  }
  if (scale === 'byline') {
    return <div className={`smallcaps text-[11px] ink-soft ${className}`}>{children}</div>;
  }
  if (scale === 'display') {
    return (
      <h2
        className={`font-display ink-text leading-tight tracking-tight ${italic ? 'italic' : ''} ${className}`}
        style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.4vw, 32px)' }}
      >
        {children}
      </h2>
    );
  }
  return (
    <h3
      className={`font-display ink-text leading-tight tracking-tight ${italic ? 'italic' : ''} ${className}`}
      style={{ fontWeight: 600, fontSize: 'clamp(18px, 1.8vw, 24px)' }}
    >
      {children}
    </h3>
  );
}

/**
 * Spell out small whole numbers in headlines, like real newsprint.
 * "FIFTY letters set in tray" beats "50 letters set in tray".
 * Falls back to digits for >100, decimals, etc.
 */
const NUMBER_WORDS_TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const NUMBER_WORDS_TEENS = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const NUMBER_WORDS_ONES = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

export function spellNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n) || n > 100) return n.toLocaleString();
  if (n < 10) return NUMBER_WORDS_ONES[n];
  if (n < 20) return NUMBER_WORDS_TEENS[n - 10];
  if (n === 100) return 'ONE HUNDRED';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? NUMBER_WORDS_TENS[tens] : `${NUMBER_WORDS_TENS[tens]}-${NUMBER_WORDS_ONES[ones]}`;
}
