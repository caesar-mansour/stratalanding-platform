/**
 * Shared guards for PUBLIC, unauthenticated forms (brief, quote, contact).
 *
 * AUDIT 2026-08-12 (P2): none of the public forms had spam protection. Rate limiting bounds
 * volume per IP but does nothing against a low-and-slow bot rotating addresses, and every one of
 * these forms either emails the founder or writes a project row — so junk lands directly in the
 * inbox that is supposed to hold real leads.
 */

/** The hidden field bots fill in. Named to look attractive to a naive form-filler. */
export const HONEYPOT_FIELD = 'website_url';

/**
 * True when a submission looks automated.
 *
 * Two signals, both free:
 *  - the honeypot field is non-empty (a human never sees it, so never fills it);
 *  - the form was submitted implausibly fast after render (bots post instantly).
 *
 * Callers should respond with a normal-looking success rather than an error: telling a bot it was
 * detected just teaches the operator to fix it.
 */
export function looksLikeSpam(body: Record<string, unknown>): boolean {
  const honey = body[HONEYPOT_FIELD];
  if (typeof honey === 'string' && honey.trim().length > 0) return true;

  const elapsed = body.form_elapsed_ms;
  if (typeof elapsed === 'number' && elapsed >= 0 && elapsed < 1500) return true;

  return false;
}

/**
 * Reasonable email-shape check. Deliberately permissive — the goal is to reject obvious junk
 * (missing @, no dot in the domain, whitespace), not to enforce RFC 5322.
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
