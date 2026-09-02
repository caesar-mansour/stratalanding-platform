// Referral code persistence — 90-day localStorage tracking
// Stores affiliate referral codes from ?ref=CODE URL params

const STORAGE_KEY = 'strata_ref';
const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface StoredReferral {
  code: string;
  expires: number;
}

export function persistReferral(code: string): void {
  if (typeof window === 'undefined') return;
  if (!code || typeof code !== 'string') return;

  // Sanitize: alphanumeric + hyphens only, max 20 chars
  const sanitized = code.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20).toUpperCase();
  if (!sanitized) return;

  const entry: StoredReferral = {
    code: sanitized,
    expires: Date.now() + EXPIRY_MS,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function getPersistedReferral(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const entry: StoredReferral = JSON.parse(raw);
    if (!entry.code || !entry.expires) return null;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return entry.code;
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
