/**
 * Loading skeleton for mega menu
 * Modern skeleton loader matching the mega menu layout
 */
export function MegaMenuLoader() {
  return (
    <div className="absolute left-0 top-full mt-0 w-full bg-white border-t border-gray-200 shadow-2xl z-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <li key={item}>
              <div className="rounded-lg p-4 border border-gray-200">
                <div className="aspect-video bg-gray-200 rounded-md mb-3 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                <div className="flex items-center justify-between mt-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
