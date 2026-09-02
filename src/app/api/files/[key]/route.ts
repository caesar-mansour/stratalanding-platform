import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/storage';
import { getServerUser } from '@/lib/auth-server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';

// Infer content type from key extension
function inferContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  };
  return types[ext || ''] || 'application/octet-stream';
}

// GET - Serve a file by storage key (for chat uploads without DB record)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: encodedKey } = await params;
    const storageKey = decodeURIComponent(encodedKey);

    // Prevent path traversal
    if (storageKey.includes('..')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    // SECURITY (audit F6): storage keys embed the projectId (`project-files/{projectId}/...`,
    // `uploads/chat/{projectId}/...`). A non-admin may only read a file whose key references
    // one of THEIR OWN projects — previously any logged-in user could read any file by key.
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      const { user } = await getServerUser();
      if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const [client] = await sql`SELECT id FROM clients WHERE email = ${user.email} LIMIT 1`;
      if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // AUDIT 2026-08-12: authorize by the OWNER COLUMN first (migration 061). Deciding access by
      // parsing the project id out of the key string works only while every writer follows that
      // naming convention — a convention is not a constraint, and a key written without it escapes
      // the check entirely. A row that records its owner can be joined against.
      const [owned] = await sql`
        SELECT fs.storage_key
        FROM file_store fs
        INNER JOIN projects p ON p.id = fs.project_id
        WHERE fs.storage_key = ${storageKey} AND p.client_id = ${client.id}
        LIMIT 1
      `;

      if (!owned) {
        // Fall back to the path-segment check for rows written BEFORE 061 (project_id NULL).
        // SECURITY (audit L-files-key): the id must be a full PATH SEGMENT, never a loose
        // substring, so it cannot match by accidental overlap.
        const [legacy] = await sql`
          SELECT storage_key FROM file_store
          WHERE storage_key = ${storageKey} AND project_id IS NULL LIMIT 1
        `;
        const projects = await sql<Array<{ id: string }>>`SELECT id FROM projects WHERE client_id = ${client.id}`;
        const keySegments = new Set(storageKey.split('/'));
        const ownsLegacyKey = !!legacy && projects.some((p) => keySegments.has(String(p.id)));
        if (!ownsLegacyKey) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const { data, error } = await getFile(storageKey);
    if (error || !data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const contentType = inferContentType(storageKey);

    // Safe images can be displayed inline; SVGs and other types force download
    const isInlineSafe = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType);
    const disposition = isInlineSafe ? 'inline' : 'attachment';

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
