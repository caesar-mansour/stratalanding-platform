import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyDepositCapture, proposalDepositCents } from '@/lib/proposal-payment';
import { extractCapture, capturePayPalOrderIdempotent } from '@/lib/paypal';

/**
 * Regression tests for AUDIT 2026-08-12 P0-1 … P0-6.
 *
 * THE INVARIANT UNDER TEST:
 *   No transition to proposal `accepted`, `deposit_paid`, or paid portal access may occur without
 *   a PayPal-verified COMPLETED capture of the correct amount and currency, bound to the right
 *   project.
 *
 * Before the fix, the redirect flow never captured at all and `/proposal/[id]/success` granted all
 * of the above on a plain unauthenticated GET. These cases are the ones that must never regress.
 */

const PROJECT = 'a1b2c3d4-1111-2222-3333-444455556666';
const OTHER_PROJECT = 'ffffffff-9999-8888-7777-666655554444';

function capture(over: Record<string, unknown> = {}) {
  return {
    id: 'CAP-123456',
    status: 'COMPLETED',
    amount: { currency_code: 'USD', value: '1200.00' },
    custom_id: JSON.stringify({ project_id: PROJECT, payment_type: 'deposit' }),
    ...over,
  };
}

const expected = { projectId: PROJECT, expectedCents: 120000, fallbackCaptureId: 'ORDER-1' };

describe('deposit amount is server-derived (single source of truth)', () => {
  it('halves the package price', () => {
    expect(proposalDepositCents({ custom_price_cents: null, package: 'starter' } as never)).toBe(120000);
    expect(proposalDepositCents({ custom_price_cents: null, package: 'growth' } as never)).toBe(240000);
    expect(proposalDepositCents({ custom_price_cents: null, package: 'scale' } as never)).toBe(480000);
  });

  it('honours a custom proposal price over the package default', () => {
    expect(proposalDepositCents({ custom_price_cents: 500000, package: 'starter' } as never)).toBe(250000);
  });
});

describe('verifyDepositCapture — the gate that guards every state change', () => {
  it('accepts a genuine completed capture of the right amount', () => {
    const v = verifyDepositCapture(capture(), expected);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.capturedCents).toBe(120000);
      expect(v.captureId).toBe('CAP-123456');
    }
  });

  // P0-4/P0-5: a crawler, prefetch or SafeLinks scan reaching the return URL with no real payment.
  it('rejects when there is no capture at all (direct URL access / crawler)', () => {
    const v = verifyDepositCapture(null, expected);
    expect(v).toMatchObject({ ok: false, reason: 'not-completed' });
  });

  it('rejects a cancelled or pending order', () => {
    for (const status of ['CREATED', 'APPROVED', 'PENDING', 'VOIDED', 'DECLINED']) {
      expect(verifyDepositCapture(capture({ status }), expected)).toMatchObject({
        ok: false,
        reason: 'not-completed',
      });
    }
  });

  it('rejects a capture bound to a DIFFERENT project (order swapping)', () => {
    const v = verifyDepositCapture(
      capture({ custom_id: JSON.stringify({ project_id: OTHER_PROJECT, payment_type: 'deposit' }) }),
      expected,
    );
    expect(v).toMatchObject({ ok: false, reason: 'wrong-project' });
  });

  it('rejects a FINAL-payment order redeemed against a deposit', () => {
    const v = verifyDepositCapture(
      capture({ custom_id: JSON.stringify({ project_id: PROJECT, payment_type: 'final' }) }),
      expected,
    );
    expect(v).toMatchObject({ ok: false, reason: 'wrong-type' });
  });

  it('rejects missing or malformed custom_id rather than defaulting to allow', () => {
    expect(verifyDepositCapture(capture({ custom_id: undefined }), expected)).toMatchObject({ ok: false });
    expect(verifyDepositCapture(capture({ custom_id: 'not json' }), expected)).toMatchObject({ ok: false });
    expect(verifyDepositCapture(capture({ custom_id: '{}' }), expected)).toMatchObject({ ok: false });
  });

  it('rejects a non-USD capture (currency swap)', () => {
    const v = verifyDepositCapture(
      capture({ amount: { currency_code: 'MXN', value: '1200.00' } }),
      expected,
    );
    expect(v).toMatchObject({ ok: false, reason: 'wrong-currency' });
  });

  it('rejects a short payment — the "pay $1 for a $2,400 package" case', () => {
    const v = verifyDepositCapture(capture({ amount: { currency_code: 'USD', value: '1.00' } }), expected);
    expect(v).toMatchObject({ ok: false, reason: 'short-amount' });
  });

  it('rejects a zero/absent amount', () => {
    // An absent amount trips the currency check first (no currency_code to read); a present-but-zero
    // amount trips the amount check. Either way it must not pass — that is what matters here.
    expect(verifyDepositCapture(capture({ amount: undefined }), expected).ok).toBe(false);
    expect(verifyDepositCapture(capture({ amount: { currency_code: 'USD', value: '0' } }), expected)).toMatchObject({
      ok: false,
      reason: 'short-amount',
    });
  });

  it('accepts an overpayment (never punishes the customer for paying more)', () => {
    expect(verifyDepositCapture(capture({ amount: { currency_code: 'USD', value: '1500.00' } }), expected).ok).toBe(true);
  });

  it('refuses to verify against a zero expected price (misconfiguration must not auto-pass)', () => {
    const v = verifyDepositCapture(capture(), { ...expected, expectedCents: 0 });
    expect(v).toMatchObject({ ok: false, reason: 'short-amount' });
  });

  it('falls back to the order id when PayPal omits a capture id', () => {
    const v = verifyDepositCapture(capture({ id: undefined }), expected);
    expect(v.ok && v.captureId).toBe('ORDER-1');
  });
});

describe('extractCapture — reads both PayPal payload shapes', () => {
  it('reads the capture response shape', () => {
    const c = extractCapture({
      purchase_units: [{ payments: { captures: [{ id: 'C1', status: 'COMPLETED', custom_id: 'x' }] } }],
    });
    expect(c).toMatchObject({ id: 'C1', status: 'COMPLETED' });
  });

  it('falls back to the unit-level custom_id on a read-back order', () => {
    const c = extractCapture({
      purchase_units: [{ custom_id: 'from-unit', payments: { captures: [{ id: 'C1', status: 'COMPLETED' }] } }],
    });
    expect(c?.custom_id).toBe('from-unit');
  });

  it('returns null when there is no capture (order approved but never captured)', () => {
    expect(extractCapture({ purchase_units: [{}] })).toBeNull();
    expect(extractCapture({})).toBeNull();
  });
});

describe('capturePayPalOrderIdempotent — refresh / double-click / multi-tab / replay', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = 'id';
    process.env.PAYPAL_CLIENT_SECRET = 'secret';
  });
  afterEach(() => {
    process.env = { ...OLD };
    vi.restoreAllMocks();
  });

  function mockFetch(handler: (url: string, init?: RequestInit) => { ok: boolean; body: unknown }) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/oauth2/token')) {
        return { ok: true, json: async () => ({ access_token: 'tok' }) } as unknown as Response;
      }
      const r = handler(String(url), init);
      return { ok: r.ok, json: async () => r.body } as unknown as Response;
    }));
  }

  it('returns the capture on a first successful capture', async () => {
    mockFetch(() => ({ ok: true, body: { id: 'O1', purchase_units: [{ payments: { captures: [capture()] } }] } }));
    const res = await capturePayPalOrderIdempotent('O1');
    expect(res.alreadyCaptured).toBe(false);
    expect(extractCapture(res.order)?.id).toBe('CAP-123456');
  });

  // The critical one: a second capture attempt must NOT surface as a payment failure to a customer
  // who has already paid. PayPal 422s with ORDER_ALREADY_CAPTURED; we read the order back instead.
  it('treats ORDER_ALREADY_CAPTURED as success and reads the existing capture back', async () => {
    mockFetch((url, init) => {
      if (init?.method === 'POST') {
        return { ok: false, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } };
      }
      return { ok: true, body: { id: 'O1', purchase_units: [{ payments: { captures: [capture()] } }] } };
    });

    const res = await capturePayPalOrderIdempotent('O1');
    expect(res.alreadyCaptured).toBe(true);
    expect(extractCapture(res.order)?.status).toBe('COMPLETED');
  });

  it('still throws on a genuine capture failure (declined instrument)', async () => {
    mockFetch(() => ({ ok: false, body: { details: [{ issue: 'INSTRUMENT_DECLINED' }] } }));
    await expect(capturePayPalOrderIdempotent('O1')).rejects.toThrow(/INSTRUMENT_DECLINED/);
  });
});
