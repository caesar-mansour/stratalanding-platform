import sql from '@/lib/db';

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await sql`
      INSERT INTO audit_log (actor, action, entity_type, entity_id, details, ip_address)
      VALUES (
        'admin',
        ${params.action},
        ${params.entityType},
        ${params.entityId || null},
        ${JSON.stringify(params.details || {})},
        ${params.ip || null}
      )
    `;
  } catch (error) {
    // Audit logging should never block the main operation
    console.error('Audit log error:', error);
  }
}
