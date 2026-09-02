'use client';

import { usePortalData } from '../PortalDataContext';
import ProposalsContent from './ProposalsContent';
import type { Proposal } from '@/lib/types';

export default function ProposalsPage() {
  const { proposals } = usePortalData();

  return <ProposalsContent proposals={proposals as unknown as Proposal[]} />;
}
