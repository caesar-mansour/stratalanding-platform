import { NextResponse } from 'next/server';
import { addSuppression } from '@/lib/suppressions';
import { unsubSig } from '@/lib/outreach/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PageState = 'form' | 'success' | 'error';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function renderPage(opts: {
  state: PageState;
  email?: string;
  token?: string;
  headline: string;
  subtitle: string;
}): string {
  const { state, email = '', token = '', headline, subtitle } = opts;
  const safeEmail = esc(email);
  const safeToken = esc(token);

  const form = state === 'form' ? `
    <form method="POST" action="/unsubscribe" class="form" novalidate>
      <input type="hidden" name="token" value="${safeToken}">
      <label class="field">
        <span class="label">Email address</span>
        <input type="email" name="email" required autocomplete="email" placeholder="you@example.com" value="${safeEmail}" spellcheck="false">
      </label>
      <button type="submit" class="btn">
        <span>Unsubscribe</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
          <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
        </svg>
      </button>
    </form>
  ` : '';

  const successBlock = state === 'success' ? `
    <div class="chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
        <path d="M5 12l5 5L20 7"/>
      </svg>
      <span>${safeEmail}</span>
    </div>
    <a href="https://stratalanding.com" class="btn btn--ghost">
      <span>Back to StrataLanding</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
        <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
      </svg>
    </a>
  ` : '';

  const eyebrow = state === 'success'
    ? `<span class="eyebrow eyebrow--success"><span class="dot"></span>Unsubscribed</span>`
    : state === 'error'
    ? `<span class="eyebrow eyebrow--error"><span class="dot"></span>Something went wrong</span>`
    : `<span class="eyebrow"><span class="dot"></span>Email preferences</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B1B3A">
<title>Unsubscribe — StrataLanding</title>
<link rel="icon" href="/brand/stratalanding.png" type="image/png">
<!-- AUDIT 2026-08-12 (P3): three Google Fonts <link> tags removed. The site's own CSP is
     font-src 'self' data: and style-src 'self' 'unsafe-inline', so these were BLOCKED — the page
     paid three DNS/TLS round trips and rendered in a fallback font anyway. System fonts render
     instantly and look correct on every platform. -->
<style>
  :root {
    --navy: #0B1B3A;
    --navy-700: #122549;
    --navy-600: #1a3160;
    --cyan: #0891B2;
    --cyan-50: #ECFEFF;
    --cyan-100: #CFFAFE;
    --cyan-200: #A5F3FC;
    --ivory: #F8FAFC;
    --slate-50: #F8FAFC;
    --slate-100: #F1F5F9;
    --slate-200: #E2E8F0;
    --slate-300: #CBD5E1;
    --slate-400: #94A3B8;
    --slate-500: #64748B;
    --slate-600: #475569;
    --slate-700: #334155;
    --slate-900: #0F172A;
    --rose-500: #F43F5E;
    --green-500: #22C55E;
    color-scheme: light;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--slate-900);
    background:
      radial-gradient(1200px 600px at 10% -10%, rgba(8,145,178,0.08), transparent 60%),
      radial-gradient(900px 500px at 100% 110%, rgba(11,27,58,0.06), transparent 55%),
      linear-gradient(180deg, #FBFCFE 0%, #F1F5F9 100%);
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Header */
  .masthead {
    padding: 28px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    transition: opacity 160ms ease;
  }
  .brand:hover { opacity: 0.75; }
  .brand img {
    height: 28px;
    width: auto;
    display: block;
  }

  .help-link {
    font-size: 13px;
    color: var(--slate-500);
    text-decoration: none;
    font-weight: 500;
    letter-spacing: 0.005em;
  }
  .help-link:hover { color: var(--navy); }

  /* Main */
  main {
    display: grid;
    place-items: center;
    padding: 40px 24px 80px;
  }

  .shell {
    width: 100%;
    max-width: 520px;
    animation: rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes rise {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Eyebrow tag */
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #fff;
    border: 1px solid var(--slate-200);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    color: var(--slate-700);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 24px;
    box-shadow: 0 1px 2px rgba(11,27,58,0.04);
  }
  .eyebrow .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 0 3px rgba(8,145,178,0.18);
  }
  .eyebrow--success .dot { background: var(--green-500); box-shadow: 0 0 0 3px rgba(34,197,94,0.18); }
  .eyebrow--error .dot { background: var(--rose-500); box-shadow: 0 0 0 3px rgba(244,63,94,0.18); }

  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600;
    font-size: 40px;
    line-height: 1.08;
    letter-spacing: -0.025em;
    color: var(--navy);
    margin-bottom: 16px;
  }

  .sub {
    font-size: 17px;
    color: var(--slate-600);
    margin-bottom: 36px;
    max-width: 42ch;
    line-height: 1.55;
  }

  /* Chip — success display */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--slate-200);
    border-radius: 12px;
    background: #fff;
    font-family: 'Inter', monospace;
    font-size: 14px;
    color: var(--navy);
    margin-bottom: 24px;
    box-shadow: 0 1px 2px rgba(11,27,58,0.04);
    max-width: 100%;
    word-break: break-all;
  }
  .chip svg { color: var(--green-500); flex-shrink: 0; }

  /* Form */
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 420px;
  }

  .field { display: flex; flex-direction: column; gap: 8px; }

  .label {
    font-size: 13px;
    font-weight: 500;
    color: var(--slate-700);
    letter-spacing: 0.005em;
  }

  input[type=email] {
    padding: 14px 16px;
    border: 1px solid var(--slate-200);
    border-radius: 12px;
    font-size: 15px;
    font-family: inherit;
    color: var(--navy);
    background: #fff;
    transition: border-color 160ms ease, box-shadow 160ms ease;
    box-shadow: 0 1px 2px rgba(11,27,58,0.04);
  }
  input[type=email]::placeholder { color: var(--slate-400); }
  input[type=email]:hover { border-color: var(--slate-300); }
  input[type=email]:focus {
    outline: none;
    border-color: var(--cyan);
    box-shadow: 0 0 0 4px rgba(8,145,178,0.15);
  }

  /* Button */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 22px;
    border: 0;
    border-radius: 12px;
    background: var(--navy);
    color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.005em;
    cursor: pointer;
    text-decoration: none;
    transition: background 160ms ease, transform 80ms ease, box-shadow 160ms ease;
    box-shadow: 0 1px 2px rgba(11,27,58,0.10), 0 8px 20px -8px rgba(11,27,58,0.30);
    align-self: flex-start;
  }
  .btn:hover { background: var(--navy-700); }
  .btn:active { transform: translateY(1px) scale(0.995); }
  .btn svg { transition: transform 160ms ease; }
  .btn:hover svg { transform: translateX(3px); }

  .btn--ghost {
    background: transparent;
    color: var(--navy);
    border: 1px solid var(--slate-200);
    box-shadow: 0 1px 2px rgba(11,27,58,0.04);
  }
  .btn--ghost:hover { background: #fff; border-color: var(--slate-300); }

  /* Divider + footnote */
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--slate-200), transparent);
    margin: 44px 0 24px;
    max-width: 420px;
  }

  .footnote {
    font-size: 13px;
    color: var(--slate-500);
    max-width: 420px;
    line-height: 1.6;
  }

  .footnote a {
    color: var(--navy);
    text-decoration: underline;
    text-decoration-color: var(--slate-300);
    text-underline-offset: 3px;
    font-weight: 500;
    transition: text-decoration-color 160ms ease;
  }
  .footnote a:hover { text-decoration-color: var(--cyan); }

  /* Footer */
  footer {
    padding: 24px 32px 32px;
    border-top: 1px solid var(--slate-200);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--slate-400);
    letter-spacing: 0.01em;
  }

  footer .links { display: flex; gap: 20px; }
  footer a { color: var(--slate-500); text-decoration: none; }
  footer a:hover { color: var(--navy); }

  @media (max-width: 560px) {
    .masthead { padding: 20px 20px; }
    main { padding: 24px 20px 60px; }
    h1 { font-size: 32px; }
    .sub { font-size: 16px; margin-bottom: 28px; }
    footer { padding: 20px; flex-direction: column; gap: 10px; text-align: center; }
  }
</style>
</head>
<body>
  <header class="masthead">
    <a href="https://stratalanding.com" class="brand" aria-label="StrataLanding">
      <img src="/brand/stratalanding.png" alt="StrataLanding">
    </a>
    <a href="mailto:stratalanding@gmail.com" class="help-link">Need help?</a>
  </header>

  <main>
    <div class="shell">
      ${eyebrow}
      <h1>${esc(headline)}</h1>
      <p class="sub">${esc(subtitle)}</p>
      ${successBlock}
      ${form}
      <div class="divider"></div>
      <p class="footnote">
        Removed by mistake? Reply to any prior email from us and we'll restore you. Questions about why we reached out in the first place? Email <a href="mailto:stratalanding@gmail.com">stratalanding@gmail.com</a>.
      </p>
    </div>
  </main>

  <footer>
    <span>© StrataLanding · Outreach preferences</span>
    <nav class="links">
      <a href="https://stratalanding.com/privacy">Privacy</a>
      <a href="https://stratalanding.com/terms">Terms</a>
      <a href="https://stratalanding.com">stratalanding.com</a>
    </nav>
  </footer>
</body>
</html>`;
}

async function extractEmailAndToken(request: Request): Promise<{ email: string | null; token: string | null }> {
  const url = new URL(request.url);
  let email = url.searchParams.get('email');
  let token = url.searchParams.get('token');

  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const e = form.get('email');
      const t = form.get('token');
      if (!email && typeof e === 'string' && e.trim()) email = e;
      if (!token && typeof t === 'string' && t.trim()) token = t;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!email && body && typeof body.email === 'string' && body.email.trim()) email = body.email;
      if (!token && body && typeof body.token === 'string' && body.token.trim()) token = body.token;
    }
  } catch {
    // Gmail one-click bodies aren't always parseable — safe to ignore.
  }
  return { email, token };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email')?.trim() ?? '';
  const token = url.searchParams.get('token')?.trim() ?? '';

  // SECURITY (audit F38): a GET must NOT mutate. Email link-prefetchers, security
  // scanners, and CSRF <img> tags all issue GETs — auto-suppressing on GET let anyone
  // silently unsubscribe arbitrary addresses and caused scanners to remove live prospects.
  // Show a confirmation form (pre-filled); the actual suppression happens on POST
  // (including the RFC 8058 one-click POST that mail clients send). The signed token is
  // carried through as a hidden field so the POST can prove this link was issued by us.
  return htmlResponse(renderPage({
    state: 'form',
    email,
    token,
    headline: 'Unsubscribe from StrataLanding.',
    subtitle: "Confirm below and we'll remove this address from our outreach list — no hard feelings.",
  }));
}

export async function POST(request: Request) {
  const { email, token } = await extractEmailAndToken(request);
  const contentType = request.headers.get('content-type') || '';
  const isFormPost = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

  if (!email) {
    return NextResponse.json({ ok: true, note: 'no_email_provided' }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // SECURITY (audit F38): only suppress when the request carries the signed token bound to THIS
  // email — otherwise anyone could POST email=victim@x.com to silently suppress arbitrary
  // addresses (denial-of-outreach). We don't reveal failure (always render success) to avoid
  // turning this into an oracle; we simply skip the DB write when the token doesn't match.
  const tokenValid = !!token && token === unsubSig(email);
  if (tokenValid) {
    try {
      await addSuppression({
        email,
        reason: 'one_click_unsubscribe',
        source: 'list_unsubscribe_header',
      });
    } catch {
      console.error('[unsubscribe] failed to persist suppression');
    }
  } else {
    console.warn('[unsubscribe] rejected suppression: missing/invalid token');
  }

  if (isFormPost) {
    return htmlResponse(renderPage({
      state: 'success',
      email,
      headline: "You're unsubscribed.",
      subtitle: 'This address has been removed from our outreach list. You will not receive further messages from us.',
    }));
  }

  return NextResponse.json({ ok: true, unsubscribed: email }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
