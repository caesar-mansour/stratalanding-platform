import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { type PackageType } from '@/lib/types';
import { sendBriefNotificationToAdmin, sendProposalToClient, sendBriefConfirmationToClient } from '@/lib/email';
import { createAndInsertProposal } from '@/lib/proposal-generator';
import { packagePricing } from '@/lib/types';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';
import { looksLikeSpam } from '@/lib/form-guards';

interface BriefFormData {
  name: string;
  email: string;
  companyName: string;
  industry: string;
  notes?: string;
  plan?: string;
  demo?: string;
  referralCode?: string;
  packageCustomizations?: {
    addOns: string[];
    extraRounds: string;
    extendedSupport: string;
    totalEstimate: number;
  };
}

export async function POST(request: Request) {
  try {
    // Rate limit: 3 briefs per IP per hour
    const ip = getClientIp(request);
    const { allowed } = await rateLimitDurable(`brief:ip:${ip}`, { max: 3, windowSeconds: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const formData: BriefFormData = await request.json();

    // AUDIT 2026-08-12 (P2): silent spam drop — see lib/form-guards. A bot that fills the hidden
    // field or posts instantly gets a success-shaped response and nothing is written.
    if (looksLikeSpam(formData as unknown as Record<string, unknown>)) {
      return NextResponse.json({ success: true, projectId: null, message: 'Brief submitted successfully' });
    }

    // Validate required fields
    if (!formData.email || !formData.companyName || !formData.industry || !formData.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Input length validation
    if (typeof formData.name !== 'string' || formData.name.length > 200) {
      return NextResponse.json({ error: 'Name is too long (max 200 characters)' }, { status: 400 });
    }
    if (typeof formData.email !== 'string' || formData.email.length > 320) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (typeof formData.companyName !== 'string' || formData.companyName.length > 200) {
      return NextResponse.json({ error: 'Company name is too long' }, { status: 400 });
    }
    if (formData.notes && (typeof formData.notes !== 'string' || formData.notes.length > 5000)) {
      return NextResponse.json({ error: 'Notes are too long (max 5,000 characters)' }, { status: 400 });
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
        { error: 'Unable to process this request. Please contact support.' },
        { status: 400 }
      );
    }

    // Map plan to package type — only set if explicitly chosen
    const validPlans = ['starter', 'growth', 'scale'];
    const planExplicitlyChosen = validPlans.includes(formData.plan || '');
    const packageType: PackageType = planExplicitlyChosen
      ? (formData.plan as PackageType)
      : 'starter'; // DB requires a value; admin will assign the real package

    // Use a transaction for client + project + brief creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { client, project } = await sql.begin(async (tx: any) => {
      // 1. Create or get client
      const [existingClient] = await tx`
        SELECT * FROM clients WHERE email = ${normalizedEmail} LIMIT 1
      `;

      let client: { id: string; email: string; name: string };

      if (existingClient) {
        if (formData.name && formData.name !== existingClient.name) {
          await tx`
            UPDATE clients SET name = ${formData.name} WHERE id = ${existingClient.id}
          `;
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

      // 2. Create project (with customizations if provided)
      const siteId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const validAddOns = ['copy', 'rush', 'photos', 'seo'];
      const validExtraRounds = ['none', 'rev-1', 'rev-5'];
      const validExtended = ['none', 'ext-1mo', 'ext-3mo', 'ext-6mo', 'ext-1yr'];

      let customizationsJson = null;
      if (formData.packageCustomizations) {
        const c = formData.packageCustomizations;
        customizationsJson = {
          addOns: (c.addOns || []).filter((a: string) => validAddOns.includes(a)),
          extraRounds: validExtraRounds.includes(c.extraRounds) ? c.extraRounds : 'none',
          extendedSupport: validExtended.includes(c.extendedSupport) ? c.extendedSupport : 'none',
          totalEstimate: typeof c.totalEstimate === 'number' ? c.totalEstimate : 0,
          updatedAt: new Date().toISOString(),
        };
      }

      const [project] = await tx`
        INSERT INTO projects (client_id, package, timeline, status, site_id, package_customizations, source)
        VALUES (${client.id}, ${packageType}, ${'no_rush'}, ${'new'}, ${siteId}, ${customizationsJson}, ${'brief'})
        RETURNING *
      `;
      if (!project) throw new Error('Project creation failed');

      // 3. Create brief submission
      const notesValue = formData.demo
        ? `[Demo: ${formData.demo}]\n\n${formData.notes || ''}`.trim()
        : (formData.notes || null);

      await tx`
        INSERT INTO brief_submissions (project_id, company_name, industry, primary_goal, audience, notes)
        VALUES (
          ${project.id},
          ${formData.companyName},
          ${formData.industry},
          ${'To be discussed'},
          ${'To be discussed'},
          ${notesValue}
        )
      `;

      // 4. Link referral code if provided and valid
      if (formData.referralCode && typeof formData.referralCode === 'string') {
        const sanitizedRef = formData.referralCode.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20).toUpperCase();
        if (sanitizedRef) {
          const [affiliate] = await tx`
            SELECT referral_code FROM affiliates WHERE referral_code = ${sanitizedRef} AND status = 'active' LIMIT 1
          `;
          if (affiliate) {
            await tx`UPDATE projects SET referral_code = ${sanitizedRef} WHERE id = ${project.id}`;
          }
        }
      }

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

    // Only auto-generate proposal if a plan was explicitly selected
    let proposalCreated = false;
    let createdProposal: Record<string, unknown> | null = null;
    if (planExplicitlyChosen) {
      try {
        const customizations = formData.packageCustomizations
          ? {
              addOns: formData.packageCustomizations.addOns || [],
              extraRounds: formData.packageCustomizations.extraRounds || 'none',
              extendedSupport: formData.packageCustomizations.extendedSupport || 'none',
              totalEstimate: formData.packageCustomizations.totalEstimate || 0,
            }
          : null;

        // Check if onboarding already completed (returning client with existing session)
        const [existingOnboarding] = await sql`
          SELECT status FROM onboarding_sessions
          WHERE project_id = ${project.id} AND status = 'completed' LIMIT 1
        `;

        const proposalStatus = existingOnboarding ? 'sent' as const : 'draft' as const;

        createdProposal = await createAndInsertProposal({
          projectId: project.id,
          clientName: formData.name,
          clientEmail: normalizedEmail,
          companyName: formData.companyName,
          industry: formData.industry,
          packageType,
          notes: formData.notes,
          customizations,
          status: proposalStatus,
        });
        proposalCreated = true;

        // If onboarding already done, send proposal immediately
        if (existingOnboarding && createdProposal) {
          await sql`UPDATE projects SET status = 'proposal_sent' WHERE id = ${project.id}`;
          const totalPrice = packagePricing[packageType] / 100;
          await sendProposalToClient({
            clientName: formData.name,
            clientEmail: normalizedEmail,
            companyName: formData.companyName,
            packageType,
            totalPrice,
            depositAmount: totalPrice / 2,
            proposalId: createdProposal.id as string,
            validUntil: createdProposal.valid_until as string,
            notes: createdProposal.notes as string,
            depositPaymentUrl: createdProposal.deposit_payment_url as string,
          });
        }
      } catch (proposalError) {
        console.error('Failed to create auto-proposal (non-blocking):', proposalError);
      }
    }

    // SECURITY (audit F65): don't log client PII to server logs — reference the project id only.
    console.log('New brief submission:', project.id);

    // AUDIT 2026-08-12 (P1 E-02): the brief submitter received NO acknowledgement at all — the
    // template existed (sendBriefConfirmationToClient) but had zero call sites. A prospect handed
    // over their details and got silence, which reads as a broken form and kills the lead.
    // Non-blocking: a failed acknowledgement must not fail the submission, and the failure is now
    // recorded durably in email_failures by the transport.
    sendBriefConfirmationToClient({
      clientName: formData.name,
      clientEmail: normalizedEmail,
      companyName: formData.companyName,
    }).catch((err) => console.error('Brief acknowledgement email failed (non-blocking):', err));

    // Send email notification to admin
    const adminEmailResult = await sendBriefNotificationToAdmin({
      clientName: formData.name,
      clientEmail: formData.email,
      companyName: formData.companyName,
      industry: formData.industry,
      packageType,
      demoReference: formData.demo,
      notes: formData.notes,
      projectId: project.id,
    });

    if (adminEmailResult.success) {
      console.log('Admin notification email sent successfully');
    } else {
      console.error('CRITICAL: Admin notification email failed:', adminEmailResult.error);
      // Log to DB so we don't lose track of this brief
      try {
        await sql`
          INSERT INTO revision_messages (project_id, sender_type, message)
          VALUES (${project.id}, ${'admin'}, ${'[System] Admin email notification failed for brief submission. Check dashboard manually.'})
        `;
      } catch {
        // Best-effort logging
      }
    }

    // Client will create their account on the brief success page,
    // which triggers a verification email. No onboarding invite needed here.
    // A cron job sends an interview reminder if they don't complete it.
    if (proposalCreated && createdProposal && createdProposal.status !== 'draft') {
      console.log('Proposal already sent to client (onboarding was completed)');
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      message: 'Brief submitted successfully',
    });
  } catch (error) {
    console.error('Brief submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
