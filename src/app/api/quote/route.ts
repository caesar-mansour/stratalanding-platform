import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendBriefNotificationToAdmin } from '@/lib/email';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

interface QuoteFormData {
  name: string;
  email: string;
  website?: string;
  projectType: string;
  timeline?: string;
  budget?: string;
  notes?: string;
}

// Map quote project types to industry labels for the brief
const projectTypeToIndustry: Record<string, string> = {
  'landing-page': 'Landing Page',
  'funnel': 'Full Funnel',
  'redesign': 'Redesign',
  'optimization': 'Conversion Optimization',
  'other': 'Other',
};

export async function POST(request: Request) {
  try {
    // Rate limit: 3 quotes per IP per hour
    const ip = getClientIp(request);
    const { allowed } = await rateLimitDurable(`quote:ip:${ip}`, { max: 3, windowSeconds: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const formData: QuoteFormData = await request.json();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.projectType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and project type are required' },
        { status: 400 }
      );
    }

    // Input length validation
    if (typeof formData.name !== 'string' || formData.name.length > 200) {
      return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
    }
    if (typeof formData.email !== 'string' || formData.email.length > 320) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (formData.notes && (typeof formData.notes !== 'string' || formData.notes.length > 5000)) {
      return NextResponse.json({ error: 'Notes are too long' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = formData.email.toLowerCase();

    // Check if email is banned
    const [bannedEmail] = await sql`
      SELECT id FROM banned_emails WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (bannedEmail) {
      return NextResponse.json(
        { error: 'This account has been restricted. Please contact support if you believe this is an error.' },
        { status: 403 }
      );
    }

    // Build notes from all quote fields
    const notesContent = [
      formData.notes,
      `Project Type: ${projectTypeToIndustry[formData.projectType] || formData.projectType}`,
      formData.budget ? `Budget: ${formData.budget}` : null,
      formData.timeline ? `Timeline: ${formData.timeline}` : null,
      formData.website ? `Website: ${formData.website}` : null,
    ].filter(Boolean).join('\n\n');

    const industry = projectTypeToIndustry[formData.projectType] || formData.projectType;
    const companyName = formData.website
      ? formData.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : 'Quote Request';

    // Use a transaction for client + project + brief creation (same as /brief)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { project } = await sql.begin(async (tx: any) => {
      // 1. Create or get client
      const [existingClient] = await tx`
        SELECT * FROM clients WHERE email = ${normalizedEmail} LIMIT 1
      `;

      let client: { id: string; email: string; name: string };

      if (existingClient) {
        if (formData.name && formData.name !== existingClient.name) {
          await tx`UPDATE clients SET name = ${formData.name} WHERE id = ${existingClient.id}`;
        }
        client = existingClient as { id: string; email: string; name: string };
      } else {
        const [newClient] = await tx`
          INSERT INTO clients (email, name)
          VALUES (${normalizedEmail}, ${formData.name})
          RETURNING *
        `;
        if (!newClient) throw new Error('Client creation failed');
        client = newClient as { id: string; email: string; name: string };
      }

      // 2. Create project (no plan selected — admin assigns later)
      const siteId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      const [project] = await tx`
        INSERT INTO projects (client_id, package, timeline, status, site_id, source)
        VALUES (${client.id}, ${'starter'}, ${'no_rush'}, ${'new'}, ${siteId}, ${'quote'})
        RETURNING *
      `;
      if (!project) throw new Error('Project creation failed');

      // 3. Create brief submission
      await tx`
        INSERT INTO brief_submissions (project_id, company_name, industry, primary_goal, audience, notes)
        VALUES (
          ${project.id},
          ${companyName},
          ${industry},
          ${'To be discussed'},
          ${'To be discussed'},
          ${notesContent}
        )
      `;

      return { client, project };
    });

    // 4. Auto-create milestones (non-critical)
    try {
      const milestoneTypes = [
        { type: 'brief_received', requires_approval: false },
        { type: 'research_complete', requires_approval: false },
        { type: 'wireframe_sent', requires_approval: false },
        { type: 'wireframe_approved', requires_approval: true },
        { type: 'build_complete', requires_approval: false },
        { type: 'final_review_sent', requires_approval: false },
        { type: 'final_review_approved', requires_approval: true },
        { type: 'launched', requires_approval: false },
      ];
      for (const m of milestoneTypes) {
        const isFirst = m.type === 'brief_received';
        await sql`
          INSERT INTO project_milestones (project_id, milestone_type, requires_approval, status, completed_at)
          VALUES (
            ${project.id}, ${m.type}, ${m.requires_approval},
            ${isFirst ? 'completed' : 'pending'},
            ${isFirst ? new Date().toISOString() : null}
          )
        `;
      }
    } catch (milestoneError) {
      console.error('Failed to create milestones (non-blocking):', milestoneError);
    }

    // SECURITY (audit F65): don't log client PII to server logs — reference the project id only.
    console.log('New quote submission:', project.id);

    // Send admin notification
    const adminEmailResult = await sendBriefNotificationToAdmin({
      clientName: formData.name,
      clientEmail: formData.email,
      companyName,
      industry,
      packageType: 'starter',
      notes: notesContent,
      projectId: project.id,
    });

    if (!adminEmailResult.success) {
      console.error('CRITICAL: Admin notification email failed:', adminEmailResult.error);
      try {
        await sql`
          INSERT INTO revision_messages (project_id, sender_type, message)
          VALUES (${project.id}, ${'admin'}, ${'[System] Admin email notification failed for quote submission. Check dashboard manually.'})
        `;
      } catch {
        // Best-effort logging
      }
    }

    // Client creates their account on the success page, which triggers verification email.
    // A cron job sends an interview reminder if they don't complete it.

    return NextResponse.json({
      success: true,
      projectId: project.id,
    });
  } catch (error) {
    console.error('Quote submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
