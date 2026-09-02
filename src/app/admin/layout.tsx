import "./admin.css";
import AdminSidebar from './AdminSidebar';
import AdminMain from './AdminMain';
import AutoRefresh from '@/components/AutoRefresh';
import RouteProgress from './_components/RouteProgress';
import CommandPalette from './_components/CommandPalette';
import Toaster from './_components/Toaster';
import ConfirmHost from './_components/ConfirmDialog';
import AuroraBackground from './_components/AuroraBackground';
import ConstellationField from './_components/ConstellationField';
import CursorGlow from './_components/CursorGlow';

// ROLLOUT 2026-08-12 (GATE 7): the root layout declares `robots: { index: true, follow: true }`,
// which every segment inherits. netlify.toml's `X-Robots-Tag` rule for /admin/* does NOT reach
// Next.js-rendered responses — verified on the deployed preview, where /admin/login returned 200
// with `<meta name="robots" content="index, follow">` and no X-Robots-Tag header. robots.txt
// disallows these paths, but a disallowed URL can still be indexed if it is linked. Declaring it
// here covers every route under /admin without per-page duplication.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <RouteProgress />
      <AutoRefresh interval={60} idleSeconds={120} />

      {/* Living aurora background + interactive constellation field + cursor spotlight */}
      <AuroraBackground />
      <ConstellationField />
      <CursorGlow />

      <AdminSidebar />

      <AdminMain>{children}</AdminMain>

      {/* Global admin UX surfaces — self-hide on /admin/login */}
      <CommandPalette />
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
