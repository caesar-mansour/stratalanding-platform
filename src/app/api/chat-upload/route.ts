import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, getFileUrl } from '@/lib/storage';
import { getServerUser } from '@/lib/auth-server';
import { verifyAdmin } from '@/lib/admin-auth';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';
import { getClientIp } from '@/lib/rate-limit';
import sql from '@/lib/db';

// Validate file magic bytes to prevent MIME spoofing
function validateMagicBytes(hex: string, mimeType: string): boolean {
  const signatures: Record<string, string[]> = {
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'], // RIFF header
    'video/mp4': ['00000018', '00000020', '0000001C', '66747970'], // ftyp variants
  };
  const sigs = signatures[mimeType];
  if (!sigs) return true; // No signature check for webm, quicktime — allow through
  return sigs.some(sig => hex.startsWith(sig));
}

// POST - Upload file to chat
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin or client
    const isAdmin = await verifyAdmin();
    const userType: 'admin' | 'client' = isAdmin ? 'admin' : 'client';

    // AUDIT 2026-08-12 (P2): authenticated, but there was NO rate limit at all on a route that
    // streams file bytes into a Postgres BYTEA column. One compromised or careless client account
    // could fill the database. Durable (shared across lambda instances), unlike the in-memory
    // limiter which resets on every cold start.
    if (!isAdmin) {
      const { allowed } = await rateLimitDurable(`chat-upload:ip:${getClientIp(request)}`, {
        max: 30,
        windowSeconds: 3600,
      });
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many uploads. Please try again later.' },
          { status: 429 },
        );
      }
    }
    let userEmail: string | null = null;

    if (!isAdmin) {
      const { user } = await getServerUser();
      if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userEmail = user.email;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // SECURITY (audit F35): a non-admin may only upload into a project they own.
    if (!isAdmin) {
      const [client] = await sql`SELECT id FROM clients WHERE email = ${userEmail} LIMIT 1`;
      const ownedProject = client
        ? (await sql`SELECT id FROM projects WHERE id = ${projectId} AND client_id = ${client.id} LIMIT 1`)[0]
        : undefined;
      if (!ownedProject) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV'
      }, { status: 400 });
    }

    // Max file size: 50MB
    // AUDIT 2026-08-12 (P2): 50 MB was unachievable and misleading — Netlify caps a function
    // request payload at roughly 6 MB, so anything approaching the old limit failed at the edge
    // with an opaque error rather than this route's clean message. 5 MB is the honest ceiling.
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 50MB' }, { status: 400 });
    }

    // Read buffer once for both magic byte check and upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Verify file magic bytes (prevents MIME spoofing)
    const bytes = buffer.slice(0, 8);
    const hex = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    if (!validateMagicBytes(hex, file.type)) {
      return NextResponse.json({ error: 'File content does not match its declared type' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `chat/${projectId}/${timestamp}-${randomId}.${ext}`;

    const { url: blobUrl, error: uploadError } = await uploadFile(
      'uploads',
      filename,
      buffer,
      file.type,
      { projectId: projectId, uploadedBy: String(userType) },
    );

    if (uploadError || !blobUrl) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // blobUrl is now a storage key — resolve to a servable URL
    const serveUrl = getFileUrl(blobUrl);

    return NextResponse.json({
      url: serveUrl,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
      size: file.size,
      userType,
    });
  } catch (error) {
    console.error('Chat upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
