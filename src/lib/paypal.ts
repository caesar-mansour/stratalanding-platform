import { packagePricing, calculateTotalCents, type PackageType, type PackageCustomizations } from '@/lib/types';

// PayPal API configuration
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * AUDIT 2026-08-12 (P2): none of the PayPal calls had a timeout. A slow or hanging upstream would
 * occupy the Netlify lambda until the platform killed it, turning a PayPal degradation into a
 * hard failure with no useful error — on the money path. AbortSignal.timeout gives a bounded,
 * catchable failure instead.
 */
const PAYPAL_TIMEOUT_MS = 15_000;

// Get PayPal access token for API calls
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Verify PayPal webhook signature
export async function verifyPayPalWebhook(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal webhook verification error:', error);
    return false;
  }
}

// Create a PayPal order (for programmatic checkout)
export async function createPayPalOrder({
  projectId,
  packageType,
  paymentType,
  customPriceCents,
  exactAmountCents,
  returnUrl,
  cancelUrl,
}: {
  projectId: string;
  packageType: PackageType;
  paymentType: 'deposit' | 'final';
  customPriceCents?: number;
  /**
   * Charge exactly this many cents instead of half the total.
   *
   * AUDIT 2026-08-12 (P0-6): the `total / 2` default is only correct for a deposit. The BALANCE is
   * `total − deposits already paid`; halving a recomputed total let a client shrink their final
   * invoice by editing add-ons after paying. Callers that know the real figure pass it here.
   */
  exactAmountCents?: number;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const totalPriceCents = customPriceCents ?? packagePricing[packageType];
  const amountCents = exactAmountCents ?? Math.round(totalPriceCents / 2);
  const amountDollars = (amountCents / 100).toFixed(2);

  const paymentLabel = paymentType === 'deposit'
    ? 'Project Deposit (50%)'
    : 'Final Payment (50%)';

  const packageLabel = packageType.charAt(0).toUpperCase() + packageType.slice(1);

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: projectId,
        description: `StrataLanding ${packageLabel} Package - ${paymentLabel}`,
        custom_id: JSON.stringify({ project_id: projectId, payment_type: paymentType, package: packageType }),
        amount: {
          currency_code: 'USD',
          value: amountDollars,
        },
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'StrataLanding',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create PayPal order: ${JSON.stringify(error)}`);
  }

  return await response.json();
}



// Capture a PayPal order (after customer approves)
export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to capture PayPal order: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

// Read an order back from PayPal without mutating it.
export async function getPayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to read PayPal order: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

/**
 * Capture an order, treating "already captured" as success rather than as an error.
 *
 * AUDIT 2026-08-12 (P0 adversarial cases: refresh / double-click / multiple tabs / replayed
 * request): PayPal 422s with issue ORDER_ALREADY_CAPTURED on the second capture attempt. That is
 * not a failure — the money moved on the first attempt — so we read the order back and return the
 * existing capture. The caller's DB write is separately idempotent via ON CONFLICT, so the pair
 * makes the whole path safe to retry from any of those states.
 */
export async function capturePayPalOrderIdempotent(
  orderId: string,
): Promise<{ order: Record<string, unknown>; alreadyCaptured: boolean }> {
  try {
    const order = await capturePayPalOrder(orderId);
    return { order, alreadyCaptured: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('ORDER_ALREADY_CAPTURED')) throw err;
    const order = await getPayPalOrder(orderId);
    return { order, alreadyCaptured: true };
  }
}

/**
 * Pull the single capture out of a captured-order payload, from either the capture response shape
 * or the read-back order shape.
 */
export function extractCapture(order: Record<string, unknown>): {
  id?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string };
  custom_id?: string;
} | null {
  const units = (order as { purchase_units?: Array<Record<string, unknown>> }).purchase_units;
  const unit = units?.[0];
  if (!unit) return null;
  const payments = unit.payments as { captures?: Array<Record<string, unknown>> } | undefined;
  const capture = payments?.captures?.[0];
  if (capture) {
    return {
      ...(capture as Record<string, unknown>),
      // The read-back order carries custom_id on the unit, not always on the capture.
      custom_id: (capture.custom_id as string) ?? (unit.custom_id as string),
    } as ReturnType<typeof extractCapture>;
  }
  return null;
}

// Get payment amounts for display (includes customizations if provided)
export function getPaymentAmounts(packageType: PackageType, customizations?: PackageCustomizations | null, overrideCents?: number | null) {
  const total = overrideCents ?? (customizations ? calculateTotalCents(packageType, customizations) : packagePricing[packageType]);
  const deposit = Math.round(total / 2);
  const final_ = total - deposit;

  return {
    total: total / 100,
    deposit: deposit / 100,
    final: final_ / 100,
    totalFormatted: `$${(total / 100).toLocaleString()}`,
    depositFormatted: `$${(deposit / 100).toLocaleString()}`,
    finalFormatted: `$${(final_ / 100).toLocaleString()}`,
  };
}
