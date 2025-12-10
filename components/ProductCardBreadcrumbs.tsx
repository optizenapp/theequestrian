'use client';

/**
 * Product Card Breadcrumbs Component
 * 
 * Shows breadcrumb paths for products on collection pages
 * Displays primary path + "show more" for additional categories
 */

import { useState } from 'react';
import Link from 'next/link';

interface BreadcrumbPath {
  label: string;
  href: string;
}

interface ProductCardBreadcrumbsProps {
  paths: Array<BreadcrumbPath[]>;
  className?: string;
}

export function ProductCardBreadcrumbs({ paths, className = '' }: ProductCardBreadcrumbsProps) {
  const [showAll, setShowAll] = useState(false);

  if (paths.length === 0) {
    return null;
  }

  const primaryPath = paths[0];
  const additionalPaths = paths.slice(1);

  const renderPath = (path: BreadcrumbPath[], isVisible: boolean = true) => (
    <div className={`flex items-center text-xs text-gray-500 ${isVisible ? '' : 'sr-only'}`}>
      <Link href="/" className="hover:text-primary transition-colors">
        Home
      </Link>
      {path.map((crumb, i) => (
        <span key={i} className="flex items-center">
          <span className="mx-1">/</span>
          <Link 
            href={crumb.href}
            className="hover:text-primary transition-colors"
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </div>
  );

  return (
    <div className={className}>
      {/* Primary breadcrumb - always visible */}
      {renderPath(primaryPath, true)}

      {/* Additional paths - hidden for SEO */}
      {!showAll && additionalPaths.map((path, index) => (
        <div key={index}>
          {renderPath(path, false)}
        </div>
      ))}

      {/* Toggle button */}
      {additionalPaths.length > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-1 text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1"
        >
          {showAll ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              +{additionalPaths.length} more {additionalPaths.length === 1 ? 'category' : 'categories'}
            </>
          )}
        </button>
      )}

      {/* Show additional paths when toggled */}
      {showAll && additionalPaths.length > 0 && (
        <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200">
          {additionalPaths.map((path, index) => (
            <div key={index}>
              {renderPath(path, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


