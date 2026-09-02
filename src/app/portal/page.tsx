'use client';

import { usePortalData } from './PortalDataContext';
import { statusInfo, packageLabels, formatPrice, calculateTotalCents, type ProjectStatus, type PackageType, type PackageCustomizations } from '@/lib/types';
import { getPaymentAmounts } from '@/lib/paypal';
import DashboardContent from './components/DashboardContent';
import { NoProjectState } from './components/NoProjectState';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function PortalDashboard() {
  const { client, projects, onboardingStatus, hasTemplatePurchases, overrideCents } = usePortalData();
  const router = useRouter();

  // Template-only users: redirect to their templates page
  useEffect(() => {
    if (!client && hasTemplatePurchases) {
      router.replace('/portal/my-templates');
    }
  }, [client, hasTemplatePurchases, router]);

  if (!client) {
    if (hasTemplatePurchases) return null; // redirecting
    return <NoProjectState clientName="there" />;
  }

  const project = projects[0];

  if (!project) {
    return <NoProjectState clientName={client.name || 'there'} />;
  }

  const customizations = project.package_customizations as PackageCustomizations | null;
  const effectiveTotal = overrideCents ?? calculateTotalCents(project.package as PackageType, customizations);
  const paymentAmounts = getPaymentAmounts(project.package as PackageType, customizations, overrideCents);
  const onboardingComplete = onboardingStatus?.status === 'completed';

  // Phone-outreach leads came from a cold call + preview approval — NOT a brief/onboarding.
  // Pre-proposal (status 'new') they get preview-flow copy, no price, and no onboarding nudge.
  const isPhoneLead = (project as { source?: string }).source === 'phone';
  const phoneNew = isPhoneLead && project.status === 'new';
  const status = phoneNew
    ? { label: 'Preview Approved', description: "You approved your preview — love it. We're putting your proposal together now.", nextAction: "We'll email your proposal shortly — usually within a day." }
    : statusInfo[project.status as ProjectStatus];
  const packageLabel = phoneNew
    ? packageLabels[project.package as PackageType]
    : `${packageLabels[project.package as PackageType]} (${formatPrice(effectiveTotal)})`;

  return (
    <>
      {/* Onboarding Banner — phone leads skip onboarding, so never nudge them to it */}
      {!onboardingComplete && !isPhoneLead && (
        <motion.div
          className="max-w-3xl mx-auto mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link href="/portal/onboarding">
            <div className="relative bg-gradient-to-r from-cyan-50 via-white to-cyan-50 rounded-xl border border-cyan-200 p-5 overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {onboardingStatus ? `Continue Your Interview (${onboardingStatus.current_question - 1}/10)` : 'Help Us Build Your Perfect Landing Page'}
                    </h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {onboardingStatus
                        ? 'Pick up where you left off — just a few more questions to go!'
                        : 'Complete a quick 10-question AI interview so we can deeply understand your business.'}
                    </p>
                  </div>
                </div>
                <span className="text-cyan-600 font-medium text-sm flex items-center gap-1 flex-shrink-0 group-hover:translate-x-1 transition-transform">
                  {onboardingStatus ? 'Continue' : 'Start Interview'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      <DashboardContent
        clientName={client.name || 'there'}
        packageLabel={packageLabel}
        status={status}
        projectStatus={project.status as ProjectStatus}
        projectId={project.id}
        paymentAmounts={paymentAmounts}
        previewUrl={project.preview_url || null}
        isPhoneLead={isPhoneLead}
      />
    </>
  );
}
