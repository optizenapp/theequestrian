/**
 * Related Categories Component
 * 
 * Displays related category links for Hub & Spoke internal linking
 * Helps establish topical authority and improve navigation
 */

import Link from 'next/link';
import type { RelatedCategory } from '@/lib/content/collections';

interface RelatedCategoriesProps {
  categories: RelatedCategory[];
  title?: string;
}

export function RelatedCategories({ 
  categories, 
  title = "You May Also Like" 
}: RelatedCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category, index) => (
          <Link
            key={index}
            href={category.url}
            className="group block p-6 bg-white border border-gray-200 rounded-lg hover:border-pink-500 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-600 transition-colors mb-2">
              {category.title}
            </h3>
            
            {category.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {category.description}
              </p>
            )}
            
            <div className="mt-4 flex items-center text-pink-600 text-sm font-medium">
              <span>Browse Collection</span>
              <svg
                className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}



