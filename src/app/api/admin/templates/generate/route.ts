import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { packageTemplate } from '@/lib/template-packager';
import sql from '@/lib/db';
import { uploadFile } from '@/lib/storage';

export async function POST(request: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { demoSlug, plan } = await request.json();

    if (!demoSlug || typeof demoSlug !== 'string') {
      return NextResponse.json({ error: 'demoSlug is required' }, { status: 400 });
    }

    // Generate the zip
    const zipBuffer = await packageTemplate(demoSlug);

    // AUDIT 2026-08-12 (P1): this wrote the zip to public/uploads/templates with fs.writeFile.
    // Netlify's filesystem is READ-ONLY at runtime, so in production the write throws (500, no
    // template) — and when a row WAS created from a dev machine it recorded a storage_key pointing
    // at bytes production can never read, so a buyer's download 404s after paying. Route it
    // through the storage abstraction, which persists to file_store in production (the same path
    // the manual upload at admin/templates/route.ts already uses) and to disk locally.
    const fileName = `${demoSlug}.zip`;
    const { url: uploadedKey, error: uploadError } = await uploadFile(
      'templates',
      fileName,
      zipBuffer,
      'application/zip',
    );
    if (uploadError || !uploadedKey) {
      console.error('Template zip upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to store the generated template' }, { status: 500 });
    }

    const storageKey = uploadedKey;
    const displayName = demoSlug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Upsert template_files row
    await sql`
      INSERT INTO template_files (template_id, plan, display_name, storage_key, file_size, active)
      VALUES (${demoSlug}, ${plan || 'presence-page'}, ${displayName}, ${storageKey}, ${zipBuffer.length}, true)
      ON CONFLICT (template_id) DO UPDATE SET
        storage_key = ${storageKey},
        file_size = ${zipBuffer.length},
        display_name = ${displayName},
        active = true
    `;

    return NextResponse.json({
      success: true,
      templateId: demoSlug,
      fileName,
      fileSize: zipBuffer.length,
      displayName,
    });
  } catch (error: unknown) {
    console.error('Generate template error:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to generate template' }, { status: 500 });
  }
}
