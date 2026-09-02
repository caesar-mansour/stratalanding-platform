#!/usr/bin/env node
/**
 * Build the CSRF endpoint matrix from source (audit 2026-08-12).
 *
 * Classifies every MUTATING API route by the mechanism that actually authenticates it, because
 * CSRF protection is only meaningful for requests a browser will send credentials on automatically
 * — i.e. cookie-authenticated ones. A signed PayPal webhook or a CRON_SECRET bearer call is
 * machine-to-machine: adding an Origin requirement there would break it and protect nothing.
 *
 *   node scripts/csrf-matrix.cjs            # print the matrix
 *   node scripts/csrf-matrix.cjs --check    # exit 1 if a cookie-auth mutation is unprotected
 */
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/^route\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Order matters: the FIRST match wins, most specific mechanism first.
const CLASSIFIERS = [
  { auth: 'paypal-webhook', csrf: 'N/A — signature', test: (s) => /verifyPayPalWebhook/.test(s) },
  { auth: 'cron-bearer', csrf: 'N/A — bearer', test: (s) => /CRON_SECRET/.test(s) },
  { auth: 'hmac-internal', csrf: 'N/A — shared secret', test: (s) => /wafLogSecret/.test(s) },
  { auth: 'hmac-signed-url', csrf: 'N/A — signed+POST', test: (s) => /verifySignedUrl/.test(s) },
  { auth: 'proposal-token', csrf: 'REQUIRED', test: (s) => /isProposalCallerAuthorized|verifyProposalToken/.test(s) },
  { auth: 'admin-cookie', csrf: 'REQUIRED', test: (s) => /verifyAdmin/.test(s) },
  { auth: 'session-cookie', csrf: 'REQUIRED', test: (s) => /getServerUser|getLiveSession/.test(s) },
  { auth: 'public-form', csrf: 'rate-limit + honeypot', test: () => true },
];

// Protection is enforced CENTRALLY in src/proxy.ts for every /api/ write that is not exempt.
// A per-route withProtection() wrapper adds a rate limit on top; it is not what provides CSRF.
const PROXY_EXEMPT = [
  '/api/paypal/webhook', '/api/cron/', '/api/security/',
  '/api/analytics/collect', '/api/analytics/script', '/api/preview/track',
];
const proxySrc = fs.readFileSync(path.join('src', 'proxy.ts'), 'utf8');
const PROXY_GATE_PRESENT = /isCsrfExempt/.test(proxySrc) && /Cross-site request blocked/.test(proxySrc);

function protectionFor(route, src) {
  const covered = PROXY_GATE_PRESENT && route.startsWith('/api/') &&
    !PROXY_EXEMPT.some((p) => route === p || route.startsWith(p));
  const extra = /withProtection/.test(src) ? ' + withProtection (rate limit)' : '';
  return covered ? `proxy Origin gate${extra}` : (extra ? extra.replace(' + ', '') : '—');
}

const rows = [];
for (const file of walk('src/app/api')) {
  const src = fs.readFileSync(file, 'utf8');
  const methods = [...src.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
  const mutating = methods.filter((m) => m !== 'GET');
  if (mutating.length === 0) continue;

  const route = '/' + file.split(path.sep).join('/').replace('src/app/', '').replace(/\/route\.tsx?$/, '');
  const klass = CLASSIFIERS.find((c) => c.test(src));
  rows.push({
    route,
    methods: mutating.join(','),
    auth: klass.auth,
    csrfRequirement: klass.csrf,
    protection: protectionFor(route, src),
  });
}

rows.sort((a, b) => a.auth.localeCompare(b.auth) || a.route.localeCompare(b.route));

const COOKIE_AUTH = new Set(['session-cookie', 'admin-cookie', 'proposal-token']);
const unprotected = rows.filter((r) => COOKIE_AUTH.has(r.auth) && !r.protection.includes('proxy Origin gate') && !r.protection.includes('withProtection'));

if (process.argv.includes('--check')) {
  if (unprotected.length) {
    console.error(`✗ ${unprotected.length} cookie-authenticated mutation endpoint(s) without CSRF protection:`);
    unprotected.forEach((r) => console.error(`    ${r.methods.padEnd(12)} ${r.route}  [${r.auth}]`));
    process.exit(1);
  }
  console.log(`✓ All ${rows.filter((r) => COOKIE_AUTH.has(r.auth)).length} cookie-authenticated mutation endpoints carry CSRF protection.`);
  process.exit(0);
}

console.log('| route | methods | auth mechanism | mutation? | CSRF requirement | protection |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| \`${r.route}\` | ${r.methods} | ${r.auth} | yes | ${r.csrfRequirement} | ${r.protection} |`);
}

const counts = rows.reduce((a, r) => ((a[r.auth] = (a[r.auth] || 0) + 1), a), {});
console.log(`\nTotal mutating endpoints: ${rows.length}`);
console.log(Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
console.log(`\nCookie-authenticated and UNPROTECTED: ${unprotected.length}`);
unprotected.forEach((r) => console.log(`  ${r.methods.padEnd(12)} ${r.route}`));
