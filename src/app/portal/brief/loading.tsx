export default function BriefLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-56" />
      </div>

      <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md divide-y divide-white/50">
        {[1, 2, 3, 4].map((section) => (
          <div key={section} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
              <div className="h-6 bg-gray-200 rounded w-40" />
            </div>
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div key={item}>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-5 bg-gray-200 rounded w-48" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
