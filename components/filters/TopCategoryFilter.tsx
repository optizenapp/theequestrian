'use client';

/**
 * Top Category Filter Component
 * 
 * Displays links to main top-level categories
 */

import Link from 'next/link';

interface TopCategory {
  handle: string;
  label: string;
}

const topCategories: TopCategory[] = [
  { handle: 'horse', label: 'Horse' },
  { handle: 'rider', label: 'Rider' },
  { handle: 'clothing', label: 'Clothing' },
  { handle: 'pet', label: 'Pet' },
  { handle: 'accessories', label: 'Accessories' },
];

interface TopCategoryFilterProps {
  currentCategory?: string;
}

export function TopCategoryFilter({ currentCategory }: TopCategoryFilterProps) {
  return (
    <div className="border-b border-gray-200 pb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
      <div className="space-y-2">
        {topCategories.map((category) => {
          const isActive = currentCategory === category.handle;
          
          return (
            <Link
              key={category.handle}
              href={`/${category.handle}`}
              className={`block text-sm py-1 transition-colors ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {category.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

