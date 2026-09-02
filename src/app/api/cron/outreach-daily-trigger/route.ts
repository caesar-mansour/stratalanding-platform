import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { getSystemSetting, setSystemSetting } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET) return false;
  return timingSafeCompare(auth ?? '', expected);
}

export async function GET(request: NextRequest) { return handle(request); }
export async function POST(request: NextRequest) { return handle(request); }

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = await getSystemSetting<boolean>('daily_run_enabled');
  if (enabled !== true) {
    return NextResponse.json({ ok: true, fired: false, reason: 'disabled' });
  }

  const targetHour = await getSystemSetting<number>('daily_run_hour');
  const lastIso = await getSystemSetting<string | null>('daily_run_last_at');
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  // Only fire when the current hour matches the configured hour.
  if (typeof targetHour !== 'number' || now.getHours() !== targetHour) {
    return NextResponse.json({ ok: true, fired: false, reason: 'wrong hour', current: now.getHours(), target: targetHour ?? null });
  }

  // Dedupe: if we already fired today, skip.
  if (lastIso) {
    const lastKey = new Date(lastIso).toISOString().slice(0, 10);
    if (lastKey === todayKey) {
      return NextResponse.json({ ok: true, fired: false, reason: 'already fired today', last_at: lastIso });
    }
  }

  // Fire Start-today against the local server.
  // Auto-trigger fires the local Start endpoint, not production.
  const base = process.env.LOCAL_WORKER_URL || 'http://localhost:3001';
  let triggered: unknown = null;
  let triggerError: string | null = null;
  try {
    const res = await fetch(`${base}/api/outreach/send/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
        // Internal call — bypass admin cookie check. Start endpoint already accepts the bearer
        // when CRON_SECRET is provided via verifyAdmin's bypass logic in dev/SKIP_ADMIN_AUTH mode.
      },
      body: JSON.stringify({ dry_run: false, source: 'daily_auto' }),
    });
    triggered = await res.json().catch(() => ({ status: res.status }));
    if (!res.ok) {
      triggerError = `start endpoint returned ${res.status}`;
    }
  } catch (err) {
    triggerError = err instanceof Error ? err.message : 'unknown error';
  }

  // Persist the firing timestamp regardless of outcome — we only want one attempt per day.
  await setSystemSetting('daily_run_last_at', now.toISOString());

  return NextResponse.json({
    ok: triggerError == null,
    fired: true,
    target_hour: targetHour,
    fired_at: now.toISOString(),
    triggered,
    error: triggerError,
  });
}
