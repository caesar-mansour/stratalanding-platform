'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface PortalProject {
  id: string;
  client_id: string;
  package: string;
  timeline: string;
  status: string;
  site_id: string | null;
  preview_url: string | null;
  deposit_payment_url: string | null;
  final_payment_url: string | null;
  launched_at: string | null;
  admin_notes: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface PortalClient {
  id: string;
  email: string;
  name: string;
  created_at: string;
  [key: string]: unknown;
}

export interface PortalProposal {
  id: string;
  project_id: string | null;
  client_name: string;
  client_email: string;
  company_name: string;
  package: string;
  custom_price_cents: number | null;
  notes: string | null;
  valid_until: string;
  deposit_payment_url: string | null;
  status: string;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface PortalBrief {
  id: string;
  project_id: string;
  company_name: string;
  website: string | null;
  industry: string;
  primary_goal: string | null;
  audience: string | null;
  pain_points: string | null;
  challenge: string | null;
  notes: string | null;
  demo_reference: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface PortalData {
  client: PortalClient | null;
  projects: PortalProject[];
  userEmail: string;
  proposals: PortalProposal[];
  brief: PortalBrief | null;
  onboardingStatus: { id: string; status: string; current_question: number } | null;
  hasTemplatePurchases?: boolean;
  overrideCents?: number | null;
}

const PortalDataContext = createContext<PortalData | null>(null);

export function PortalDataProvider({
  children,
  data,
}: {
  children: ReactNode;
  data: PortalData;
}) {
  return (
    <PortalDataContext.Provider value={data}>
      {children}
    </PortalDataContext.Provider>
  );
}

export function usePortalData() {
  const context = useContext(PortalDataContext);
  if (!context) {
    throw new Error('usePortalData must be used within PortalDataProvider');
  }
  return context;
}
