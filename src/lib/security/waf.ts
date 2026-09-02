/**
 * Edge-safe Web Application Firewall — stateless request inspection (no Node deps, no DB).
 *
 * Runs in `src/proxy.ts` (Edge runtime) on every non-static request. It is deliberately PRECISE:
 * `block` rules only ever match requests a real browser never sends (attack signatures, scanner
 * tools, and honeypot/probe paths that don't exist on this app), so a normal visitor is NEVER
 * affected. Fuzzier heuristics are `shadow` — they LOG but never block — so they can't produce a
 * false positive against a legitimate visitor until they're proven safe and promoted by hand.
 *
 * Persistence (audit log + IP reputation) happens out-of-band: the proxy fires the verdict to the
 * Node route /api/security/event (Edge can't reach Postgres directly).
 */

export type WafAction = 'allow' | 'block' | 'shadow';

export interface WafVerdict {
  action: WafAction;
  /** Machine rule id, e.g. 'honeypot', 'probe_path', 'traversal', 'scanner_ua', 'sqli', 'xss'. */
  rule: string;
  /** Short human detail for the audit log (never echoed to the requester). */
  detail: string;
}

const ALLOW: WafVerdict = { action: 'allow', rule: '', detail: '' };

// ── Honeypot / canary paths ────────────────────────────────────────────────────
// Fake "juicy" endpoints that DO NOT exist on this app. Only a scanner/attacker probes these,
// so a hit is a near-certain attacker → block + flag. (Kept distinct from real /api/admin/* routes.)
const HONEYPOT_PATHS = [
  '/.env.production',
  '/.env.local',
  '/backup.zip',
  '/backup.sql',
  '/database.sql',
  '/dump.sql',
  '/wp-config.php',
  '/api/admin/users.php',
  '/api/internal/debug',
  '/api/internal/config',
  // Fake "admin panel" traps. Our real admin lives at /admin/* with NO file extension, so any
  // probe for these classic admin URLs is an attacker fishing for a login — trap + block them.
  '/admin.php',
  '/admin/login.php',
  '/admin/index.php',
  '/administrator/',
  '/administrator/index.php',
  '/adminer.php',
  '/cpanel',
  '/webadmin',
];

// ── Probe paths ─────────────────────────────────────────────────────────────────
// Classic vuln-scanner targets that are never legitimate on a Next.js site.
const PROBE_PATHS = [
  '/.env',
  '/.git',
  '/.aws',
  '/.ssh',
  '/.htaccess',
  '/.htpasswd',
  '/.svn',
  '/.vscode',
  '/.idea',
  '/wp-admin',
  '/wp-login.php',
  '/wp-includes',
  '/wp-content',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/pma/',
  '/myadmin',
  '/cgi-bin/',
  '/vendor/phpunit',
  '/server-status',
  '/.git/config',
];

// ── Malicious scanner user-agents ───────────────────────────────────────────────
// Only outright attack tools — NOT SEO crawlers (handled elsewhere as bots, not blocked).
const SCANNER_UA = /(sqlmap|nikto|nmap|masscan|acunetix|nuclei|dirbuster|gobuster|wpscan|zgrab|fimap|joomscan|hydra|metasploit|nessus|openvas|w3af|skipfish|arachni)/i;

// ── Path-traversal / null-byte signatures (raw OR percent-encoded) ──────────────
const TRAVERSAL = /(\.\.\/|\.\.\\|%2e%2e[%/\\]|%252e%252e|\.\.%2f|\.\.%5c|%00|\x00)/i;

// ── Fuzzy SQLi / XSS signatures (SHADOW — log only) ─────────────────────────────
const SQLI = /(union(\s|\+|%20)+select|select(\s|\+|%20).+from|'(\s|\+|%20)*or(\s|\+|%20)+'?1'?='?1|;(\s)*drop(\s|\+|%20)+table|information_schema|pg_sleep\(|benchmark\(|waitfor(\s|\+|%20)+delay|sleep\((\s)*\d)/i;
const XSS = /(<script|onerror(\s)*=|onload(\s)*=|javascript:|<svg[^>]*onload|<img[^>]*onerror|document\.cookie|<iframe)/i;

function startsWithAny(pathLower: string, list: string[]): string | null {
  for (const p of list) {
    if (pathLower === p || pathLower.startsWith(p)) return p;
  }
  return null;
}

/**
 * Inspect a request and return a verdict. Pure function — safe to call in the Edge runtime.
 */
export function inspectRequest(req: Request): WafVerdict {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return ALLOW;
  }
  const rawPath = url.pathname;
  const pathLower = rawPath.toLowerCase();
  const search = url.search; // includes leading '?'
  // Decode defensively for signature matching (attackers double-encode); ignore decode errors.
  let decoded = rawPath + search;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* malformed encoding — keep raw */
  }
  const ua = req.headers.get('user-agent') || '';

  // 1) Honeypot — definite attacker.
  const honey = startsWithAny(pathLower, HONEYPOT_PATHS);
  if (honey) return { action: 'block', rule: 'honeypot', detail: `honeypot ${honey}` };

  // 2) Probe paths — vuln scanners.
  const probe = startsWithAny(pathLower, PROBE_PATHS);
  if (probe) return { action: 'block', rule: 'probe_path', detail: `probe ${probe}` };

  // 3) Path traversal / null byte (check raw, decoded, and the original search).
  if (TRAVERSAL.test(rawPath) || TRAVERSAL.test(decoded) || TRAVERSAL.test(search)) {
    return { action: 'block', rule: 'traversal', detail: `traversal in ${rawPath}` };
  }

  // 4) Malicious scanner user-agent.
  if (ua && SCANNER_UA.test(ua)) {
    return { action: 'block', rule: 'scanner_ua', detail: `scanner ua ${ua.slice(0, 80)}` };
  }

  // 5) SHADOW — fuzzy SQLi/XSS in the URL. Log only, NEVER block (no visitor false positives).
  if (SQLI.test(decoded)) return { action: 'shadow', rule: 'sqli', detail: `sqli signature in url` };
  if (XSS.test(decoded)) return { action: 'shadow', rule: 'xss', detail: `xss signature in url` };

  return ALLOW;
}
