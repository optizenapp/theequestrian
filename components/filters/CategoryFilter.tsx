'use client';

/**
 * Category Filter Component
 * 
 * Displays subcategories (product types) as SEO-friendly links
 * Grouped by parent collection in accordion format
 * Includes search functionality
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface CategoryFilterProps {
  subcategories: SubcategoryOption[];
  currentCategory: string;
  currentSubcategory?: string;
  parentCollectionTitle: string;
}

export function CategoryFilter({
  subcategories,
  currentCategory,
  currentSubcategory,
  parentCollectionTitle,
}: CategoryFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredSubcategories = useMemo(() => {
    if (!searchQuery) return subcategories;

    const query = searchQuery.toLowerCase();
    return subcategories.filter((sub) =>
      sub.label.toLowerCase().includes(query)
    );
  }, [subcategories, searchQuery]);

  if (subcategories.length === 0) return null;

  return (
    <div className="border-b border-neutral-200 pb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-4 group"
        aria-expanded={isExpanded}
      >
        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
          Categories
        </h3>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Search */}
          {subcategories.length > 5 && (
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}

          {/* "All" option */}
          <Link
            href={`/${currentCategory}`}
            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
              !currentSubcategory
                ? 'bg-primary text-white font-medium'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            All {parentCollectionTitle}
          </Link>

          {/* Subcategories */}
          {filteredSubcategories.map((subcategory) => (
            <Link
              key={subcategory.value}
              href={`/${currentCategory}/${subcategory.value}`}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                currentSubcategory === subcategory.value
                  ? 'bg-primary text-white font-medium'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {subcategory.label}
              {subcategory.count > 0 && (
                <span className="ml-2 text-xs opacity-75">
                  ({subcategory.count})
                </span>
              )}
            </Link>
          ))}

          {/* No results */}
          {searchQuery && filteredSubcategories.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">
              No categories found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
