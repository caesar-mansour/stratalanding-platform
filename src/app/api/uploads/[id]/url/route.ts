import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { getFileUrl } from '@/lib/storage';

// GET - Get URL for a file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;
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

    const [upload] = await sql`
      SELECT pu.*, p.client_id
      FROM project_uploads pu
      INNER JOIN projects p ON p.id = pu.project_id
      WHERE pu.id = ${uploadId}
      LIMIT 1
    `;

    if (!upload || upload.client_id !== client.id) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const url = getFileUrl(upload.storage_path, upload.id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting file URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
