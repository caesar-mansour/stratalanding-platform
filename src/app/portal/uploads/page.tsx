'use client';

import { usePortalData } from '../PortalDataContext';
import UploadsContent from './UploadsContent';
import Link from 'next/link';

export default function PortalUploadsPage() {
  const { client, projects } = usePortalData();

  if (!client || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No project found.</p>
        <Link href="/portal" className="text-[var(--color-accent)] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const project = projects[0];

  return <UploadsContent projectId={project.id} />;
}
