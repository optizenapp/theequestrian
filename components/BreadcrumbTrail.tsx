'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { resolveCollectionDisplayLabel } from '@/lib/seo/pill-anchor-text';

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

interface BreadcrumbTrailProps {
  items: BreadcrumbCrumb[];
  className?: string;
  ariaLabel?: string;
}

const MOBILE_WINDOW_SIZE = 2;

/** Final pass for breadcrumb labels (safety net after mapping resolution). */
export function formatBreadcrumbLabel(label: string): string {
  return resolveCollectionDisplayLabel(label);
}

function BreadcrumbSeparator() {
  return <span className="mx-1.5 text-gray-400 shrink-0">/</span>;
}

function CrumbLink({ crumb }: { crumb: BreadcrumbCrumb }) {
  const label = formatBreadcrumbLabel(crumb.label);

  if (!crumb.href) {
    return <span className="text-gray-900 font-medium truncate">{label}</span>;
  }

  return (
    <Link href={crumb.href} className="hover:text-action capitalize transition-colors truncate">
      {label}
    </Link>
  );
}

export function BreadcrumbTrail({
  items,
  className = '',
  ariaLabel = 'Breadcrumb',
}: BreadcrumbTrailProps) {
  const [startIndex, setStartIndex] = useState(() =>
    Math.max(0, items.length - MOBILE_WINDOW_SIZE)
  );

  const maxStart = Math.max(0, items.length - MOBILE_WINDOW_SIZE);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex < maxStart;
  const mobileWindow = useMemo(
    () => items.slice(startIndex, startIndex + MOBILE_WINDOW_SIZE),
    [items, startIndex]
  );

  if (items.length === 0) return null;

  return (
    <div className={className}>
      {/* Mobile: sliding window with prev/next */}
      <nav
        className="flex items-center gap-1 text-sm text-gray-500 md:hidden"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          onClick={() => setStartIndex((i) => Math.max(0, i - 1))}
          disabled={!canGoPrev}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-25"
          aria-label="Show earlier breadcrumbs"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          {mobileWindow.map((crumb, index) => (
            <span key={`${crumb.href ?? 'current'}-${startIndex + index}`} className="flex min-w-0 items-center">
              {index > 0 && <BreadcrumbSeparator />}
              <CrumbLink crumb={crumb} />
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStartIndex((i) => Math.min(maxStart, i + 1))}
          disabled={!canGoNext}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-25"
          aria-label="Show later breadcrumbs"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>

      {/* Full trail for SEO + screen readers on mobile (hidden visually) */}
      <nav className="sr-only md:hidden" aria-label={`${ariaLabel} full path`}>
        {items.map((crumb, index) => (
          <span key={`full-${crumb.href ?? 'current'}-${index}`}>
            {index > 0 && ' / '}
            {crumb.href ? <Link href={crumb.href}>{formatBreadcrumbLabel(crumb.label)}</Link> : formatBreadcrumbLabel(crumb.label)}
          </span>
        ))}
      </nav>

      {/* Desktop: full trail */}
      <nav
        className="hidden md:flex md:flex-wrap md:items-center gap-y-1 text-sm text-gray-500"
        aria-label={ariaLabel}
      >
        {items.map((crumb, index) => (
          <span key={`${crumb.href ?? 'current'}-${index}`} className="flex items-center min-w-0">
            {index > 0 && <BreadcrumbSeparator />}
            <CrumbLink crumb={crumb} />
          </span>
        ))}
      </nav>
    </div>
  );
}
