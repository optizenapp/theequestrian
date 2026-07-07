'use client';

/**
 * Product Breadcrumbs Component
 *
 * - Mobile: compact sliding window (see BreadcrumbTrail)
 * - Desktop: full path
 * - Additional category paths stay in HTML (sr-only) for SEO
 */

import { useState } from 'react';
import Link from 'next/link';
import { BreadcrumbTrail, formatBreadcrumbLabel } from '@/components/BreadcrumbTrail';

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
  additionalPaths = [],
}: ProductBreadcrumbsProps) {
  const [showAllPaths, setShowAllPaths] = useState(false);

  const primaryItems = [
    { label: 'Home', href: '/' },
    ...primaryPath.map((crumb) => ({ label: crumb.label, href: crumb.href })),
    { label: productTitle },
  ];

  const renderHiddenPath = (path: BreadcrumbPath[], pathIndex: number) => (
    <nav
      key={pathIndex}
      className="sr-only"
      aria-label={pathIndex === 0 ? 'Primary breadcrumb' : `Alternative breadcrumb ${pathIndex}`}
    >
      <Link href="/">Home</Link>
      {path.map((crumb, i) => (
        <span key={i}>
          {' / '}
          <Link href={crumb.href}>{formatBreadcrumbLabel(crumb.label)}</Link>
        </span>
      ))}
      <span>
        {' / '}
        {productTitle}
      </span>
    </nav>
  );

  return (
    <div className="mb-8">
      <BreadcrumbTrail items={primaryItems} ariaLabel="Primary breadcrumb" />

      {!showAllPaths && additionalPaths.map((path, index) => renderHiddenPath(path, index + 1))}

      {additionalPaths.length > 0 && (
        <button
          type="button"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7-7 7-7" />
              </svg>
              Also in {additionalPaths.length} other {additionalPaths.length === 1 ? 'category' : 'categories'}
            </>
          )}
        </button>
      )}

      {showAllPaths && additionalPaths.length > 0 && (
        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
          {additionalPaths.map((path, index) => (
            <div key={index} className="flex flex-wrap text-sm text-gray-500">
              <Link href="/" className="hover:text-action transition-colors">
                Home
              </Link>
              {path.map((crumb, i) => (
                <span key={i} className="flex items-center min-w-0">
                  <span className="mx-2">/</span>
                  <Link href={crumb.href} className="hover:text-action capitalize transition-colors truncate">
                    {formatBreadcrumbLabel(crumb.label)}
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
