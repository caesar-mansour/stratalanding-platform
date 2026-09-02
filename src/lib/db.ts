import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

function getSql(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl === 'YOUR_DATABASE_URL') {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
      'Set it in .env.local to connect to your PostgreSQL database.'
    );
  }

  _sql = postgres(databaseUrl, {
    // AUDIT 2026-08-12 (P2): 10 was sized for ONE long-lived server. On Netlify every concurrent
    // lambda instance builds its own pool, so N instances x 10 connections races Neon's ceiling
    // and starts refusing connections under a traffic spike — exactly when you least want it.
    // Serverless wants a small per-instance pool; 3 is plenty for a request that issues a handful
    // of queries. DB_POOL_MAX still overrides for a long-lived host.
    max: parseInt(process.env.DB_POOL_MAX || '3'),
    idle_timeout: 20,
    connect_timeout: 10,
    // SECURITY (audit F22): verify the server certificate in production (Neon is signed by a
    // public CA; tested OK) instead of `'require'`, which encrypts but does NOT verify (MITM-able).
    // DB_SSL_DISABLE=1 is a LOCAL-ONLY escape hatch for running `next start` against the
    // non-TLS local Postgres (:2719) — never set it in deployed environments.
    ssl: process.env.DB_SSL_DISABLE === '1'
      ? false
      : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    connection: {
      statement_timeout: 30000, // 30s query timeout to prevent DoS
    },
  });

  return _sql;
}

// Proxy must target a function so the `apply` trap works for tagged template usage: sql`...`
const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  get(_target, prop, receiver) {
    const instance = getSql();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  apply(_target, _thisArg, args) {
    const instance = getSql();
    return (instance as unknown as (...a: unknown[]) => unknown)(...args);
  },
});

export default sql;
