import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getFile } from '@/lib/storage';
import { getServerUser } from '@/lib/auth-server';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - Download/stream a file by upload ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;

    // Check admin or client auth
    const isAdmin = await verifyAdmin();
    let clientId: string | null = null;

    if (!isAdmin) {
      const { user } = await getServerUser();
      if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [client] = await sql`
        SELECT id FROM clients WHERE email = ${user.email} LIMIT 1
      `;
      if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      clientId = client.id;
    }

    // Get upload record
    const [upload] = await sql`
      SELECT pu.*, p.client_id
      FROM project_uploads pu
      INNER JOIN projects p ON p.id = pu.project_id
      WHERE pu.id = ${uploadId}
      LIMIT 1
    `;

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Non-admin must own the project
    if (!isAdmin && upload.client_id !== clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Read file from storage
    const { data, error } = await getFile(upload.storage_path);
    if (error || !data) {
      console.error('File read error:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // SECURITY (audit F5): only images may render inline; everything else (incl. SVG/HTML)
    // is forced to download with nosniff so a malicious upload can't execute as script on our
    // origin. Filename is stripped of CR/LF/quote to prevent header injection (F83).
    const fileType = String(upload.file_type || 'application/octet-stream');
    const inlineSafe = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType);
    const safeName = String(upload.file_name || 'file').replace(/[\r\n"]/g, '').slice(0, 200);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': fileType,
        'Content-Disposition': `${inlineSafe ? 'inline' : 'attachment'}; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
