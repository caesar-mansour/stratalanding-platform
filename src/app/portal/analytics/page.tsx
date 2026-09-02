'use client';

import { usePortalData } from '../PortalDataContext';
import PortalAnalyticsContent from './PortalAnalyticsContent';

export default function PortalAnalyticsPage() {
  const { projects } = usePortalData();
  const project = projects[0];

  if (!project?.site_id) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Analytics Coming Soon</h2>
        <p className="text-text-muted max-w-md mx-auto">
          Analytics will be available once your landing page is launched. We&apos;ll track visitors, referrers, devices, and more — all in real time.
        </p>
      </div>
    );
  }

  return <PortalAnalyticsContent siteId={project.site_id} />;
}
