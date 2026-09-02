// Client-side auth helpers ONLY
// Server-side helpers are in auth-server.ts

export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const res = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, redirectTo }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function signOut() {
  const res = await fetch('/api/auth/signout', { method: 'POST' });
  if (!res.ok) {
    const data = await res.json();
    return { error: { message: data.error } };
  }
  return { error: null };
}

export async function getUser() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.authenticated) return { user: null, error: null };
  return { user: data.user, error: null };
}

// ============================================
// Password Authentication
// ============================================

export async function signUpWithPassword(email: string, password: string, name?: string) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function signInWithPassword(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function resetPassword(email: string) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function updatePassword(token: string, newPassword: string) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

// ============================================
// Multi-Factor Authentication (MFA)
// ============================================

export async function enrollMFA() {
  const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
  const json = await res.json();
  if (!res.ok) return { data: null, error: { message: json.error } };
  return { data: json.data, error: null };
}

// challengeMFA is kept for compatibility but our TOTP doesn't need a challenge/response step
export async function challengeMFA(factorId: string): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  return { data: { id: factorId }, error: null };
}

export async function verifyMFA(factorId: string, _challengeId: string, code: string) {
  // _challengeId is ignored in our custom system (kept for API compatibility)
  // Determine action: if on 2FA page it's login, otherwise it's setup
  const action = window.location.pathname === '/auth/verify-2fa' ? 'login' : 'setup';

  const res = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factorId, code, action }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function unenrollMFA(factorId: string) {
  // To unenroll, we verify a code with action 'disable'
  // This needs to be called with a code, so we use the verify endpoint
  // The UI should prompt for a code before calling this
  const res = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factorId, code: '', action: 'disable' }),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

export async function getMFAFactors() {
  const res = await fetch('/api/auth/mfa/factors');
  const json = await res.json();
  if (!res.ok) return { factors: [], all: [], error: { message: json.error } };
  return {
    factors: json.factors || [],
    all: json.factors || [],
    error: null,
  };
}

export async function getAAL() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();

  if (!data.authenticated) {
    return {
      currentLevel: null,
      nextLevel: null,
      currentAuthenticationMethods: [],
      error: null,
    };
  }

  return {
    currentLevel: data.user.aal || 'aal1',
    nextLevel: data.user.hasMfa ? 'aal2' : 'aal1',
    currentAuthenticationMethods: [],
    error: null,
  };
}
