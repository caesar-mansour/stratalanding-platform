import { validateEnvironment } from '@/lib/security/validate-env';

export function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Fail fast on missing/invalid required env (audit F3 — this was previously
        // never called, so the prod presence-enforcement + the `||'fallback'` secret
        // footguns were unreachable/dead).
        validateEnvironment();
        console.log("[StrataLanding] Node.js runtime instrumentation initialized.");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        console.log("[StrataLanding] Edge runtime instrumentation initialized.");
    }
}
