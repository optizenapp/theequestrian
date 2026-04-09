'use client';

/**
 * Product Breadcrumbs Component
 * 
 * Features:
 * - Shows primary breadcrumb path by default
 * - Additional category paths can be toggled
 * - All paths remain in HTML for SEO
 * - Generates proper schema for all paths
 */

import { useState } from 'react';
import Link from 'next/link';

interface BreadcrumbPath {
  label: string;
  href: string;
}

interface ProductBreadcrumbsProps {
  productTitle: string;
  primaryPath: BreadcrumbPath[];
  additionalPaths?: BreadcrumbPath[][];
}

export function ProductBreadcrumbs({ 
  productTitle, 
  primaryPath, 
  additionalPaths = [] 
}: ProductBreadcrumbsProps) {
  const [showAllPaths, setShowAllPaths] = useState(false);

  const renderBreadcrumbPath = (path: BreadcrumbPath[], isVisible: boolean, pathIndex: number) => (
    <nav
      key={pathIndex}
      className={`flex items-center flex-wrap gap-y-1 text-sm text-gray-500 ${isVisible ? '' : 'sr-only'}`}
      aria-label={pathIndex === 0 ? 'Primary breadcrumb' : `Alternative breadcrumb ${pathIndex}`}
    >
      <Link href="/" className="hover:text-action transition-colors whitespace-nowrap">Home</Link>
      {path.map((crumb, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className="mx-1.5 text-gray-400">/</span>
          <Link
            href={crumb.href}
            className="hover:text-action capitalize transition-colors"
          >
            {crumb.label}
          </Link>
        </span>
      ))}
      <span className="flex items-center min-w-0">
        <span className="mx-1.5 text-gray-400">/</span>
        <span className="text-gray-900 font-medium truncate">{productTitle}</span>
      </span>
    </nav>
  );

  return (
    <div className="mb-8">
      {/* Primary Breadcrumb - Always Visible */}
      {renderBreadcrumbPath(primaryPath, true, 0)}

      {/* Additional Paths - Hidden for SEO (sr-only) */}
      {!showAllPaths && additionalPaths.map((path, index) => 
        renderBreadcrumbPath(path, false, index + 1)
      )}

      {/* Toggle Button for Additional Paths */}
      {additionalPaths.length > 0 && (
        <button
          onClick={() => setShowAllPaths(!showAllPaths)}
          className="mt-2 text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1"
        >
          {showAllPaths ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide other categories
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Also in {additionalPaths.length} other {additionalPaths.length === 1 ? 'category' : 'categories'}
            </>
          )}
        </button>
      )}

      {/* Show Additional Paths when toggled */}
      {showAllPaths && additionalPaths.length > 0 && (
        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
          {additionalPaths.map((path, index) => (
            <div key={index} className="flex text-sm text-gray-500">
              <Link href="/" className="hover:text-action transition-colors">Home</Link>
              {path.map((crumb, i) => (
                <span key={i} className="flex items-center">
                  <span className="mx-2">/</span>
                  <Link 
                    href={crumb.href}
                    className="hover:text-action capitalize transition-colors"
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium truncate">{productTitle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


