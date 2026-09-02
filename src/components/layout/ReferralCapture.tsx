'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { persistReferral } from '@/lib/referral';

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref) return;

    persistReferral(ref);

    // Fire-and-forget click tracking
    fetch('/api/ref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ref.toUpperCase().slice(0, 20), url: window.location.href }),
    }).catch(() => {/* non-critical */});
  }, [searchParams]);

  return null;
}
