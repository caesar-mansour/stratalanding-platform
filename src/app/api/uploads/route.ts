import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { uploadFile, deleteFiles } from '@/lib/storage';
import { getServerUser } from '@/lib/auth-server';
import { validateSvgContent } from '@/lib/security/sanitize';

// Validate file magic bytes to prevent MIME spoofing
function validateMagicBytes(hex: string, mimeType: string): boolean {
  const signatures: Record<string, string[]> = {
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'], // RIFF header
    'application/pdf': ['25504446'],
    'application/zip': ['504B0304', '504B0506', '504B0708'],
    'application/x-zip-compressed': ['504B0304', '504B0506'],
  };
  const sigs = signatures[mimeType];
  if (!sigs) return true; // No signature check for text/csv, docx, svg — allow through
  return sigs.some(sig => hex.startsWith(sig));
}

// GET - List uploads for user's project
export async function GET() {
  try {
    const { user } = await getServerUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's project
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${user.email} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'No client found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id FROM projects WHERE client_id = ${client.id}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'No project found' }, { status: 404 });
    }

    // Get uploads for project
    const uploads = await sql`
      SELECT * FROM project_uploads WHERE project_id = ${project.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ uploads, projectId: project.id });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload a file
export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'other';
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
    }

    // AUDIT 2026-08-12 (P2): 10 MB was above what the platform will actually accept. Netlify caps
    // a function request payload near 6 MB, so a file between 6 and 10 MB was rejected at the edge
    // with an opaque platform error rather than this route's clean message — the client saw a
    // generic failure and had no idea the file was simply too big. 5 MB is the honest ceiling.
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'File type not allowed. Allowed: images, PDF, Word docs, text, CSV, ZIP'
      }, { status: 400 });
    }

    // Verify file magic bytes for common types (prevents MIME spoofing)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 8));
    const hex = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    const magicValid = validateMagicBytes(hex, file.type);
    if (!magicValid) {
      return NextResponse.json({ error: 'File content does not match its type' }, { status: 400 });
    }

    // Validate SVG content for XSS
    if (file.type === 'image/svg+xml') {
      if (!validateSvgContent(Buffer.from(buffer))) {
        return NextResponse.json({ error: 'SVG contains potentially unsafe content' }, { status: 400 });
      }
    }

    // Verify project belongs to user
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${user.email} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [project] = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND client_id = ${client.id} LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${projectId}/${timestamp}_${safeFileName}`;

    // Upload to storage (reuse buffer from magic byte check above)
    const { url: blobUrl, error: uploadError } = await uploadFile(
      'project-files',
      storagePath,
      buffer,
      file.type,
      { projectId: project.id, uploadedBy: String(user.email) },
    );

    if (uploadError || !blobUrl) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create database record (store blob URL in storage_path)
    const [upload] = await sql`
      INSERT INTO project_uploads (project_id, file_name, file_type, file_size, storage_path, uploaded_by, category)
      VALUES (${projectId}, ${file.name}, ${file.type}, ${file.size}, ${blobUrl}, ${user.email}, ${category})
      RETURNING *
    `;

    if (!upload) {
      // Try to clean up the uploaded file
      await deleteFiles('project-files', [blobUrl]);
      return NextResponse.json({ error: 'Failed to save upload record' }, { status: 500 });
    }

    return NextResponse.json({ upload }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getServerUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('id');

    if (!uploadId) {
      return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
    }

    // Get upload record and verify ownership
    const [upload] = await sql`
      SELECT * FROM project_uploads
      WHERE id = ${uploadId} AND uploaded_by = ${user.email}
      LIMIT 1
    `;

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Delete from Vercel Blob (storage_path now stores the blob URL)
    const { error: storageError } = await deleteFiles('project-files', [upload.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete database record
    await sql`DELETE FROM project_uploads WHERE id = ${uploadId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
