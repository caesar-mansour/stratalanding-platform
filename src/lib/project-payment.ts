import sql from '@/lib/db';
import { getEffectivePrice } from '@/lib/price-override';
import type { PackageType, PackageCustomizations } from '@/lib/types';

/**
 * How much is actually owed for a project payment, in cents.
 *
 * AUDIT 2026-08-12 (P0-6). `createPayPalOrder` charges `total / 2` for BOTH payment types, and the
 * capture-side check validated against that same halved figure. Because the total is recomputed
 * from the project's CURRENT customizations, a client who removed a paid-for add-on after the
 * deposit had their final invoice drop by half the add-on's price — money that was never billed.
 * (Adding one over-collected by the same mechanism.)
 *
 * The balance is therefore `total − deposits already recorded`, not `total / 2`. Order creation
 * and capture validation both call this, so the amount charged and the amount accepted cannot
 * diverge.
 */
export async function amountDueCents(
  projectId: string,
  packageType: PackageType,
  customizations: PackageCustomizations | null,
  paymentType: 'deposit' | 'final',
): Promise<{ dueCents: number; totalCents: number; depositPaidCents: number }> {
  const totalCents = await getEffectivePrice(projectId, packageType, customizations);

  if (paymentType === 'deposit') {
    return { dueCents: Math.round(totalCents / 2), totalCents, depositPaidCents: 0 };
  }

  const [row] = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS paid
    FROM payments
    WHERE project_id = ${projectId} AND type = 'deposit'
  `;
  const depositPaidCents = Number(row?.paid ?? 0);

  return {
    dueCents: Math.max(0, totalCents - depositPaidCents),
    totalCents,
    depositPaidCents,
  };
}
