/**
 * HTML Utility Functions
 * Security utilities for preventing XSS in HTML content
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Use this for any user-provided content that will be rendered in HTML
 */
export function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }

  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes HTML but preserves line breaks (converts \n to <br>)
 * Use for multi-line text fields like notes/comments
 */
export function escapeHtmlWithLineBreaks(unsafe: string | undefined | null): string {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }

  return escapeHtml(unsafe).replace(/\n/g, '<br>');
}

/**
 * Sanitizes an email address for use in mailto: links
 * Removes potential injection characters
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) {
    return '';
  }

  // Remove any characters that could be used for injection
  return String(email)
    .replace(/[<>"\s]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Sanitizes a URL for safe use in href attributes
 * Only allows http, https, and mailto protocols
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) {
    return '#';
  }

  const trimmedUrl = String(url).trim();

  // Only allow safe protocols
  if (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('mailto:')
  ) {
    return escapeHtml(trimmedUrl);
  }

  // If no protocol, assume https
  if (!trimmedUrl.includes('://')) {
    return `https://${escapeHtml(trimmedUrl)}`;
  }

  // Block potentially dangerous protocols (javascript:, data:, etc.)
  return '#';
}

/**
 * Serialize a value to JSON that is safe to embed inside a <script> tag via
 * dangerouslySetInnerHTML. JSON.stringify does NOT escape `<`, so raw output allows a
 * `</script>` breakout -> XSS (audit F36). Escaping `<`, `>`, and `&` as unicode escapes
 * keeps the JSON valid while making it inert in HTML.
 */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Returns a URL safe to use directly in a JSX `href`/`src` attribute: only http(s) URLs
 * pass; anything else (javascript:, data:, vbscript:, etc.) collapses to '#'. Unlike
 * sanitizeUrl this does NOT HTML-escape (React already escapes attribute values), so it is
 * correct for JSX render sinks (audit F46/F64).
 */
export function safeExternalHref(url: string | undefined | null): string {
  if (!url) return '#';
  const u = String(url).trim();
  return /^https?:\/\//i.test(u) ? u : '#';
}
