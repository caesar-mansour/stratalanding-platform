// ROLLOUT 2026-08-12 (GATE 7): covers /auth/activate, /auth/callback, /auth/forgot-password,
// /auth/reset-password and /auth/verify-2fa in one place rather than five. These are private
// utility routes — robots.txt already disallows /auth and /auth/* — but the root layout declares
// `robots: { index: true, follow: true }`, which they would otherwise inherit.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
