import { NextRequest, NextResponse } from 'next/server';
import { verifySignedUrl, decideOverride } from '@/lib/price-override';

function htmlResponse(title: string, message: string, success: boolean) {
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0B1120; color: #F8FAFC;">
      <div style="text-align: center; max-width: 480px; padding: 40px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: ${success ? '#059669' : '#DC2626'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
          <span style="font-size: 28px;">${success ? '&#10003;' : '&#10007;'}</span>
        </div>
        <h1 style="font-size: 24px; margin: 0 0 12px;">${title}</h1>
        <p style="color: #94A3B8; font-size: 16px; line-height: 1.6;">${message}</p>
      </div>
    </body>
    </html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}

function readParams(request: NextRequest) {
  return {
    id: request.nextUrl.searchParams.get('id') || '',
    action: request.nextUrl.searchParams.get('action') || '',
    ts: request.nextUrl.searchParams.get('ts') || '',
    sig: request.nextUrl.searchParams.get('sig') || '',
  };
}

// GET — RENDER A CONFIRMATION PAGE ONLY (audit L-price-decide). A GET that mutates can be fired by
// email link-prefetchers / mailbox security scanners (Outlook SafeLinks, etc.), silently deciding a
// price override with no human click. The actual approve/reject happens on the POST below, which a
// scanner won't issue. The signed URL (HMAC + 72h expiry + amount-binding) is still the auth.
export async function GET(request: NextRequest) {
  const { id, action, ts, sig } = readParams(request);

  if (!id || !['approve', 'reject'].includes(action) || !ts || !sig) {
    return htmlResponse('Invalid Link', 'This link is invalid or missing parameters.', false);
  }

  if (!(await verifySignedUrl(id, action, ts, sig))) {
    return htmlResponse('Link Expired', 'This link has expired or is invalid. Please use the admin panel to approve/reject.', false);
  }

  // Reconstruct the (already-validated) params as a URL-encoded query for the form action, so
  // nothing attacker-controlled is reflected into HTML unescaped. `action` is whitelisted above.
  const qs = new URLSearchParams({ id, action, ts, sig }).toString();
  const label = action === 'approve' ? 'Approve' : 'Reject';
  const color = action === 'approve' ? '#059669' : '#DC2626';

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm ${label}</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0B1120; color: #F8FAFC;">
      <div style="text-align: center; max-width: 480px; padding: 40px;">
        <h1 style="font-size: 24px; margin: 0 0 12px;">Confirm: ${label} price override</h1>
        <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin-bottom: 28px;">Click below to ${action} this price override. This link can only be used once.</p>
        <form method="POST" action="?${qs}">
          <button type="submit" style="background: ${color}; color: #fff; border: 0; border-radius: 10px; padding: 14px 28px; font-size: 16px; font-weight: 600; cursor: pointer;">${label}</button>
        </form>
      </div>
    </body>
    </html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}

// POST — perform the decision. Triggered by the confirmation button, never by a link prefetch.
export async function POST(request: NextRequest) {
  const { id, action, ts, sig } = readParams(request);

  if (!id || !['approve', 'reject'].includes(action) || !ts || !sig) {
    return htmlResponse('Invalid Link', 'This link is invalid or missing parameters.', false);
  }

  if (!(await verifySignedUrl(id, action, ts, sig))) {
    return htmlResponse('Link Expired', 'This link has expired or is invalid. Please use the admin panel to approve/reject.', false);
  }

  const dbAction = action === 'approve' ? 'approved' : 'rejected';
  const success = await decideOverride(id, dbAction, 'ceo-email');

  if (!success) {
    return htmlResponse('Already Decided', 'This price override has already been approved or rejected.', false);
  }

  const title = action === 'approve' ? 'Price Override Approved' : 'Price Override Rejected';
  const message = action === 'approve'
    ? 'The custom price is now active. The client will be charged the new amount.'
    : 'The price override has been rejected. Standard pricing will apply.';

  return htmlResponse(title, message, true);
}
