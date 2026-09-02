'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] border border-border p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full mb-4" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function QuickLinkSkeleton() {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] border border-border p-5">
      <Skeleton className="w-10 h-10 rounded-[var(--radius-md)] mb-3" />
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Status Card */}
      <CardSkeleton />

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <QuickLinkSkeleton />
        <QuickLinkSkeleton />
        <QuickLinkSkeleton />
      </div>

      {/* Payment Summary */}
      <div className="mt-8">
        <CardSkeleton />
      </div>
    </div>
  );
}
