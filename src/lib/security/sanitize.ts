// NOTE: No top-level 'crypto' import — this file is imported by
// middleware.ts which runs in Edge runtime. crypto is loaded lazily
// only in timingSafeCompare() which is used in Node.js routes.

// ============================================================
// CRLF Injection Prevention
// ============================================================

/** Strip CRLF sequences from email header values to prevent header injection. */
export function stripCRLF(input: string): string {
  return input.replace(/[\r\n]/g, '');
}

// ============================================================
// Open Redirect Prevention
// ============================================================

const ALLOWED_REDIRECT_PREFIXES = ['/portal', '/admin', '/auth'];

/** Validate redirect path against an allowlist. Returns safe path or '/portal'. */
export function validateRedirectPath(path: string): string {
  if (!path || typeof path !== 'string') return '/portal';
  // Must start with / (relative path only)
  if (!path.startsWith('/')) return '/portal';
  // Block protocol-relative URLs (//evil.com)
  if (path.startsWith('//')) return '/portal';
  // Block embedded protocols
  if (path.includes('://')) return '/portal';
  // Must match an allowed prefix
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(p => path.startsWith(p));
  return isAllowed ? path : '/portal';
}

// ============================================================
// SVG XSS Prevention
// ============================================================

const DANGEROUS_SVG_PATTERNS = [
  '<script', 'javascript:', 'vbscript:', 'data:text/html',
  'onerror=', 'onload=', 'onclick=', 'onmouseover=', 'onfocus=',
  'onblur=', 'oninput=', 'onchange=', 'onsubmit=', 'onkeydown=',
  'onkeyup=', 'onkeypress=', 'onmousedown=', 'onmouseup=',
  'eval(', 'expression(', 'url(javascript',
  'xlink:href="javascript', "xlink:href='javascript",
  '<foreignobject', '<iframe', '<embed', '<object',
  '<meta', '<link', '<base',
  'set-cookie', 'document.cookie',
];

/**
 * Patterns the substring list above structurally cannot catch (audit 2026-08-12, P3).
 *
 * The list enumerates specific handlers as literal substrings, so it misses:
 *   - whitespace padding — `onerror =` and `onerror
=` are valid HTML and slip straight past
 *     the literal `onerror=`;
 *   - any handler nobody thought to enumerate (onpointerdown, onwheel, onanimationstart…);
 *   - SMIL animation, which needs no event handler at all: <animate attributeName="href"
 *     values="javascript:…"> and <set> execute on their own, and onbegin/onend/onrepeat fire
 *     without user interaction.
 *
 * A regex for the whole CLASS is strictly stronger than a list of instances, and does not need
 * updating every time a new event attribute is standardised.
 */
const DANGEROUS_SVG_REGEXES: RegExp[] = [
  /\son[a-z]+\s*=/i,                 // ANY event handler attribute, whitespace tolerant
  /<\s*(script|iframe|embed|object|foreignobject|animate|set|handler)/i,
  /(href|xlink:href)\s*=\s*["']?\s*(javascript|data:text\/html|vbscript)/i,
  /attributename\s*=\s*["']?\s*(href|xlink:href)/i, // SMIL retargeting a link to a script URL
];

/** Validate SVG content for XSS. Returns true if safe, false if dangerous. */
export function validateSvgContent(svgBuffer: Buffer): boolean {
  const raw = svgBuffer.toString('utf-8');
  const content = raw.toLowerCase();
  if (DANGEROUS_SVG_PATTERNS.some(pattern => content.includes(pattern))) return false;
  if (DANGEROUS_SVG_REGEXES.some(re => re.test(raw))) return false;
  return true;
}

// ============================================================
// Timing-Safe Comparison
// ============================================================

/**
 * Constant-time string comparison to prevent timing attacks on secrets.
 * Uses Node.js crypto.timingSafeEqual — do NOT call from Edge runtime.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { timingSafeEqual } = require('crypto') as typeof import('crypto');
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still perform comparison to avoid leaking length info via timing
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Edge-safe constant-time string comparison (pure JS, no Node `crypto`). Use this in the
 * Edge runtime (proxy/middleware) where `timingSafeCompare` can't run (audit F19).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
