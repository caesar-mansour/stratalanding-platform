export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
          <div className="h-5 bg-gray-200 rounded w-48" />
        </div>

        <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div>
                <div className="h-6 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-4 bg-gray-200 rounded w-56" />
              </div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
