'use client';

import dynamic from 'next/dynamic';

const ExitIntentPopup = dynamic(() => import('@/components/layout/ExitIntentPopup'), { ssr: false });
const AccessibilityWidget = dynamic(() => import('@/components/layout/AccessibilityWidget'), { ssr: false });
const ServiceWorkerRegister = dynamic(() => import('@/components/pwa/ServiceWorkerRegister').then(m => ({ default: m.ServiceWorkerRegister })), { ssr: false });
const PerformanceMonitor = dynamic(() => import('@/components/performance/PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })), { ssr: false });

// AUDIT 2026-08-12: <Heartbeat /> removed. It fired /api/heartbeat on EVERY marketing page load,
// and that route ran checkAndSendInterviewReminders() — a 5-table JOIN against Neon — so every
// anonymous visitor woke the database and a background email job rode on random visitor traffic.
// Interview reminders now run on a real schedule (netlify/functions/cron-interview-reminders.mts).

export function LazyWidgets() {
  return (
    <>
      <ExitIntentPopup />
      <AccessibilityWidget />
      <ServiceWorkerRegister />
      <PerformanceMonitor />
    </>
  );
}
