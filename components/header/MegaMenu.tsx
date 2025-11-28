'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { CollectionWithParent } from '@/types/shopify';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface MegaMenuProps {
  collection: CollectionWithParent;
  childCollections: CollectionWithParent[];
  productTypeSubcategories: SubcategoryOption[];
}

/**
 * Mega Menu Component
 * 
 * Modern ecommerce mega menu inspired by Back Market
 * Features:
 * - Full-width dropdown
 * - Grid layout with images
 * - Product type subcategories and child collections
 * - Clean, professional design
 * - Smooth animations
 */
export function MegaMenu({
  collection,
  childCollections,
  productTypeSubcategories,
}: MegaMenuProps) {
  // Combine product types and child collections
  const allSubcategories = [
    ...productTypeSubcategories.map((sub) => ({
      title: sub.label,
      handle: sub.value,
      count: sub.count,
      type: 'product-type' as const,
    })),
    ...childCollections.map((col) => ({
      title: col.title,
      handle: col.handle,
      count: 0,
      type: 'collection' as const,
      image: col.image,
    })),
  ];

  // Limit to 6 items for display
  const displaySubcategories = allSubcategories.slice(0, 6);

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
                {collection.title}
              </h3>
              {collection.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {collection.description}
                </p>
              )}
            </div>
            <Link
              href={`/${collection.handle}`}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              View all →
            </Link>
          </div>
        </div>

        {/* Subcategories Grid */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displaySubcategories.map((subcategory) => {
            const href =
              subcategory.type === 'product-type'
                ? `/${collection.handle}/${subcategory.handle}`
                : `/${subcategory.handle}`;

            return (
              <li key={`${subcategory.type}-${subcategory.handle}`}>
                <Link
                  href={href}
                  className="block group rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200"
                >
                  {/* Image if available */}
                  {subcategory.type === 'collection' && subcategory.image && (
                    <div className="aspect-video relative mb-3 rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={subcategory.image.url}
                        alt={subcategory.image.altText || subcategory.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <h4 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                    {subcategory.title}
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
