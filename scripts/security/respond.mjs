/**
 * StrataLanding incident-response CLI — the founder's invisible security cockpit.
 *
 *   node scripts/security/respond.mjs <command> [args]
 *
 * Commands:
 *   posture                      Quick self-audit (env, key separation, migrations, chain, 24h threats)
 *   threats [hours=24]           Recent attacks / login failures / lockouts
 *   verify-chain [limit=2000]    Re-verify the tamper-evident audit-log hash chain
 *   lock <email> [hours=24]      Lock an account (auth_users.locked_until)
 *   unlock <email>               Clear an account lock
 *   kill-sessions <email>        Force-logout one user everywhere (DELETE their auth_sessions)
 *   kill-all                     Force-logout EVERYONE (DELETE all auth_sessions)
 *   block-ip <ip> [hours=6]      Block an IP at the edge (ip_reputation.blocked_until)
 *   unblock-ip <ip>              Lift an IP block
 *   blocked                      List currently-blocked IPs
 *
 * Standalone (dotenv + postgres + crypto). Never touches the running site; nothing here is visible
 * to visitors. Connects to whatever DATABASE_URL is in .env.local (point it at prod to act on prod).
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import crypto from 'crypto';

loadEnv({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (.env.local).'); process.exit(1); }
const isLocal = /localhost|127\.0\.0\.1/.test(url);
// SECURITY (audit L-ops-ssl): verify the server cert for non-local connections (matches src/lib/db.ts).
const sql = postgres(url, { ssl: isLocal ? false : { rejectUnauthorized: true }, max: 1 });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (r) => [r.event_type, r.user_id || '', r.email || '', r.ip_address || '', r.user_agent || '', r.severity || 'info', r.prev_hash || ''].join('|');

async function verifyChain(limit = 2000) {
  const recent = await sql`
    SELECT id, event_type, user_id, email, ip_address, user_agent, severity, prev_hash, entry_hash
    FROM security_audit_log WHERE entry_hash IS NOT NULL
    ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  const rows = [...recent].reverse();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (sha(canon(r)) !== r.entry_hash) return { ok: false, at: r.id, why: 'content tampered', checked: i };
    if (i > 0 && r.prev_hash !== rows[i - 1].entry_hash) return { ok: false, at: r.id, why: 'chain link broken', checked: i };
  }
  return { ok: true, checked: rows.length };
}

async function tableExists(name) {
  const [r] = await sql`SELECT to_regclass(${'public.' + name}) AS t`;
  return !!r?.t;
}
async function columnExists(table, col) {
  const [r] = await sql`SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${col} LIMIT 1`;
  return !!r;
}

const [, , cmd, ...args] = process.argv;
const ok = (s) => console.log('  \x1b[32m✓\x1b[0m ' + s);
const bad = (s) => console.log('  \x1b[31m✗\x1b[0m ' + s);
const info = (s) => console.log('  • ' + s);

try {
  switch (cmd) {
    case 'posture': {
      console.log('\n\x1b[1mStrataLanding security posture\x1b[0m  (' + (isLocal ? 'LOCAL' : 'REMOTE') + ' db)\n');
      console.log('Required secrets:');
      for (const k of ['DATABASE_URL', 'AUTH_SECRET', 'ADMIN_ACCESS_TOKEN', 'CRON_SECRET']) {
        process.env[k] ? ok(k + ' set') : bad(k + ' MISSING');
      }
      console.log('Key separation (optional, falls back to AUTH_SECRET):');
      for (const k of ['PRICE_OVERRIDE_HMAC_KEY', 'MFA_ENC_KEY', 'OTP_PEPPER', 'DOWNLOAD_TOKEN_KEY', 'PROPOSAL_TOKEN_KEY', 'WAF_LOG_SECRET']) {
        process.env[k] ? ok(k + ' set') : info(k + ' using AUTH_SECRET fallback');
      }
      console.log('Admin 2FA: ' + (process.env.ADMIN_TOTP_SECRET ? '\x1b[32mENABLED\x1b[0m' : '\x1b[33mtoken-only (run admin-totp-setup.cjs to enable)\x1b[0m'));
      console.log('Auto IP-block: ' + (process.env.WAF_AUTOBLOCK === '1' ? 'ON' : 'OFF (manual-only — safest)'));
      console.log('\nMigrations / schema:');
      (await tableExists('rate_limit_counters')) ? ok('047 durable rate-limit') : bad('047 rate_limit_counters MISSING (limiter fails open!)');
      (await tableExists('payment_refunds')) ? ok('048 refunds') : bad('048 payment_refunds MISSING');
      (await columnExists('security_audit_log', 'entry_hash')) ? ok('051 tamper-evident audit log') : bad('051 audit hash-chain MISSING');
      (await tableExists('ip_reputation')) ? ok('051 ip_reputation') : bad('051 ip_reputation MISSING');
      console.log('\nAudit-log integrity:');
      const c = await verifyChain(2000);
      c.ok ? ok(`hash chain intact (${c.checked} events)`) : bad(`TAMPERED at ${c.at} (${c.why})`);
      const [t] = await sql`
        SELECT count(*) FILTER (WHERE event_type IN ('waf_block','honeypot_hit')) AS blocked,
               count(*) FILTER (WHERE event_type='login_failure') AS loginfail
        FROM security_audit_log WHERE created_at > now() - interval '24 hours'`;
      console.log(`\nLast 24h: \x1b[1m${Number(t?.blocked || 0)}\x1b[0m attacks blocked · ${Number(t?.loginfail || 0)} login failures`);
      break;
    }
    case 'threats': {
      const hours = Number(args[0] || 24);
      const rows = await sql`
        SELECT created_at, event_type, ip_address, (details::jsonb)->>'rule' AS rule, (details::jsonb)->>'path' AS path
        FROM security_audit_log
        WHERE event_type IN ('waf_block','honeypot_hit','waf_shadow','login_failure','account_lockout')
          AND created_at > now() - (${hours} || ' hours')::interval
        ORDER BY created_at DESC LIMIT 80`;
      console.log(`\nThreats in the last ${hours}h (${rows.length}):\n`);
      for (const r of rows) {
        console.log(`  ${new Date(r.created_at).toISOString().slice(11, 19)}  ${String(r.event_type).padEnd(14)} ${String(r.ip_address || '—').padEnd(18)} ${r.rule || ''} ${r.path || ''}`);
      }
      break;
    }
    case 'verify-chain': {
      const c = await verifyChain(Number(args[0] || 2000));
      console.log(c.ok ? `\n✓ Audit log intact — ${c.checked} events verified.` : `\n✗ TAMPERED: chain breaks at ${c.at} (${c.why}).`);
      if (!c.ok) process.exitCode = 1;
      break;
    }
    case 'lock': {
      const [email, hours = 24] = args;
      if (!email) throw new Error('usage: lock <email> [hours]');
      const r = await sql`UPDATE auth_users SET locked_until = now() + (${Number(hours)} || ' hours')::interval WHERE email = ${email.toLowerCase()} RETURNING id`;
      console.log(r.count ? `Locked ${email} for ${hours}h.` : `No user ${email}.`);
      break;
    }
    case 'unlock': {
      const [email] = args;
      const r = await sql`UPDATE auth_users SET locked_until = NULL, failed_login_count = 0 WHERE email = ${(email || '').toLowerCase()} RETURNING id`;
      console.log(r.count ? `Unlocked ${email}.` : `No user ${email}.`);
      break;
    }
    case 'kill-sessions': {
      const [email] = args;
      if (!email) throw new Error('usage: kill-sessions <email>');
      const [u] = await sql`SELECT id FROM auth_users WHERE email = ${email.toLowerCase()} LIMIT 1`;
      if (!u) { console.log(`No user ${email}.`); break; }
      const r = await sql`DELETE FROM auth_sessions WHERE user_id = ${u.id}`;
      console.log(`Killed ${r.count} session(s) for ${email}.`);
      break;
    }
    case 'kill-all': {
      const r = await sql`DELETE FROM auth_sessions`;
      console.log(`Killed ALL ${r.count} session(s). Everyone must log in again.`);
      break;
    }
    case 'block-ip': {
      const [ip, hours = 6] = args;
      if (!ip) throw new Error('usage: block-ip <ip> [hours]');
      await sql`
        INSERT INTO ip_reputation (ip, offense_count, last_rule, blocked_until, first_seen, last_seen)
        VALUES (${ip}, 1, 'manual', now() + (${Number(hours)} || ' hours')::interval, now(), now())
        ON CONFLICT (ip) DO UPDATE SET blocked_until = now() + (${Number(hours)} || ' hours')::interval, last_seen = now()`;
      console.log(`Blocked ${ip} for ${hours}h (edge enforces within ~30s).`);
      break;
    }
    case 'unblock-ip': {
      const [ip] = args;
      const r = await sql`UPDATE ip_reputation SET blocked_until = NULL WHERE ip = ${ip} RETURNING ip`;
      console.log(r.count ? `Unblocked ${ip}.` : `${ip} was not blocked.`);
      break;
    }
    case 'blocked': {
      const rows = await sql`SELECT ip, last_rule, offense_count, blocked_until FROM ip_reputation WHERE blocked_until > now() ORDER BY blocked_until DESC`;
      console.log(`\nBlocked IPs (${rows.length}):`);
      for (const r of rows) console.log(`  ${String(r.ip).padEnd(18)} until ${new Date(r.blocked_until).toISOString()}  (${r.offense_count}× ${r.last_rule})`);
      break;
    }
    default:
      console.log('Commands: posture | threats [h] | verify-chain | lock <email> [h] | unlock <email> | kill-sessions <email> | kill-all | block-ip <ip> [h] | unblock-ip <ip> | blocked');
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
