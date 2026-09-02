# Security Policy

StrataLanding takes the security of our platform and our clients' data seriously.

## Reporting a Vulnerability

If you believe you've found a security vulnerability, please report it privately:

- **Email:** stratalanding@gmail.com
- Include: a description, reproduction steps, affected URL/endpoint, and impact.
- Please give us a reasonable window to remediate before any public disclosure.

**Please do not**, while testing:
- Access, modify, or delete data that isn't yours.
- Run automated scanners that degrade service (DoS / brute force at volume).
- Use social engineering, phishing, or physical attacks.

Good-faith research conducted under this policy is welcome.

## Scope

- `stratalanding.com` and its API (`/api/*`)
- The client portal, partner portal, and admin surfaces

Out of scope: third-party services we use (PayPal, Neon, Netlify, Google), and the
static demo pages under `/demos/*` (pure static content, no backend).

## Our Security Posture (summary)

This codebase is continuously hardened. Highlights:

- **Auth:** custom JWT sessions (HS256, alg-pinned), DB-backed session revocation, bcrypt
  (12 rounds), TOTP MFA for clients and admins, progressive account lockout, durable rate limits.
- **Payments:** PayPal webhook signature verification (fail-closed), server-authoritative pricing,
  idempotent capture/commission via DB unique constraints, refund/chargeback handling.
- **Injection/XSS:** parameterized SQL (postgres.js tagged templates) everywhere, context-correct
  output encoding, strict security headers (HSTS preload, X-Frame-Options, CSP, COOP).
- **Secrets:** purpose-separated keys, startup env validation, no secrets in source or git history.
- **Abuse:** durable per-IP/per-account rate limiting, Origin/CSRF checks on state-changing routes,
  signed open-redirect/unsubscribe/tracking links.

Detailed audit history and internal threat modelling are maintained privately and are
not published here.
