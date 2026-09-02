import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { uploadFile } from '@/lib/storage';
import sql from '@/lib/db';

// GET — list all templates + recent purchases
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [templates, purchases] = await Promise.all([
    sql`SELECT * FROM template_files ORDER BY created_at DESC`,
    sql`
      SELECT tp.*, tf.display_name, au.account_type
      FROM template_purchases tp
      LEFT JOIN template_files tf ON tf.template_id = tp.template_id AND tf.active = true
      LEFT JOIN auth_users au ON au.email = tp.buyer_email
      ORDER BY tp.created_at DESC
      LIMIT 50
    `,
  ]);

  return NextResponse.json({ templates, purchases });
}

// POST — upload a template zip
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const templateId = formData.get('templateId') as string | null;
  const plan = formData.get('plan') as string | null;
  const displayName = formData.get('displayName') as string | null;

  if (!file || !templateId || !plan || !displayName) {
    return NextResponse.json(
      { error: 'Missing required fields: file, templateId, plan, displayName' },
      { status: 400 }
    );
  }

  const validPlans = ['presence-page', 'lead-page', 'purchase-page'];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // Upload zip to storage
  const bytes = await file.arrayBuffer();
  const storageKey = `templates/${templateId}-${Date.now()}.zip`;

  const { url, error: uploadError } = await uploadFile(
    'templates',
    `${templateId}-${Date.now()}.zip`,
    bytes,
    'application/zip'
  );

  if (uploadError || !url) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Deactivate previous versions
  await sql`
    UPDATE template_files SET active = false WHERE template_id = ${templateId}
  `;

  // Insert new template file record
  const [record] = await sql`
    INSERT INTO template_files (template_id, plan, display_name, storage_key, file_size)
    VALUES (${templateId}, ${plan}, ${displayName}, ${url}, ${bytes.byteLength})
    RETURNING *
  `;

  return NextResponse.json({ template: record });
}

// DELETE — deactivate a template
export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { templateId } = await request.json();
  if (!templateId) {
    return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
  }

  await sql`
    UPDATE template_files SET active = false WHERE template_id = ${templateId}
  `;

  return NextResponse.json({ success: true });
}
