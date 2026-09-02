'use client';

import { usePortalData } from '../PortalDataContext';
import { GradientText, Reveal, RevealGroup, RevealItem } from '../components/portal-ui';
import Link from 'next/link';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

/** Consistent icon chip used across the brief's info cards and states. */
const ICON_CHIP = 'w-9 h-9 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center shrink-0';

export default function PortalBriefPage() {
  const { client, projects, brief } = usePortalData();

  if (!client || projects.length === 0) {
    return (
      <Reveal className="max-w-md mx-auto">
        <div className={`${GLASS} p-8 text-center`}>
          <div className={`${ICON_CHIP} w-12 h-12 mx-auto mb-4`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2"><GradientText>No Project Found</GradientText></h2>
          <p className="text-text-muted mb-5">There&apos;s no active project on your account yet.</p>
          <Link
            href="/portal"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium transition-[background-color,transform] duration-200 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </Reveal>
    );
  }

  if (!brief) {
    return (
      <Reveal className="max-w-md mx-auto">
        <div className={`${GLASS} p-8 text-center`}>
          <div className={`${ICON_CHIP} w-12 h-12 mx-auto mb-4`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2"><GradientText>Brief Not Found</GradientText></h2>
          <p className="text-text-muted mb-5">
            We couldn&apos;t find your project brief. Please contact support.
          </p>
          <Link
            href="/portal"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium transition-[background-color,transform] duration-200 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </Reveal>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          <GradientText>Project Brief</GradientText>
        </h1>
        <p className="text-text-muted">
          Your submitted project details (read-only)
        </p>
      </div>

      <RevealGroup className="space-y-4">
        {/* Business Section */}
        <RevealItem className="relative p-6 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] overflow-hidden">
          {/* Blue gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#22D3EE] via-[#0891B2] to-[#0B1B3A]" />
          <div className="flex items-center gap-3 mb-4">
            <div className={ICON_CHIP}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Business Information
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-text-muted">Company Name</dt>
              <dd className="mt-1 text-text-primary">{brief.company_name}</dd>
            </div>
            {brief.website && (
              <div>
                <dt className="text-sm font-medium text-text-muted">Website</dt>
                <dd className="mt-1">
                  <a
                    href={brief.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent)] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                  >
                    {brief.website}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-text-muted">Industry</dt>
              <dd className="mt-1 text-text-primary">{brief.industry}</dd>
            </div>
          </dl>
        </RevealItem>

        {/* Goals Section */}
        <RevealItem className="p-6 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]">
          <div className="flex items-center gap-3 mb-4">
            <div className={ICON_CHIP}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Project Goals
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-text-muted">Primary Goal</dt>
              <dd className="mt-1 text-text-primary">{brief.primary_goal}</dd>
            </div>
            {brief.challenge && (
              <div>
                <dt className="text-sm font-medium text-text-muted">Current Challenge</dt>
                <dd className="mt-1 text-text-primary whitespace-pre-wrap">{brief.challenge}</dd>
              </div>
            )}
          </dl>
        </RevealItem>

        {/* Audience Section */}
        <RevealItem className="p-6 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]">
          <div className="flex items-center gap-3 mb-4">
            <div className={ICON_CHIP}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Target Audience
            </h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-text-muted">Target Audience</dt>
              <dd className="mt-1 text-text-primary whitespace-pre-wrap">{brief.audience}</dd>
            </div>
            {brief.pain_points && (
              <div>
                <dt className="text-sm font-medium text-text-muted">Pain Points</dt>
                <dd className="mt-1 text-text-primary whitespace-pre-wrap">{brief.pain_points}</dd>
              </div>
            )}
          </dl>
        </RevealItem>

        {/* Additional Notes */}
        {brief.notes && (
          <RevealItem className="p-6 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]">
            <div className="flex items-center gap-3 mb-4">
              <div className={ICON_CHIP}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                Additional Notes
              </h2>
            </div>
            <p className="text-text-primary whitespace-pre-wrap">{brief.notes}</p>
          </RevealItem>
        )}
      </RevealGroup>

      {/* Request Change Note */}
      <div className="mt-6 p-4 bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent rounded-[var(--radius-md)] border border-[var(--color-accent)]/20">
        <p className="text-sm text-text-muted">
          Need to update your brief?{' '}
          <a
            href="mailto:stratalanding@gmail.com?subject=Brief Update Request"
            className="text-[var(--color-accent)] font-medium hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
          >
            Contact us
          </a>{' '}
          with your changes and we&apos;ll update it for you.
        </p>
      </div>
    </div>
  );
}
