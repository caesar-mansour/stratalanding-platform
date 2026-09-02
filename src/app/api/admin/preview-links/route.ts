import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { verifyAdmin } from '@/lib/admin-auth';
import { sendPreviewLinkEmail } from '@/lib/auth/emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
// Only preview sites hosted here may be wrapped in a preview link.
const ALLOWED_PREVIEW_HOSTS = ['previews.example.com'];
const PREVIEW_LINK_TTL_DAYS = 45;

// POST — founder mints a preview link for one practice (returns the raw token ONCE)
export async function POST(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const practiceName = String(body.practiceName || '').trim();
    const slug = String(body.slug || '').trim();
    const previewUrl = String(body.previewUrl || '').trim();
    const contactEmail = body.contactEmail ? String(body.contactEmail).toLowerCase().trim() : null;
    const pkg = ['starter', 'growth', 'scale'].includes(body.package) ? body.package : 'growth';
    const send = body.send === true; // founder clicked "Send email" (lead agreed on the call)

    if (!practiceName || !slug || !previewUrl) {
      return NextResponse.json({ error: 'practiceName, slug and previewUrl are required' }, { status: 400 });
    }
    if (practiceName.length > 200 || slug.length > 120) {
      return NextResponse.json({ error: 'practiceName/slug too long' }, { status: 400 });
    }

    // Validate the preview URL is on an allowed host (no open redirect / arbitrary link wrapping)
    let parsed: URL;
    try { parsed = new URL(previewUrl); } catch { return NextResponse.json({ error: 'Invalid previewUrl' }, { status: 400 }); }
    if (parsed.protocol !== 'https:' || !ALLOWED_PREVIEW_HOSTS.includes(parsed.host)) {
      return NextResponse.json({ error: 'previewUrl host not allowed' }, { status: 400 });
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: 'Invalid contactEmail' }, { status: 400 });
    }
    if (send && !contactEmail) {
      return NextResponse.json({ error: 'An email address is required to send' }, { status: 400 });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + PREVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

    const [row] = await sql`
      INSERT INTO preview_links (token_hash, practice_name, slug, preview_url, package, contact_email, expires_at)
      VALUES (${tokenHash}, ${practiceName}, ${slug}, ${parsed.href}, ${pkg}, ${contactEmail}, ${expiresAt.toISOString()})
      RETURNING id, practice_name, slug, created_at
    `;

    // Inherit an existing speed measurement for the same company, so a new link for
    // an already-measured practice shows the before/after proof immediately. Prefer
    // the per-company cache (preview_measurements); fall back to a prior link.
    await sql`
      UPDATE preview_links t
      SET comparison = s.comparison,
          current_url = COALESCE(t.current_url, s.current_url)
      FROM (
        SELECT pri, comparison, current_url FROM (
          SELECT 0 AS pri, comparison, current_url FROM preview_measurements WHERE slug = ${slug}
          UNION ALL
          SELECT 1 AS pri, comparison, current_url FROM preview_links
          WHERE slug = ${slug} AND comparison IS NOT NULL AND id <> ${row.id}
        ) u ORDER BY pri LIMIT 1
      ) s
      WHERE t.id = ${row.id}
    `.catch(() => { /* measurement is optional — never block minting */ });

    const url = `${SITE_URL}/preview/${token}`;   // shown to the founder ONCE — the raw token is never stored

    // If the founder hit "Send email" (lead agreed on the call), email the link now.
    let emailed = false;
    if (send && contactEmail) {
      try {
        const result = await sendPreviewLinkEmail(contactEmail, practiceName, url);
        // The transport RETURNS {success:false} on failure instead of throwing, so we
        // must check it — otherwise the UI would show "Emailed ✓" when nothing was sent.
        if (!result || result.success === false) {
          return NextResponse.json({ success: true, id: row.id, url, emailed: false, emailError: (result && result.error) || 'Link created but the email failed to send — copy it and send manually.' });
        }
        emailed = true;
      } catch (e) {
        console.error('preview link email failed:', e);
        // Link still exists; surface the failure so the founder can copy/send manually.
        return NextResponse.json({ success: true, id: row.id, url, emailed: false, emailError: 'Link created but the email failed to send — copy it and send manually.' });
      }
    }

    return NextResponse.json({ success: true, id: row.id, url, emailed });
  } catch (error) {
    console.error('preview-links POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — founder removes preview-link leads (one, a selection, or all).
// Only deletes the lead-tracking rows; any real projects they became remain untouched.
export async function DELETE(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      const rows = await sql`DELETE FROM preview_links RETURNING id`;
      return NextResponse.json({ success: true, deleted: rows.length });
    }

    if (id) {
      const rows = await sql`DELETE FROM preview_links WHERE id = ${id} RETURNING id`;
      return NextResponse.json({ success: true, deleted: rows.length });
    }

    // Bulk by id list (e.g. "clear all" while a status filter is active).
    let ids: unknown = null;
    try { ids = (await request.json())?.ids; } catch { /* no body */ }
    if (Array.isArray(ids) && ids.length > 0) {
      const clean = ids.filter((x): x is string => typeof x === 'string').slice(0, 1000);
      const rows = await sql`DELETE FROM preview_links WHERE id = ANY(${clean}) RETURNING id`;
      return NextResponse.json({ success: true, deleted: rows.length });
    }

    return NextResponse.json({ error: 'id, ids[] or all=true required' }, { status: 400 });
  } catch (error) {
    console.error('preview-links DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — list preview links for the admin dashboard (no token material exposed)
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const rows = await sql`
      SELECT id, practice_name, slug, preview_url, current_url, package, contact_email, status, project_id,
             (comparison IS NOT NULL) AS measured, expires_at, created_at,
             first_opened_at, last_seen_at, open_count, viewed_site_at, site_reached_at,
             gate_scroll_pct, site_scroll_pct, gate_seconds, site_seconds, last_stage,
             click_count, liked_at, followed_up_at, followup_count
      FROM preview_links
      ORDER BY created_at DESC
      LIMIT 500
    `;
    return NextResponse.json({ links: rows });
  } catch (error) {
    console.error('preview-links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
