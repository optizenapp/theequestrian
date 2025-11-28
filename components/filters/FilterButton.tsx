'use client';

/**
 * Filter Button Component
 * 
 * Mobile button to open filter drawer
 */

interface FilterButtonProps {
  onClick: () => void;
  activeFilterCount?: number;
}

export function FilterButton({ onClick, activeFilterCount = 0 }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
      aria-label="Open filters"
    >
      <svg
        className="w-5 h-5 text-neutral-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>
      <span className="text-sm font-medium text-neutral-900">
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </span>
    </button>
  );
}
