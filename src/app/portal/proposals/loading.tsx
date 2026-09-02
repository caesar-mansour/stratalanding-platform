export default function ProposalsLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md p-6">
            <div className="flex justify-between mb-4">
              <div>
                <div className="h-6 bg-gray-200 rounded w-40 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-28" />
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-24" />
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-5 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
