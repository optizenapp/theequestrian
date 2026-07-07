'use client';

/**
 * Collection Breadcrumbs Component
 *
 * Displays breadcrumbs for collection pages with a compact mobile carousel.
 */

import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface CollectionBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

export function CollectionBreadcrumbs({ breadcrumbs, className = '' }: CollectionBreadcrumbsProps) {
  const items = [
    { label: 'Home', href: '/' },
    ...breadcrumbs.map((crumb, index) =>
      index === breadcrumbs.length - 1
        ? { label: crumb.label }
        : { label: crumb.label, href: crumb.href }
    ),
  ];

  return <BreadcrumbTrail items={items} className={`mb-6 ${className}`} />;
}
