// ROLLOUT 2026-08-12 (GATE 7): /login/page.tsx is a client component, so it cannot export
// `metadata` itself. This layout exists solely to override the root layout's
// `robots: { index: true, follow: true }`. robots.txt already disallows /login.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
