import sql from '@/lib/db';
import { sendInterviewReminderEmail } from '@/lib/email';

// Throttle: only run once every 10 minutes max (in-memory, per instance)
let lastCheckAt = 0;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Check for clients who verified their email but haven't completed
 * the onboarding interview after 2 hours. Sends one reminder per project.
 * Safe to call frequently — throttled and idempotent.
 */
export async function checkAndSendInterviewReminders(): Promise<number> {
  const now = Date.now();
  if (now - lastCheckAt < CHECK_INTERVAL_MS) {
    return 0; // Too soon, skip
  }
  lastCheckAt = now;

  try {
    const eligibleProjects = await sql`
      SELECT
        p.id AS project_id,
        c.name AS client_name,
        c.email AS client_email,
        bs.company_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      JOIN brief_submissions bs ON bs.project_id = p.id
      JOIN auth_users au ON au.email = c.email AND au.email_verified = true
      WHERE p.created_at < NOW() - INTERVAL '2 hours'
        AND p.created_at > NOW() - INTERVAL '48 hours'
        AND p.status = 'new'
        AND NOT EXISTS (
          SELECT 1 FROM onboarding_sessions os
          WHERE os.project_id = p.id AND os.status = 'completed'
        )
        AND NOT EXISTS (
          SELECT 1 FROM revision_messages rm
          WHERE rm.project_id = p.id
            AND rm.sender_type = 'admin'
            AND rm.message LIKE '[System] Interview reminder sent%'
        )
    `;

    if (!eligibleProjects || eligibleProjects.length === 0) {
      return 0;
    }

    let sentCount = 0;

    for (const project of eligibleProjects) {
      try {
        const result = await sendInterviewReminderEmail({
          clientName: project.client_name,
          clientEmail: project.client_email,
          companyName: project.company_name,
        });

        if (result.success) {
          await sql`
            INSERT INTO revision_messages (project_id, sender_type, message)
            VALUES (${project.project_id}, ${'admin'}, ${'[System] Interview reminder sent to ' + project.client_email})
          `;
          sentCount++;
          console.log(`Interview reminder sent (project: ${project.project_id})`); // audit F65: no PII in logs
        }
      } catch (err) {
        console.error(`Failed to send interview reminder for project ${project.project_id}:`, err);
      }
    }

    return sentCount;
  } catch (error) {
    console.error('Interview reminder check error:', error);
    return 0;
  }
}
