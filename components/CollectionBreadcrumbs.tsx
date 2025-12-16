'use client';

/**
 * Collection Breadcrumbs Component
 * 
 * Displays breadcrumbs for collection pages
 * Uses proper category names from mapping
 */

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface CollectionBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

export function CollectionBreadcrumbs({ breadcrumbs, className = '' }: CollectionBreadcrumbsProps) {
  return (
    <nav className={`text-sm text-gray-600 mb-6 ${className}`} aria-label="Breadcrumb">
      <Link href="/" className="hover:underline hover:text-primary transition-colors">
        Home
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.href}>
          {' / '}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          ) : (
            <Link 
              href={crumb.href} 
              className="hover:underline hover:text-primary transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}




