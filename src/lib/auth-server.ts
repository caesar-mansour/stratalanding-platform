// Server-side auth helpers ONLY
// Use this in Server Components and API routes
import { cookies } from 'next/headers';
import { cache } from 'react';
import { verifySessionJWT } from './auth/tokens';
import { AUTH_COOKIE_NAME } from './auth/constants';
import sql from './db';

// Cached user fetch - deduped within a single request
export const getServerUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { user: null, error: null };
  }

  const payload = await verifySessionJWT(token);
  if (!payload?.sid) {
    return { user: null, error: new Error('Invalid session') };
  }

  // SECURITY (audit F7/F50/F67): do NOT trust the JWT alone. Confirm the session row
  // still exists (not signed-out / revoked) and is not expired, and read the AUTHORITATIVE
  // AAL from the DB. This makes logout / password-reset / MFA changes actually invalidate
  // a stolen token, and enforces MFA step-up on API routes (not just the page middleware).
  const [session] = await sql`
    SELECT id, aal, expires_at FROM auth_sessions WHERE id = ${payload.sid as string} LIMIT 1
  `;
  if (!session) {
    return { user: null, error: new Error('Session revoked') };
  }
  if (session.expires_at && new Date(session.expires_at as string) < new Date()) {
    return { user: null, error: new Error('Session expired') };
  }
  // MFA-enabled user on a session that hasn't completed the second factor is NOT fully
  // authenticated for data access (the 2FA endpoints use verifySessionJWT directly, so
  // this does not block completing 2FA).
  if (payload.has_mfa === true && session.aal !== 'aal2') {
    return { user: null, error: new Error('MFA required') };
  }

  return {
    user: {
      id: payload.sub as string,
      email: payload.email as string,
      aal: (session.aal as string) ?? (payload.aal as string),
    },
    error: null,
  };
});

export async function getServerSession() {
  const { user, error } = await getServerUser();
  if (!user || error) {
    return { session: null, error };
  }
  return {
    session: { user },
    error: null,
  };
}

// Check if user has a client record (for portal access)
export async function hasClientAccess(email: string) {
  const [client] = await sql`
    SELECT id FROM clients WHERE email = ${email} LIMIT 1
  `;

  return { hasAccess: !!client, clientId: client?.id };
}

// Cached client+projects fetch - single query approach
export const getClientWithProjects = cache(async (email: string) => {
  const [client] = await sql`
    SELECT * FROM clients WHERE email = ${email} LIMIT 1
  `;

  if (!client) {
    return { client: null, projects: [], error: new Error('Client not found') };
  }

  const rawProjects = await sql`
    SELECT * FROM projects WHERE client_id = ${client.id}
    ORDER BY created_at DESC
  `;
  // SECURITY (audit F66/F89): strip internal/admin-only fields before this reaches the
  // client portal — it's serialized into the browser's RSC payload.
  const projects = rawProjects.map((p) => {
    const row = { ...p };
    delete (row as { admin_notes?: unknown }).admin_notes;
    return row;
  });

  return {
    client,
    projects,
    error: null,
  };
});

// Cached project details - with all related data
export const getProjectDetails = cache(async (projectId: string, clientEmail: string) => {
  // Get project with client info
  const [project] = await sql`
    SELECT p.*, row_to_json(c.*) as clients
    FROM projects p
    INNER JOIN clients c ON c.id = p.client_id
    WHERE p.id = ${projectId}
    LIMIT 1
  `;

  if (!project) {
    return { project: null, brief: null, payments: [], error: new Error('Project not found') };
  }

  // Verify ownership
  const clientData = typeof project.clients === 'string' ? JSON.parse(project.clients) : project.clients;
  if (clientData.email !== clientEmail) {
    return { project: null, brief: null, payments: [], error: new Error('Unauthorized') };
  }

  // Get brief and payments in parallel
  const [briefs, payments] = await Promise.all([
    sql`SELECT * FROM brief_submissions WHERE project_id = ${projectId} LIMIT 1`,
    sql`SELECT * FROM payments WHERE project_id = ${projectId} ORDER BY created_at ASC`,
  ]);

  return {
    project,
    brief: briefs[0] || null,
    payments,
    error: null,
  };
});
