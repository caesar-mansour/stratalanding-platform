import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { constantTimeEqual } from '@/lib/security/sanitize';

// Cache verification for 2 minutes to avoid hitting DB on every navigation
const VERIFICATION_CACHE_SECONDS = 120;

// AUDIT 2026-08-12 (P3): was `process.env.AUTH_SECRET!`. The non-null assertion silences the
// compiler but not reality — if the var were ever missing, TextEncoder would encode the string
// "undefined" and every JWT would be signed/verified with a guessable key. validate-env already
// refuses to boot production without it, so this is defence in depth, but fail loudly rather than
// silently degrade to a known key.
function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('[SECURITY] AUTH_SECRET is not set — refusing to derive a signing key.');
  return s;
}

const getSecret = () => new TextEncoder().encode(authSecret());

// SECURITY (audit F20): the portal_verified fast-path cookie is now HMAC-signed so it can't be
// FORGED to skip the JWT re-check for 120s. Edge runtime can't use Node crypto, so we use the
// Web Crypto API (global `crypto.subtle`).
async function hmacHex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(authSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  let hex = '';
  for (const b of new Uint8Array(sigBuf)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function updateSession(request: NextRequest) {
  // FAST PATH: Check cache BEFORE doing anything expensive
  // For portal routes, skip all checks if recently verified — but ONLY if the cookie's signature
  // is valid (a forged timestamp can no longer buy 120s of access).
  const isPortalRoute = request.nextUrl.pathname.startsWith('/portal') || request.nextUrl.pathname.startsWith('/partner-portal');
  if (isPortalRoute) {
    const cookie = request.cookies.get('portal_verified')?.value;
    if (cookie && cookie.includes('.')) {
      const dot = cookie.lastIndexOf('.');
      const tsStr = cookie.slice(0, dot);
      const sig = cookie.slice(dot + 1);
      const verifiedTime = parseInt(tsStr, 10);
      if (!isNaN(verifiedTime) && Date.now() - verifiedTime < VERIFICATION_CACHE_SECONDS * 1000) {
        if (constantTimeEqual(sig, await hmacHex(tsStr))) {
          return NextResponse.next({ request });
        }
      }
    }
  }

  // Admin routes — cheap PRESENCE check at the Edge; the authoritative check is verifyAdmin().
  //
  // AUDIT 2026-08-12 (P1 A-01): this used to compare the cookie to ADMIN_ACCESS_TOKEN directly,
  // which worked only because the cookie WAS that secret. Now that admin sessions are real
  // revocable rows, the cookie is a random session token that will never equal the env var — so
  // this comparison rejected every valid login and produced a redirect loop.
  //
  // The Edge runtime cannot reach Postgres, so it cannot validate a session here. It checks only
  // that a plausibly-shaped cookie exists, which preserves the "send anonymous visitors to the
  // login screen" behaviour. Every admin PAGE calls requireAdminPage() -> verifyAdmin() and every
  // admin API calls verifyAdmin(), both of which validate against the session row (existence,
  // revocation, expiry) and apply the IP allowlist. Authorization is strictly stronger than
  // before; only the Edge pre-filter is weaker, and it was never the gate.
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken || adminToken.length < 32) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Admin API backstop (audit L-mw-admin-api): every /api/admin/* route already calls
  // verifyAdmin(), but guard state-changing (non-GET) admin APIs here too so a FUTURE route that
  // forgets it still can't run without a valid admin cookie. GET is left to the route (some, e.g.
  // /api/admin/status, are intentionally public); the login and signed-URL decide routes
  // authenticate differently and are excluded. Returns 401 JSON (not a redirect) for API clients.
  {
    const p = request.nextUrl.pathname;
    const method = request.method.toUpperCase();
    if (
      p.startsWith('/api/admin') &&
      method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' &&
      p !== '/api/admin/auth' &&
      !p.startsWith('/api/admin/price-overrides/decide')
    ) {
      // Same reasoning as the /admin block above: presence only at the Edge, because the
      // authoritative session lookup needs Postgres. Each route still calls verifyAdmin().
      const adminToken = request.cookies.get('admin_token')?.value;
      if (!adminToken || adminToken.length < 32) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // For portal routes and 2FA verification - verify JWT
  if (isPortalRoute || request.nextUrl.pathname === '/auth/verify-2fa') {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Verify JWT (Edge-compatible with jose)
    let payload;
    try {
      const { payload: p } = await jwtVerify(sessionToken, getSecret(), { algorithms: ['HS256'] });
      payload = p;
    } catch {
      // Invalid or expired JWT
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_token');
      response.cookies.delete('portal_verified');
      return response;
    }

    // For 2FA verification page, just check user is authenticated
    if (request.nextUrl.pathname === '/auth/verify-2fa') {
      return NextResponse.next({ request });
    }

    // Check if MFA is required but not yet verified
    if (payload.has_mfa && payload.aal === 'aal1') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/verify-2fa';
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Set the verification cache cookie — SIGNED so it can't be forged (audit F20).
    // (The old unsigned `portal_user_email` cookie was removed: it was never read for
    // authorization — getServerUser derives identity from the verified JWT — so it was pure
    // attack surface.)
    const now = Date.now();
    const response = NextResponse.next({ request });
    const signed = `${now}.${await hmacHex(now.toString())}`;
    response.cookies.set('portal_verified', signed, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: VERIFICATION_CACHE_SECONDS,
      httpOnly: true,
    });

    return response;
  }

  return NextResponse.next({ request });
}
