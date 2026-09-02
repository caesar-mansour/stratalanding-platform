import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { packageTemplate } from '@/lib/template-packager';
import sql from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';

// AUDIT 2026-08-12 (P2): maxDuration = 300 was unachievable. Netlify caps a synchronous function
// well below that, so the declared value was misleading — the platform killed the request long
// before it applied. The route is local-only now anyway (it reads the demo source tree), where the
// value is irrelevant.
export const maxDuration = 60;

export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // AUDIT 2026-08-12: this enumerates demo SOURCE directories (src/app/demos), which are not
  // present in the Netlify serverless bundle — only compiled output is. Bulk generation is
  // therefore a LOCAL-ONLY maintenance tool. Fail with an explanation rather than returning a
  // confusing empty result in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Bulk template generation is local-only: it reads the demo source tree, which is not deployed. Run it locally and the zips persist to shared storage.' },
      { status: 501 },
    );
  }

  try {
    const root = process.cwd();
    const demosDir = path.join(root, 'src', 'app', 'demos');

    // Get all demo directories
    const entries = await fs.readdir(demosDir, { withFileTypes: true });
    const slugs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('['))
      .map(e => e.name)
      .sort();

    // Get already-generated templates
    const existing = await sql`SELECT template_id FROM template_files WHERE active = true`;
    const existingSet = new Set(existing.map((r) => r.template_id as string));

    const results: { slug: string; status: string; size?: number }[] = [];
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const slug of slugs) {
      // Skip if already generated
      if (existingSet.has(slug)) {
        results.push({ slug, status: 'skipped' });
        skipped++;
        continue;
      }

      try {
        const zipBuffer = await packageTemplate(slug);
        // AUDIT 2026-08-12 (P1): see generate/route.ts — Netlify's filesystem is read-only at
        // runtime, so fs.writeFile threw in production and any row written from a dev machine
        // pointed at bytes production could never read.
        const { url: uploadedKey, error: uploadError } = await uploadFile(
          'templates',
          `${slug}.zip`,
          zipBuffer,
          'application/zip',
        );
        if (uploadError || !uploadedKey) throw uploadError ?? new Error('upload failed');
        const storageKey = uploadedKey;
        const displayName = slug
          .split('-')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        await sql`
          INSERT INTO template_files (template_id, plan, display_name, storage_key, file_size, active)
          VALUES (${slug}, 'presence-page', ${displayName}, ${storageKey}, ${zipBuffer.length}, true)
          ON CONFLICT (template_id) DO UPDATE SET
            storage_key = ${storageKey},
            file_size = ${zipBuffer.length},
            display_name = ${displayName},
            active = true
        `;

        results.push({ slug, status: 'generated', size: zipBuffer.length });
        generated++;
      } catch (err: unknown) {
        results.push({ slug, status: `error: ${(err instanceof Error ? err.message : String(err))}` });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      total: slugs.length,
      generated,
      skipped,
      failed,
      results,
    });
  } catch (error: unknown) {
    console.error('Bulk generate error:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
