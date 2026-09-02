export default function UploadsLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-56" />
      </div>

      {/* Upload area skeleton */}
      <div className="rounded-2xl border-2 border-dashed border-white/60 bg-white/70 backdrop-blur-md shadow-[0_10px_40px_-14px_rgba(11,27,58,0.18)] p-8 mb-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mb-4" />
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-64 mb-4" />
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-16" />
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded-lg w-36" />
        </div>
      </div>

      {/* Files list skeleton */}
      <div className="rounded-xl border border-white/60 bg-white/70 backdrop-blur-md">
        <div className="p-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-32" />
        </div>
        <div className="p-8 text-center">
          <div className="h-4 bg-gray-200 rounded w-40 mx-auto" />
        </div>
      </div>
    </div>
  );
}
