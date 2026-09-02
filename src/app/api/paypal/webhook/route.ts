import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import sql from '@/lib/db';
import { verifyPayPalWebhook } from '@/lib/paypal';
import { sendPaymentConfirmationEmail } from '@/lib/email';
import { getEffectivePrice } from '@/lib/price-override';
import type { ProjectStatus, PackageType, PackageCustomizations } from '@/lib/types';

const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();

  // Get PayPal headers for verification
  const paypalHeaders: Record<string, string> = {
    'paypal-auth-algo': headersList.get('paypal-auth-algo') || '',
    'paypal-cert-url': headersList.get('paypal-cert-url') || '',
    'paypal-transmission-id': headersList.get('paypal-transmission-id') || '',
    'paypal-transmission-sig': headersList.get('paypal-transmission-sig') || '',
    'paypal-transmission-time': headersList.get('paypal-transmission-time') || '',
  };

  // Verify webhook signature. FAIL CLOSED in production (audit F2): if PAYPAL_WEBHOOK_ID
  // is not configured we cannot verify authenticity, so reject rather than trust the
  // payload — otherwise a forged webhook could mark projects paid / fulfill templates /
  // mint affiliate commissions.
  if (!webhookId) {
    if (process.env.NODE_ENV === 'production') {
      console.error('PAYPAL_WEBHOOK_ID not configured — rejecting webhook (fail closed)');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }
    // Non-production without a webhook id configured: allowed (no signature to verify).
  } else {
    const isValid = await verifyPayPalWebhook(webhookId, paypalHeaders, body);
    if (!isValid) {
      console.error('PayPal webhook signature verification failed');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (err) {
    console.error('Failed to parse webhook body:', err);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  console.log(`Received PayPal event: ${event.event_type} (${event.id})`);

  // Handle the event
  try {
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Customer approved the order, but payment not yet captured
        console.log('Order approved:', event.resource.id);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        console.log('Payment capture denied:', event.resource.id);
        break;

      // SECURITY (audit F58): handle money flowing BACK. Without these, a refund/chargeback
      // left the project marked paid, chat unlocked, and the affiliate commission payable.
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleRefundOrReversal(event, 'refund');
        break;
      case 'PAYMENT.CAPTURE.REVERSED':
        await handleRefundOrReversal(event, 'reversal');
        break;
      case 'CUSTOMER.DISPUTE.CREATED':
        await handleRefundOrReversal(event, 'dispute');
        break;

      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

interface PayPalCaptureEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status: string;
    amount: {
      currency_code: string;
      value: string;
    };
    custom_id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
}

async function handlePaymentCaptureCompleted(event: PayPalCaptureEvent) {
  const capture = event.resource;

  console.log('Processing PAYMENT.CAPTURE.COMPLETED:', {
    captureId: capture.id,
    status: capture.status,
    amount: capture.amount,
    customId: capture.custom_id,
  });

  // Only process successful captures
  if (capture.status !== 'COMPLETED') {
    console.log('Capture not completed, skipping');
    return;
  }

  // Parse custom_id to determine payment type
  let paymentType: 'deposit' | 'final' | undefined;
  let projectId: string | undefined;

  if (capture.custom_id) {
    try {
      const customData = JSON.parse(capture.custom_id);

      // Template purchase — handle separately and return early
      // AUDIT 2026-08-12: template checkout is DISABLED (create-template-order returns 410 and
      // capture-order refuses these), so nothing can legitimately produce a template order any
      // more. Refuse here too rather than leave one live fulfilment path — it is the only route
      // that still reached the account-mutating code in template-delivery.
      if (customData.type === 'template') {
        console.error('Refusing a template fulfilment via webhook — template checkout is disabled', { eventId: event.id });
        return;
      }


      paymentType = customData.payment_type;
      projectId = customData.project_id;
    } catch {
      console.error('Failed to parse custom_id:', capture.custom_id);
    }
  }

  if (!paymentType || !projectId) {
    console.error('Missing payment metadata:', { paymentType, projectId });
    return;
  }

  // Validate project exists
  const [project] = await sql`
    SELECT p.*, c.email as client_email, c.name as client_name,
           (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
    FROM projects p
    INNER JOIN clients c ON c.id = p.client_id
    WHERE p.id = ${projectId}
    LIMIT 1
  `;

  if (!project) {
    console.error('Project not found:', projectId);
    return;
  }

  // Get amount from capture
  const amountCents = Math.round(parseFloat(capture.amount.value) * 100);

  // SECURITY (audit F51): the INSERT itself is the idempotency gate — no SELECT-then-INSERT window.
  //
  // AUDIT 2026-08-12: the conflict target used to be `paypal_event_id`, which is the WRONG index
  // for the common case. On the portal path, capture-order records the payment first with a
  // paypal_capture_id and a NULL paypal_event_id. The webhook then arrives for that same capture,
  // conflicts on the UNIQUE paypal_capture_id index — which this ON CONFLICT did not cover — and
  // the uncaught unique violation threw, producing a 500. PayPal then retried that event forever,
  // and the client never got the confirmation email, welcome message or affiliate commission.
  //
  // Conflicting on paypal_capture_id with a conditional DO UPDATE fixes both directions and keeps
  // the side effects below exactly-once, using paypal_event_id as the "webhook has processed this"
  // marker (no schema change required):
  //   - no row yet                        → INSERT, RETURNING fires  → side effects run
  //   - row from capture-order (event NULL)→ UPDATE sets event id, RETURNING fires → side effects run
  //   - row already carries an event id    → WHERE fails, no row returned → side effects skipped
  const [inserted] = await sql`
    INSERT INTO payments (
      project_id, type, amount_cents, currency,
      paypal_event_id, paypal_payment_status, paypal_capture_id
    ) VALUES (
      ${projectId}, ${paymentType}, ${amountCents},
      ${capture.amount.currency_code.toLowerCase()},
      ${event.id}, ${capture.status}, ${capture.id}
    )
    ON CONFLICT (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL
    DO UPDATE SET
      paypal_event_id = EXCLUDED.paypal_event_id,
      paypal_payment_status = EXCLUDED.paypal_payment_status
    WHERE payments.paypal_event_id IS NULL
    RETURNING id
  `;
  if (!inserted) {
    console.log('Event already processed (idempotent), skipping:', event.id);
    return;
  }

  console.log('Payment record created:', { paymentType, amountCents, projectId });

  // SECURITY (audit F17): only advance the paid status when the captured amount matches the
  // server-computed price (deposit/final = 50%). The payment is recorded above regardless
  // (the event is signature-verified), but a short/partial capture must not mark a project paid.
  const expectedTotalCents = await getEffectivePrice(
    projectId,
    project.package as PackageType,
    (project.package_customizations as PackageCustomizations | null) ?? null,
  );
  if (amountCents < Math.round(expectedTotalCents / 2)) {
    console.error('Webhook capture amount below expected price; not advancing status', { projectId, amountCents });
    return;
  }

  // Update project status based on payment type
  let newStatus: ProjectStatus;

  if (paymentType === 'deposit') {
    // Deposit paid -> unlock chat and client portal features
    newStatus = 'deposit_paid';
  } else if (paymentType === 'final') {
    // Final payment -> paid in full
    newStatus = 'paid_in_full';
  } else {
    console.error('Unknown payment type:', paymentType);
    return;
  }

  // AUDIT 2026-08-12: guard the transition the same way capture-order does (audit F60). Without an
  // allowed-from list a delayed or out-of-order event — e.g. the deposit webhook arriving after the
  // final payment already landed — silently downgraded a paid_in_full project back to deposit_paid,
  // re-locking features the client had paid for.
  const allowedFrom = paymentType === 'deposit'
    ? ['proposal_sent']
    : ['ready_for_final_payment', 'in_production', 'deposit_paid'];
  const advanced = await sql`
    UPDATE projects SET status = ${newStatus}
    WHERE id = ${projectId} AND status = ANY(${allowedFrom})
    RETURNING id
  `;

  console.log('Project status updated:', { projectId, newStatus, advanced: advanced.length > 0 });

  // Send automated welcome message for deposit payments
  if (paymentType === 'deposit') {
    const welcomeMessage = `Welcome aboard! 🎉 Thank you for your deposit - I'm excited to start working on your landing page!

To get started, I'll need a few things from you:
• Your logo (SVG or PNG preferred)
• Brand colors (hex codes if you have them)
• Product images or screenshots
• Your copy/text content
• Any inspiration or reference sites you like

You can upload everything in the **Uploads** section of your portal. Once I have your assets, I'll begin designing and you can expect the first draft within 3-5 business days.

Feel free to message me here anytime with questions!`;

    await sql`
      INSERT INTO revision_messages (project_id, sender_type, message)
      VALUES (${projectId}, 'admin', ${welcomeMessage})
    `;

    console.log('Welcome message sent to project:', projectId);
  }

  // Commission attribution — only on paid_in_full (final payment)
  if (paymentType === 'final' && project.referral_code) {
    try {
      const [affiliate] = await sql`
        SELECT id, commission_rate, email FROM affiliates
        WHERE referral_code = ${project.referral_code} AND status = 'active'
        LIMIT 1
      `;
      // SECURITY (audit F59): no commission on a self-referral (affiliate referring their
      // own project = a disguised self-discount paid to their own PayPal).
      if (affiliate && String(affiliate.email || '').toLowerCase() === String(project.client_email || '').toLowerCase()) {
        console.log('Skipping self-referral commission', { affiliateId: affiliate.id, projectId });
      } else if (affiliate) {
        // SECURITY (audit F59): base the commission on the SERVER-computed project price,
        // not the fabricated `amountCents * 2` (a partial/short capture would otherwise mint a
        // commission off a made-up total). expectedTotalCents was computed above from getEffectivePrice.
        const totalCents = expectedTotalCents;
        const commissionCents = Math.round(totalCents * affiliate.commission_rate / 100);
        // SECURITY (audit F81): one commission per project. The unique index on
        // referral_conversions(project_id) (migration 045) + ON CONFLICT makes an
        // admin status-reset + re-pay unable to double-credit. Only bump the affiliate's
        // running total when a NEW conversion row is actually inserted.
        const [conv] = await sql`
          INSERT INTO referral_conversions (affiliate_id, project_id, payment_id, commission_cents)
          VALUES (${affiliate.id}, ${projectId}, ${inserted.id}, ${commissionCents})
          ON CONFLICT (project_id) DO NOTHING
          RETURNING id
        `;
        if (conv) {
          await sql`
            UPDATE affiliates
            SET total_conversions = total_conversions + 1,
                total_earned_cents = total_earned_cents + ${commissionCents}
            WHERE id = ${affiliate.id}
          `;
          console.log('Affiliate commission recorded:', { affiliateId: affiliate.id, commissionCents });
        } else {
          console.log('Commission already credited for project (idempotent), skipping:', projectId);
        }
      }
    } catch (err) {
      console.error('Commission attribution failed (non-blocking):', err);
    }
  }

  // Send payment confirmation email to client
  const clientName = project.client_name || project.client_email.split('@')[0];
  const companyName = project.company_name || 'your project';
  sendPaymentConfirmationEmail({
    clientName,
    clientEmail: project.client_email,
    companyName,
    paymentType,
    amountCents,
    currency: capture.amount.currency_code,
  }).catch(err => console.error('Failed to send payment confirmation email:', err));

  // Log for notification purposes
  // SECURITY (audit F65): don't log client email to server logs.
  console.log('Payment received:', { type: paymentType, amountCents, projectId, newStatus });
}

// ── Refund / reversal / dispute handling (audit F58) ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCaptureIds(event: any): string[] {
  const ids = new Set<string>();
  const r = event?.resource || {};
  // Refund/reversal payloads link back to the parent capture (.../v2/payments/captures/<id>).
  if (Array.isArray(r.links)) {
    for (const l of r.links) {
      const m = typeof l?.href === 'string' ? l.href.match(/\/captures\/([A-Z0-9-]+)/i) : null;
      if (m) ids.add(m[1]);
    }
  }
  // Some payloads carry the related capture id directly.
  const captureId = r.supplementary_data?.related_ids?.capture_id;
  if (captureId) ids.add(captureId);
  // Disputes reference the capture via disputed_transactions[].seller_transaction_id.
  if (Array.isArray(r.disputed_transactions)) {
    for (const t of r.disputed_transactions) {
      if (t?.seller_transaction_id) ids.add(t.seller_transaction_id);
    }
  }
  return [...ids];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRefundOrReversal(event: any, kind: 'refund' | 'reversal' | 'dispute') {
  const captureIds = extractCaptureIds(event);
  const amountValue = event?.resource?.amount?.value;
  const amountCents = amountValue ? Math.round(parseFloat(amountValue) * 100) : null;

  // Idempotent ledger insert — process each refund/dispute event exactly once.
  const [recorded] = await sql`
    INSERT INTO payment_refunds (paypal_event_id, raw_capture_id, kind, amount_cents)
    VALUES (${event.id}, ${captureIds[0] ?? null}, ${kind}, ${amountCents})
    ON CONFLICT (paypal_event_id) DO NOTHING
    RETURNING id
  `;
  if (!recorded) {
    console.log('Refund/dispute already processed (idempotent), skipping:', event.id);
    return;
  }

  if (!captureIds.length) {
    console.error('Refund/dispute could not be mapped to a capture:', event.id);
    return;
  }

  // Find the original project payment this refund/dispute belongs to.
  const [orig] = await sql`
    SELECT project_id, type FROM payments
    WHERE paypal_capture_id = ANY(${captureIds}) AND type IN ('deposit', 'final')
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!orig) {
    console.error('No original project payment found for refund/dispute:', event.id);
    return;
  }

  const projectId = orig.project_id as string;
  await sql`UPDATE payment_refunds SET project_id = ${projectId} WHERE paypal_event_id = ${event.id}`;

  // Revert the project to a pre-paid state so chat/features re-lock until it's resolved.
  const revertTo = orig.type === 'final' ? 'deposit_paid' : 'proposal_sent';
  await sql`
    UPDATE projects SET status = ${revertTo}
    WHERE id = ${projectId} AND status IN ('deposit_paid', 'paid_in_full')
  `;

  // Void any commission for this project and claw back the affiliate's running total.
  const voided = await sql`
    UPDATE referral_conversions SET status = 'voided'
    WHERE project_id = ${projectId} AND status = 'active'
    RETURNING affiliate_id, commission_cents
  `;
  for (const v of voided) {
    await sql`
      UPDATE affiliates
      SET total_conversions = GREATEST(0, total_conversions - 1),
          total_earned_cents = GREATEST(0, total_earned_cents - ${v.commission_cents})
      WHERE id = ${v.affiliate_id}
    `;
  }

  // Flag for manual review in the project chat (no PII in server logs).
  await sql`
    INSERT INTO revision_messages (project_id, sender_type, message)
    VALUES (${projectId}, 'admin', ${`[System] A PayPal ${kind} was received for this project. Status was reverted to "${revertTo}" and any affiliate commission voided. Please review.`})
  `;
  console.log(`Refund/${kind} processed for project ${projectId} (reverted to ${revertTo})`);
}
