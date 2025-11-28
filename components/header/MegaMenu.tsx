'use client';

import Link from 'next/link';

interface SubcategoryItem {
  handle: string;
  label: string;
  count: number;
}

interface MegaMenuProps {
  categoryLabel: string;
  subcategories: SubcategoryItem[];
}

/**
 * Mega Menu Component
 * 
 * Modern ecommerce mega menu inspired by Back Market
 * Features:
 * - Full-width dropdown
 * - Grid layout with subcategories from mapping
 * - Clean, professional design
 * - Smooth animations
 */
export function MegaMenu({
  categoryLabel,
  subcategories,
}: MegaMenuProps) {
  
  // Convert category label to handle
  const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

  // Limit to 6 items for display
  const displaySubcategories = subcategories.slice(0, 6);

  if (displaySubcategories.length === 0) {
    return null;
  }

  return (
    <div className="w-screen max-w-7xl bg-white border border-gray-200 rounded-lg shadow-2xl">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {categoryLabel}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Shop by category
              </p>
            </div>
            <Link
              href={`/${categoryHandle}`}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              View all →
            </Link>
          </div>
        </div>

        {/* Subcategories Grid */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displaySubcategories.map((subcategory) => {
            const href = `/${categoryHandle}/${subcategory.handle}`;

            return (
              <li key={subcategory.handle}>
                <Link
                  href={href}
                  className="block group rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200"
                >
                  {/* Title */}
                  <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                    {subcategory.label}
                  </h4>

                  {/* Count and arrow */}
                  <div className="flex items-center justify-between mt-2">
                    {subcategory.count > 0 && (
                      <span className="text-sm text-gray-500">
                        {subcategory.count} {subcategory.count === 1 ? 'item' : 'items'}
                      </span>
                    )}
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
