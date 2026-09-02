import { NextResponse } from 'next/server';

/**
 * Liveness probe. Deliberately does NO work.
 *
 * AUDIT 2026-08-12 (P1 + P2 security/cost): this route used to call
 * checkAndSendInterviewReminders() — a 5-table JOIN against Neon that can send email — and
 * <Heartbeat /> fired it on every marketing page load. That made an unauthenticated GET able to
 * trigger outbound email, kept Neon awake on anonymous traffic alone, and coupled a background job
 * to random visitors. Interview reminders now run on a schedule
 * (netlify/functions/cron-interview-reminders.mts → /api/cron/interview-reminders, CRON_SECRET-gated).
 *
 * Kept as a cheap uptime target. If nothing ends up probing it, delete the route.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
