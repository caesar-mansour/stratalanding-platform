import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - List audit log entries
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    let entries;
    let total;

    if (entityType && entityId) {
      entries = await sql`
        SELECT * FROM audit_log
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`
        SELECT COUNT(*) FROM audit_log
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      `;
      total = parseInt(count);
    } else if (entityType) {
      entries = await sql`
        SELECT * FROM audit_log
        WHERE entity_type = ${entityType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`
        SELECT COUNT(*) FROM audit_log WHERE entity_type = ${entityType}
      `;
      total = parseInt(count);
    } else {
      entries = await sql`
        SELECT * FROM audit_log
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const [{ count }] = await sql`SELECT COUNT(*) FROM audit_log`;
      total = parseInt(count);
    }

    return NextResponse.json({
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
