import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - Search messages across all projects
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const offset = (page - 1) * limit;

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    if (query.length > 200) {
      return NextResponse.json({ error: 'Search query too long' }, { status: 400 });
    }

    const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
    const searchPattern = '%' + escapedQuery + '%';

    let results;
    let total;

    if (projectId) {
      results = await sql`
        SELECT rm.id, rm.project_id, rm.sender_type, rm.message, rm.created_at,
               c.name as client_name, c.email as client_email,
               (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = rm.project_id LIMIT 1) as company_name
        FROM revision_messages rm
        INNER JOIN projects p ON p.id = rm.project_id
        INNER JOIN clients c ON c.id = p.client_id
        WHERE rm.project_id = ${projectId} AND rm.message ILIKE ${searchPattern}
        ORDER BY rm.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`
        SELECT COUNT(*) FROM revision_messages
        WHERE project_id = ${projectId} AND message ILIKE ${searchPattern}
      `;
      total = parseInt(count);
    } else {
      results = await sql`
        SELECT rm.id, rm.project_id, rm.sender_type, rm.message, rm.created_at,
               c.name as client_name, c.email as client_email,
               (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = rm.project_id LIMIT 1) as company_name
        FROM revision_messages rm
        INNER JOIN projects p ON p.id = rm.project_id
        INNER JOIN clients c ON c.id = p.client_id
        WHERE rm.message ILIKE ${searchPattern}
        ORDER BY rm.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`
        SELECT COUNT(*) FROM revision_messages WHERE message ILIKE ${searchPattern}
      `;
      total = parseInt(count);
    }

    return NextResponse.json({
      results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Message search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
