/**
 * Security self-test — continuous regression guard for the invisible defenses.
 *
 * Runs the REAL security modules (not copies) through a matrix of attack inputs (must be
 * caught) and LEGITIMATE inputs (must pass untouched — proving zero visitor impact). Exits
 * non-zero on any regression so CI fails the build before a protection can silently break.
 *
 *   node --experimental-strip-types scripts/security/selftest.mjs
 *
 * Pure modules only (no DB, no network, no new deps).
 */
import { inspectRequest } from '../../src/lib/security/waf.ts';
import { safeClientPath } from '../../src/lib/safe-redirect.ts';
import { validateRedirectPath, constantTimeEqual } from '../../src/lib/security/sanitize.ts';

let pass = 0;
let fail = 0;
const fails = [];
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; fails.push(name); }
}

// ── WAF: attacks must be caught, legit traffic must pass ───────────────────────────
const mk = (url, ua) => new Request(url, ua ? { headers: { 'user-agent': ua } } : undefined);
const wafCases = [
  // [path, ua, expectedAction]
  ['/.env', null, 'block'],
  ['/wp-admin', null, 'block'],
  ['/wp-login.php', null, 'block'],
  ['/xmlrpc.php', null, 'block'],
  ['/phpmyadmin', null, 'block'],
  ['/.git/config', null, 'block'],
  ['/backup.zip', null, 'block'],
  ['/.env.production', null, 'block'],
  ['/api/admin/users.php', null, 'block'],
  ['/api/internal/debug', null, 'block'],
  ['/?file=../../etc/passwd', null, 'block'],
  ['/x/..%2f..%2fetc', null, 'block'],
  ['/', 'sqlmap/1.5', 'block'],
  ['/', 'Nikto/2.1', 'block'],
  ['/', 'nuclei', 'block'],
  ['/?q=union+select+1,2,3+from+users', null, 'shadow'],
  ['/?c=<script>alert(1)</script>', null, 'shadow'],
  ['/?id=1%27+or+%271%27=%271', null, 'shadow'],
  // legitimate — must ALL allow (zero visitor impact):
  ['/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'allow'],
  ['/pricing', null, 'allow'],
  ['/portal/revisions', null, 'allow'],
  ['/partner-portal', null, 'allow'],
  ['/demos/saas-waitlist', null, 'allow'],
  ['/blog/how-we-ship-fast', null, 'allow'],
  ['/api/analytics/collect', null, 'allow'],
  ['/api/auth/login', null, 'allow'],
  ['/.well-known/security.txt', null, 'allow'],
  ['/solutions/dental', null, 'allow'],
  ['/?range=2024..2025', null, 'allow'],
  ['/?utm_source=google&utm_campaign=launch', null, 'allow'],
  ['/proposal/abc-123?t=1700000000.deadbeef', null, 'allow'],
];
for (const [path, ua, want] of wafCases) {
  const v = inspectRequest(mk('https://stratalanding.com' + path, ua));
  check(`WAF ${want} :: ${path}${ua ? ' [' + ua + ']' : ''} (got ${v.action})`, v.action === want);
}

// ── Redirect validators: open-redirect attempts must collapse to a safe path ───────
const redirectAttacks = ['//evil.com', 'https://evil.com', 'http://evil.com', 'javascript:alert(1)', '/\\evil.com', '\\/evil.com', '//evil.com/portal'];
for (const bad of redirectAttacks) {
  check(`safeClientPath blocks ${bad}`, safeClientPath(bad) === '/portal');
  check(`validateRedirectPath blocks ${bad}`, validateRedirectPath(bad) === '/portal');
}
const redirectLegit = ['/portal', '/portal/revisions', '/admin/security', '/auth/verify-2fa', '/partner-portal'];
for (const good of redirectLegit) {
  check(`safeClientPath allows ${good}`, safeClientPath(good) === good);
}

// ── constantTimeEqual correctness ──────────────────────────────────────────────────
check('constantTimeEqual equal', constantTimeEqual('s3cret-token', 's3cret-token') === true);
check('constantTimeEqual unequal', constantTimeEqual('s3cret-token', 's3cret-toketX') === false);
check('constantTimeEqual length mismatch', constantTimeEqual('abc', 'abcd') === false);

// ── Report ─────────────────────────────────────────────────────────────────────────
console.log(`\nSecurity self-test: ${pass}/${pass + fail} passed`);
if (fail) {
  console.error('\nFAILED:');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('✓ All defenses verified — attacks caught, legitimate traffic untouched.');
