// Route-level loading skeleton — rendered inside the admin layout while any
// admin route's server data is being fetched. Glassmorphic to match the live
// surfaces; the aurora + constellation keep moving behind it.
const glass =
  'rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)]';

export default function AdminLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true" aria-label="Loading">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="skeleton h-8 w-1.5 rounded-full" />
        <div>
          <div className="skeleton h-7 w-56 mb-2.5" />
          <div className="skeleton h-4 w-80" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${glass} p-5`}>
            <div className="flex items-start justify-between mb-4">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-11 w-11 rounded-xl" />
            </div>
            <div className="skeleton h-9 w-32" />
            <div className="skeleton h-3 w-24 mt-3" />
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className={`${glass} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-white/50">
          <div className="skeleton h-5 w-40" />
        </div>
        <div className="divide-y divide-white/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="skeleton h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-4 w-16 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
