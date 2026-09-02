import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - List payments with optional project filter
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    let payments;
    let total;

    if (projectId) {
      payments = await sql`
        SELECT p.*,
               c.name as client_name, c.email as client_email,
               bs.company_name
        FROM payments p
        INNER JOIN projects pr ON pr.id = p.project_id
        INNER JOIN clients c ON c.id = pr.client_id
        LEFT JOIN brief_submissions bs ON bs.project_id = pr.id
        WHERE p.project_id = ${projectId}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM payments WHERE project_id = ${projectId}`;
      total = parseInt(count);
    } else {
      payments = await sql`
        SELECT p.*,
               c.name as client_name, c.email as client_email,
               bs.company_name
        FROM payments p
        INNER JOIN projects pr ON pr.id = p.project_id
        INNER JOIN clients c ON c.id = pr.client_id
        LEFT JOIN brief_submissions bs ON bs.project_id = pr.id
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM payments`;
      total = parseInt(count);
    }

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
