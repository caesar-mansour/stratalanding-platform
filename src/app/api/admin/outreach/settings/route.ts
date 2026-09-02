import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { getSystemSetting, setSystemSetting } from '@/lib/outreach/db';
import { encryptSecret } from '@/lib/auth/tokens';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const [paused, dailyRunEnabled, dailyRunHour, dailyRunLastAt, inboxes] = await Promise.all([
      getSystemSetting<boolean>('outreach_paused'),
      getSystemSetting<boolean>('daily_run_enabled'),
      getSystemSetting<number>('daily_run_hour'),
      getSystemSetting<string | null>('daily_run_last_at'),
      sql`SELECT id, label, email, display_name, type, daily_cap, min_spacing_seconds, max_spacing_seconds, start_hour, end_hour, active, paused, sent_today, warmup_start_date, warmup_daily_cap, notes FROM outreach_inboxes ORDER BY label`,
    ]);
    return NextResponse.json({
      outreach_paused: paused === true,
      daily_run_enabled: dailyRunEnabled === true,
      daily_run_hour: typeof dailyRunHour === 'number' ? dailyRunHour : 9,
      daily_run_last_at: dailyRunLastAt ?? null,
      inboxes,
    });
  } catch (err) {
    console.error('settings get error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'toggle_pause') {
      const current = await getSystemSetting<boolean>('outreach_paused');
      const next = !(current === true);
      await setSystemSetting('outreach_paused', next);
      return NextResponse.json({ ok: true, outreach_paused: next });
    }

    if (action === 'set_pause') {
      const desired = body.value === true;
      await setSystemSetting('outreach_paused', desired);
      // When stopping, optionally cancel pending queue rows so they won't fire if resumed
      if (desired === true && body.cancel_queue === true) {
        await sql`
          UPDATE outreach_send_queue
          SET status = 'failed', last_error = 'manually stopped', updated_at = now()
          WHERE status IN ('pending','sending')
        `;
      }
      return NextResponse.json({ ok: true, outreach_paused: desired });
    }

    if (action === 'toggle_inbox_pause') {
      const inboxId = typeof body.inbox_id === 'string' ? body.inbox_id : null;
      if (!inboxId) return NextResponse.json({ error: 'inbox_id required' }, { status: 400 });
      const [row] = await sql<Array<{ paused: boolean }>>`
        UPDATE outreach_inboxes
        SET paused = NOT paused
        WHERE id = ${inboxId}::uuid
        RETURNING paused
      `;
      return NextResponse.json({ ok: true, paused: row?.paused ?? null });
    }

    if (action === 'update_inbox') {
      const { inbox_id, daily_cap, min_spacing_seconds, max_spacing_seconds, start_hour, end_hour, active, warmup_start_date, warmup_daily_cap, notes } = body;
      if (!inbox_id) return NextResponse.json({ error: 'inbox_id required' }, { status: 400 });

      // Validate hour fields if present (0-23 for start, 1-24 for end-exclusive, null clears).
      const sh = start_hour === null ? null : (typeof start_hour === 'number' && start_hour >= 0 && start_hour <= 23 ? start_hour : undefined);
      const eh = end_hour === null ? null : (typeof end_hour === 'number' && end_hour >= 1 && end_hour <= 24 ? end_hour : undefined);
      if (sh === undefined && start_hour !== undefined) {
        return NextResponse.json({ error: 'start_hour must be 0-23 or null' }, { status: 400 });
      }
      if (eh === undefined && end_hour !== undefined) {
        return NextResponse.json({ error: 'end_hour must be 1-24 or null' }, { status: 400 });
      }

      await sql`
        UPDATE outreach_inboxes
        SET daily_cap = COALESCE(${daily_cap ?? null}, daily_cap),
            min_spacing_seconds = COALESCE(${min_spacing_seconds ?? null}, min_spacing_seconds),
            max_spacing_seconds = COALESCE(${max_spacing_seconds ?? null}, max_spacing_seconds),
            start_hour = ${sh === undefined ? sql`start_hour` : sh},
            end_hour = ${eh === undefined ? sql`end_hour` : eh},
            active = COALESCE(${active ?? null}, active),
            warmup_start_date = COALESCE(${warmup_start_date ?? null}::date, warmup_start_date),
            warmup_daily_cap = COALESCE(${warmup_daily_cap ?? null}, warmup_daily_cap),
            notes = COALESCE(${notes ?? null}, notes)
        WHERE id = ${inbox_id}::uuid
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_inbox_active') {
      const inboxId = typeof body.inbox_id === 'string' ? body.inbox_id : null;
      if (!inboxId) return NextResponse.json({ error: 'inbox_id required' }, { status: 400 });
      const [row] = await sql<Array<{ active: boolean }>>`
        UPDATE outreach_inboxes
        SET active = NOT active
        WHERE id = ${inboxId}::uuid
        RETURNING active
      `;
      return NextResponse.json({ ok: true, active: row?.active ?? null });
    }

    if (action === 'add_inbox') {
      const { email, display_name, app_password, daily_cap, label } = body;
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
      }
      if (typeof app_password !== 'string' || app_password.length < 8) {
        return NextResponse.json({ error: 'App password required (min 8 chars)' }, { status: 400 });
      }
      // Strip whitespace from app password (Gmail formats them as "xxxx xxxx xxxx xxxx")
      const cleanedPassword = app_password.replace(/\s+/g, '');

      // Caesar's founder user_id (Phase 2 will replace with current session user)
      const userId = 'b1a5e4a0-0000-4000-8000-c0a050000001';

      // Default label = email prefix; default display_name = "Caesar @ StrataLanding"
      const finalLabel = (typeof label === 'string' && label.trim()) || email.split('@')[0];
      const finalDisplay = (typeof display_name === 'string' && display_name.trim()) || `Caesar @ StrataLanding`;
      const finalCap = typeof daily_cap === 'number' && daily_cap > 0 && daily_cap <= 500 ? daily_cap : 25;

      // Check the user isn't trying to add an already-connected inbox
      const [existing] = await sql<Array<{ id: string }>>`
        SELECT id FROM outreach_inboxes
        WHERE user_id = ${userId}::uuid AND email = ${email.toLowerCase()}
        LIMIT 1
      `;
      if (existing) {
        return NextResponse.json({ error: 'This email is already connected as a desk.' }, { status: 409 });
      }

      const [row] = await sql<Array<{ id: string }>>`
        INSERT INTO outreach_inboxes (
          user_id, label, email, display_name, type,
          daily_cap, min_spacing_seconds, max_spacing_seconds,
          active, paused, app_password_encrypted
        ) VALUES (
          ${userId}::uuid, ${finalLabel}, ${email.toLowerCase()}, ${finalDisplay}, 'app_password',
          ${finalCap}, 280, 360,
          true, false, ${encryptSecret(cleanedPassword)}
        )
        RETURNING id
      `;
      return NextResponse.json({ ok: true, id: row.id });
    }

    if (action === 'delete_inbox') {
      const inboxId = typeof body.inbox_id === 'string' ? body.inbox_id : null;
      if (!inboxId) return NextResponse.json({ error: 'inbox_id required' }, { status: 400 });
      const userId = 'b1a5e4a0-0000-4000-8000-c0a050000001';
      // Verify ownership before deleting
      const [check] = await sql<Array<{ id: string }>>`
        SELECT id FROM outreach_inboxes WHERE id = ${inboxId}::uuid AND user_id = ${userId}::uuid LIMIT 1
      `;
      if (!check) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 });
      await sql`DELETE FROM outreach_inboxes WHERE id = ${inboxId}::uuid AND user_id = ${userId}::uuid`;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_schedule') {
      const { daily_run_enabled, daily_run_hour } = body;
      if (typeof daily_run_enabled === 'boolean') {
        await setSystemSetting('daily_run_enabled', daily_run_enabled);
      }
      if (typeof daily_run_hour === 'number' && daily_run_hour >= 0 && daily_run_hour <= 23) {
        await setSystemSetting('daily_run_hour', daily_run_hour);
      } else if (daily_run_hour !== undefined) {
        return NextResponse.json({ error: 'daily_run_hour must be 0-23' }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('settings post error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
