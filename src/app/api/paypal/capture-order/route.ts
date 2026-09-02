import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getServerUser } from "@/lib/auth-server";
import { amountDueCents } from "@/lib/project-payment";
import { capturePayPalOrderIdempotent, extractCapture } from "@/lib/paypal";
import type { PackageType, PackageCustomizations } from "@/lib/types";

// AUDIT 2026-08-12 (P2): this file carried its OWN copy of PAYPAL_API_BASE and
// getPayPalAccessToken, duplicating lib/paypal.ts — and the copy lacked the credential check and
// the request timeout the shared version has. Both capture paths now go through lib/paypal.ts, so
// a hardening fix there applies everywhere instead of to one of two copies.

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    // AUDIT 2026-08-12 (P2): validate the order id before putting it in an upstream URL path, and
    // reject junk without spending a PayPal round trip. PayPal order ids are short alphanumerics.
    if (typeof orderId !== 'string' || !/^[A-Z0-9-]{6,64}$/i.test(orderId.trim())) {
      return NextResponse.json({ error: 'A valid PayPal order id is required' }, { status: 400 });
    }

    // AUDIT 2026-08-12 (P2): a plain capture call 422s with ORDER_ALREADY_CAPTURED on the second
    // attempt, and this route returned that raw PayPal error to the browser — so a customer who
    // simply REFRESHED the success page, double-clicked, or had two tabs open was shown a red
    // "Payment Issue" for a payment that had in fact succeeded. The idempotent helper treats an
    // already-captured order as success and reads the existing capture back.
    let captured;
    try {
      captured = await capturePayPalOrderIdempotent(orderId.trim());
    } catch (err) {
      console.error('PayPal capture failed:', err);
      // AUDIT 2026-08-12 (P3): return OUR message, not PayPal's raw error object — the upstream
      // payload leaks internal detail and is meaningless to a buyer.
      return NextResponse.json(
        { error: 'We could not complete the payment with PayPal. Please try again or contact us.' },
        { status: 502 },
      );
    }
    const data = captured.order as Record<string, unknown>;

    // AUDIT 2026-08-12: use the shared extractor rather than hand-indexing the payload — it also
    // handles the read-back order shape the idempotent capture returns for an already-captured
    // order, where custom_id sits on the unit rather than the capture.
    const captureInfo = extractCapture(data);
    const customId = captureInfo?.custom_id;

    // AUDIT 2026-08-12 (P0-1): parse the metadata in its OWN try/catch. This block used to wrap
    // both JSON.parse AND every database write, with an empty catch that fell through to a
    // HTTP 200 carrying PayPal's raw capture body. A Postgres failure after the money was already
    // captured was therefore invisible: the client saw "payment successful", no payments row
    // existed, and the project never left proposal_sent. DB errors must be loud.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let meta: any = null;
    if (customId) {
      try {
        meta = JSON.parse(customId);
      } catch {
        meta = null; // not valid JSON — fall through to the default response
      }
    }

    if (meta) {
      {
        // AUDIT 2026-08-12: the template fulfilment branch is removed. Template checkout is
        // disabled (see api/paypal/create-template-order) because it could never take a payment
        // (custom_id exceeded PayPal's 127-char limit) and priced itself from a user-editable
        // ?plan= param that the capture-side check then validated against itself. Nothing can
        // legitimately produce a template order any more, so refuse rather than fulfil.
        if (meta.type === 'template') {
          console.error('Refusing a template capture — template checkout is disabled', { orderId });
          return NextResponse.json(
            { error: 'Template purchases are no longer available. Please contact us.' },
            { status: 410 },
          );
        }

        // Project payment (deposit or final). Hardened against the F30/F51 "flip any
        // project to paid for free" tamper: require the authenticated owner, a COMPLETED
        // capture, a server-validated amount, idempotency, and a legal status transition.
        if (meta.project_id && meta.payment_type) {
          if (!['deposit', 'final'].includes(meta.payment_type)) {
            return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
          }

          // Ownership: the caller must be the authenticated client who owns the project.
          const { user } = await getServerUser();
          const [project] = await sql`
            SELECT p.id, p.status, p.package, p.package_customizations, c.email AS client_email
            FROM projects p
            INNER JOIN clients c ON c.id = p.client_id
            WHERE p.id = ${meta.project_id}
            LIMIT 1
          `;
          if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
          }
          if (!user?.email || user.email.toLowerCase() !== String(project.client_email).toLowerCase()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
          }
          if (captureInfo?.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
          }

          // Validate the captured amount against the server-computed amount due.
          // AUDIT 2026-08-12 (P0-6): this used to be `total / 2` for BOTH payment types, matching
          // the same bug in order creation — so a shrunken final invoice validated against itself.
          // amountDueCents() is now the single source of truth for both sides.
          const { dueCents: expectedCents } = await amountDueCents(
            project.id as string,
            project.package as PackageType,
            (project.package_customizations as PackageCustomizations | null) ?? null,
            meta.payment_type as 'deposit' | 'final',
          );
          // AUDIT 2026-08-12 (P3): the amount comparison was currency-BLIND. The captured currency
          // was stored but never checked, so a capture denominated in a weaker currency could
          // satisfy a USD-denominated expectation numerically. Prices are USD; reject anything else.
          const capturedCurrency = String(captureInfo?.amount?.currency_code || '').toUpperCase();
          if (capturedCurrency !== 'USD') {
            console.error('Project capture currency mismatch', { projectId: project.id, capturedCurrency });
            return NextResponse.json({ error: 'Unexpected payment currency.' }, { status: 409 });
          }

          const capturedCents = Math.round(parseFloat(captureInfo?.amount?.value || '0') * 100);
          if (capturedCents < expectedCents) {
            console.error('Project capture amount mismatch', { projectId: project.id, capturedCents, expectedCents });
            return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
          }

          // SECURITY (audit F51): the INSERT with ON CONFLICT (paypal_capture_id) is the atomic
          // idempotency gate — race-safe against the signature-verified webhook (the authoritative
          // status source) and PayPal retries. If no row is returned, this capture was already
          // recorded, so we don't flip status again.
          const captureId = captureInfo?.id || String(data.id ?? '');
          const currency = (captureInfo?.amount?.currency_code || 'USD').toLowerCase();
          const [inserted] = await sql`
            INSERT INTO payments (project_id, type, amount_cents, currency, paypal_payment_status, paypal_capture_id)
            VALUES (${project.id}, ${meta.payment_type}, ${capturedCents}, ${currency}, ${captureInfo?.status || 'COMPLETED'}, ${captureId})
            ON CONFLICT (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL DO NOTHING
            RETURNING id
          `;
          if (inserted) {
            const newStatus = meta.payment_type === 'deposit' ? 'deposit_paid' : 'paid_in_full';
            // SECURITY (audit F60): a deposit only advances from a real proposal ('proposal_sent').
            const allowedFrom = meta.payment_type === 'deposit'
              ? ['proposal_sent']
              : ['ready_for_final_payment', 'in_production', 'deposit_paid'];
            await sql`
              UPDATE projects SET status = ${newStatus}
              WHERE id = ${project.id} AND status = ANY(${allowedFrom})
            `;
            console.log(`Project ${project.id} payment recorded (${meta.payment_type})`);
          }

          return NextResponse.json({ ...data, success: true });
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    // AUDIT 2026-08-12 (P0-1): if we reach here the capture may ALREADY have succeeded at PayPal
    // (the capture call is the first thing this route does), so a failure here means money moved
    // but was not recorded. Surface it explicitly instead of returning a cheerful 200 — the
    // client must not be told "payment successful" when we have no payments row.
    console.error('CRITICAL: PayPal capture route failed after capture may have succeeded:', error);
    return NextResponse.json(
      {
        error: 'Your payment may have been received but we could not finish recording it. Please contact us before paying again.',
        capturedButNotRecorded: true,
      },
      { status: 500 },
    );
  }
}
