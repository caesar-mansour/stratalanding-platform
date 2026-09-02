export default function StatusLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>

      {/* Status banner skeleton */}
      <div className="bg-gray-100 rounded-xl p-6 mb-8">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="h-6 bg-gray-200 rounded w-40" />
        </div>
        <div className="space-y-6 pl-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-32 mb-1" />
                <div className="h-4 bg-gray-200 rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
