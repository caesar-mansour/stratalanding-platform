import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { createPayPalOrder } from '@/lib/paypal';
import { type PackageType, type PackageCustomizations } from '@/lib/types';
import { amountDueCents } from '@/lib/project-payment';

export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, paymentType } = await request.json();

    if (!projectId || !paymentType) {
      return NextResponse.json({ error: 'Missing projectId or paymentType' }, { status: 400 });
    }

    if (!['deposit', 'final'].includes(paymentType)) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    // Get project and verify ownership
    const [project] = await sql`
      SELECT p.*, c.email as client_email
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify user owns this project
    if (project.client_email !== user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify project is in correct status for this payment.
    // SECURITY (audit F60): a deposit requires a real proposal first (status 'proposal_sent').
    // Allowing it at 'new' let a brand-new self-served brief force 'deposit_paid' at a
    // self-chosen tier — unlocking chat/features — before the studio scoped and priced the work.
    const depositAllowedStatuses = ['proposal_sent'];
    if (paymentType === 'deposit' && !depositAllowedStatuses.includes(project.status)) {
      return NextResponse.json({ error: 'A proposal is required before paying a deposit.' }, { status: 400 });
    }

    if (paymentType === 'final' && project.status !== 'ready_for_final_payment') {
      return NextResponse.json({ error: 'Project not ready for final payment' }, { status: 400 });
    }

    // Get the base URL for return/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // AUDIT 2026-08-12 (P0-6): a deposit is half the total, but the FINAL payment is
    // `total − deposits already paid`, not half of a freshly recomputed total. amountDueCents() is
    // the single source of truth shared with capture-order's validation.
    const customizations = project.package_customizations as PackageCustomizations | null;
    const { dueCents, totalCents } = await amountDueCents(
      projectId,
      project.package as PackageType,
      customizations,
      paymentType,
    );

    if (dueCents <= 0) {
      return NextResponse.json({ error: 'This project has no outstanding balance.' }, { status: 400 });
    }

    const order = await createPayPalOrder({
      projectId,
      packageType: project.package as PackageType,
      paymentType,
      customPriceCents: totalCents,
      exactAmountCents: dueCents,
      returnUrl: `${baseUrl}/portal/payment/success?type=${paymentType}`,
      cancelUrl: `${baseUrl}/portal?payment=cancelled`,
    });

    // Return the approval URL for redirect
    const approvalUrl = order.links?.find((link: { rel: string }) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      console.error('No approval URL in PayPal response:', order);
      return NextResponse.json({ error: 'Failed to get payment URL' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      approvalUrl,
    });
  } catch (error) {
    console.error('Create PayPal order error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
