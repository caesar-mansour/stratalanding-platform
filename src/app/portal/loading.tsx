export default function PortalLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      {/* Status card skeleton */}
      <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-1" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>

      {/* Quick links skeleton */}
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-5">
            <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3" />
            <div className="h-5 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
