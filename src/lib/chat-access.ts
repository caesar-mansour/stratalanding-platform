// Single source of truth for whether a project's client chat is unlocked.
// Superset of the original paid-status list: also unlocks approved phone-outreach leads
// (source='phone' + preview_approved_at) BEFORE any deposit, so they can chat immediately.
// Pure function — every existing status unlocks exactly as before.

const PAID_UNLOCKED = ['deposit_paid', 'in_production', 'ready_for_final_payment', 'paid_in_full', 'launched'];

export function isChatUnlocked(
  project: { status?: string | null; source?: string | null; preview_approved_at?: string | null } | null | undefined
): boolean {
  if (!project) return false;
  if (project.status && PAID_UNLOCKED.includes(project.status)) return true;
  return project.source === 'phone' && !!project.preview_approved_at;
}
