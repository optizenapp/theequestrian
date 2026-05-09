interface ProductGridSkeletonProps {
  items?: number;
}

export function ProductGridSkeleton({ items = 6 }: ProductGridSkeletonProps) {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-5 w-48 rounded bg-gray-200" />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: items }).map((_, index) => (
          <li key={index} className="rounded-2xl border border-gray-100 bg-surface p-4">
            <div className="mb-4 aspect-[4/3] w-full rounded-2xl bg-gray-100" />
            <div className="space-y-2">
              <div className="h-4 w-11/12 rounded bg-gray-200" />
              <div className="h-4 w-9/12 rounded bg-gray-200" />
              <div className="h-4 w-3/12 rounded bg-gray-200" />
            </div>
            <div className="mt-4 h-9 rounded-lg bg-gray-100" />
          </li>
        ))}
      </ul>
    </div>
  );
}
