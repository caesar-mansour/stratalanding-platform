'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingGate({
  onboardingComplete,
  hasBrief,
  children,
}: {
  onboardingComplete: boolean;
  hasBrief: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnboardingPage = pathname === '/portal/onboarding';

  useEffect(() => {
    // Only gate if they have a brief (submitted a project) but haven't done onboarding
    if (hasBrief && !onboardingComplete && !isOnboardingPage) {
      router.replace('/portal/onboarding');
    }
  }, [hasBrief, onboardingComplete, isOnboardingPage, router]);

  return <>{children}</>;
}
