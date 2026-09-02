import { createHmac, timingSafeEqual } from 'crypto';
import sql from './db';
import { calculateTotalCents, type PackageType, type PackageCustomizations } from './types';
import { sendPriceOverrideApprovalEmail } from './email';
import { priceOverrideKey } from './security/keys';

const CEO_EMAIL = () => process.env.CEO_EMAIL || '';

// Get the latest approved override for a project (cents), or null
export async function getApprovedOverride(projectId: string): Promise<number | null> {
  const [row] = await sql`
    SELECT override_cents FROM price_overrides
    WHERE project_id = ${projectId} AND status = 'approved'
    ORDER BY created_at DESC LIMIT 1
  `;
  return row ? row.override_cents : null;
}

// Get effective price: approved override or standard calculation
export async function getEffectivePrice(
  projectId: string,
  packageType: PackageType,
  customizations: PackageCustomizations | null,
): Promise<number> {
  const override = await getApprovedOverride(projectId);
  return override ?? calculateTotalCents(packageType, customizations);
}

// Create a price override request
export async function createOverrideRequest(
  projectId: string,
  requestedBy: string,
  overrideCents: number,
  reason: string | null,
  projectName: string,
  clientName: string,
  packageType: PackageType,
  customizations: PackageCustomizations | null,
): Promise<{ id: string; autoApproved: boolean }> {
  const originalCents = calculateTotalCents(packageType, customizations);
  const isCeo = requestedBy.toLowerCase() === CEO_EMAIL().toLowerCase();

  const status = isCeo ? 'approved' : 'pending';
  const decidedBy = isCeo ? requestedBy : null;
  const decidedAt = isCeo ? new Date().toISOString() : null;

  const [row] = await sql`
    INSERT INTO price_overrides (project_id, requested_by, original_cents, override_cents, reason, status, decided_by, decided_at)
    VALUES (${projectId}, ${requestedBy}, ${originalCents}, ${overrideCents}, ${reason}, ${status}, ${decidedBy}, ${decidedAt})
    RETURNING id
  `;

  if (!isCeo) {
    // Send approval email to CEO
    await sendPriceOverrideApprovalEmail({
      overrideId: row.id,
      projectName,
      clientName,
      packageType,
      originalCents,
      overrideCents,
      reason: reason || 'No reason provided',
      requestedBy,
    }).catch(err => console.error('Failed to send price override email:', err));
  }

  return { id: row.id, autoApproved: isCeo };
}

// Approve or reject an override
export async function decideOverride(
  overrideId: string,
  action: 'approved' | 'rejected',
  decidedBy: string,
): Promise<boolean> {
  const [row] = await sql`
    UPDATE price_overrides
    SET status = ${action}, decided_by = ${decidedBy}, decided_at = NOW()
    WHERE id = ${overrideId} AND status = 'pending'
    RETURNING id, project_id
  `;

  if (!row) return false;

  // If approved, auto-reject other pending overrides for the same project
  if (action === 'approved') {
    await sql`
      UPDATE price_overrides
      SET status = 'rejected', decided_by = 'auto', decided_at = NOW()
      WHERE project_id = ${row.project_id} AND status = 'pending' AND id != ${overrideId}
    `;
  }

  return true;
}

// Generate HMAC-signed URL for email approve/reject links.
// SECURITY (audit F12): use the dedicated PRICE_OVERRIDE_HMAC_KEY (never a guessable 'fallback'
// literal). SECURITY (audit F84): BIND the override amount into the signature so a still-valid
// link can't approve a DIFFERENT amount if the row is later mutated (e.g. tampered to $1).
export function generateSignedUrl(overrideId: string, action: 'approve' | 'reject', overrideCents: number): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ts = Date.now().toString();
  const sig = createHmac('sha256', priceOverrideKey())
    .update(`${overrideId}:${action}:${overrideCents}:${ts}`)
    .digest('hex');

  return `${siteUrl}/api/admin/price-overrides/decide?id=${overrideId}&action=${action}&ts=${ts}&sig=${sig}`;
}

// Verify a signed URL. Re-reads the CURRENT override amount from the DB and requires it to match
// what was signed (audit F84) — a link signed for $X won't approve a row that now says $Y.
export async function verifySignedUrl(overrideId: string, action: string, ts: string, sig: string): Promise<boolean> {
  // Check 72-hour expiry
  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 72 * 60 * 60 * 1000) return false;

  const [row] = await sql`SELECT override_cents FROM price_overrides WHERE id = ${overrideId} LIMIT 1`;
  if (!row) return false;

  const expected = createHmac('sha256', priceOverrideKey())
    .update(`${overrideId}:${action}:${row.override_cents}:${ts}`)
    .digest('hex');

  // Timing-safe comparison
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
