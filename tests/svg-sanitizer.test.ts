import { describe, it, expect } from 'vitest';
import { validateSvgContent } from '@/lib/security/sanitize';

/**
 * Regression tests for AUDIT 2026-08-12 (P3) — SVG upload sanitizer.
 *
 * The original implementation was a substring blocklist of specific handler names. That shape
 * cannot catch whitespace-padded attributes, handlers nobody enumerated, or SMIL animation — which
 * needs no event handler at all. These cases are the ones that previously got through.
 */

const svg = (inner: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);

describe('validateSvgContent', () => {
  it('accepts an ordinary SVG', () => {
    expect(validateSvgContent(svg('<circle cx="10" cy="10" r="5" fill="red"/>'))).toBe(true);
    expect(validateSvgContent(svg('<path d="M0 0 L10 10" stroke="#0891B2"/>'))).toBe(true);
  });

  it('still blocks what the original list caught', () => {
    expect(validateSvgContent(svg('<script>alert(1)</script>'))).toBe(false);
    expect(validateSvgContent(svg('<image onerror="alert(1)" href="x"/>'))).toBe(false);
    expect(validateSvgContent(svg('<a href="javascript:alert(1)">x</a>'))).toBe(false);
    expect(validateSvgContent(svg('<foreignObject><body/></foreignObject>'))).toBe(false);
  });

  // The gap: `onerror=` as a literal misses `onerror =`, which is equally valid HTML.
  it('blocks whitespace-padded event handlers', () => {
    expect(validateSvgContent(svg('<image onerror = "alert(1)" href="x"/>'))).toBe(false);
    expect(validateSvgContent(svg('<image onerror\n= "alert(1)" href="x"/>'))).toBe(false);
    expect(validateSvgContent(svg('<image onerror\t=\t"alert(1)" href="x"/>'))).toBe(false);
  });

  // The gap: handlers that were never enumerated.
  it('blocks event handlers nobody listed', () => {
    expect(validateSvgContent(svg('<rect onpointerdown="alert(1)"/>'))).toBe(false);
    expect(validateSvgContent(svg('<rect onwheel="alert(1)"/>'))).toBe(false);
    expect(validateSvgContent(svg('<rect onanimationstart="alert(1)"/>'))).toBe(false);
  });

  // The gap: SMIL needs no event handler and fires on its own.
  it('blocks SMIL animation vectors', () => {
    expect(validateSvgContent(svg('<a><animate attributeName="href" values="javascript:alert(1)"/></a>'))).toBe(false);
    expect(validateSvgContent(svg('<set attributeName="href" to="javascript:alert(1)"/>'))).toBe(false);
    expect(validateSvgContent(svg('<animate onbegin="alert(1)" attributeName="x"/>'))).toBe(false);
  });

  it('blocks xlink:href script URLs including padded forms', () => {
    expect(validateSvgContent(svg('<a xlink:href="javascript:alert(1)">x</a>'))).toBe(false);
    expect(validateSvgContent(svg('<a xlink:href = " javascript:alert(1)">x</a>'))).toBe(false);
  });

  it('does not reject legitimate attributes that merely start with "on"', () => {
    // `once` is not an event handler; the regex requires the attribute to be followed by `=`
    // after only optional whitespace, and to be preceded by whitespace.
    expect(validateSvgContent(svg('<rect data-once="1" fill="blue"/>'))).toBe(true);
  });
});
