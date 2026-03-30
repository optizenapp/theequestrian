'use client';

/**
 * Collection Description Component
 *
 * - If HTML contains `<!--read-more-trigger-->`, shows content before the marker
 *   with "Read more"; content after the marker stays in the DOM (hidden until
 *   expanded) so the full markup is present in the page HTML for crawlers.
 * - Otherwise: legacy line-clamp (3–4 lines) + Read more for the whole block.
 */

import Link from 'next/link';
import { useState } from 'react';

const READ_MORE_TRIGGER = /<!--\s*read-more-trigger\s*-->/i;

/** Body copy is gray-700; without this, <a> inside CMS HTML looks like plain text */
const descriptionProseClass =
  'text-gray-700 leading-relaxed [&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary-dark';

function splitReadMore(html: string): { before: string; after: string } | null {
  const parts = html.split(READ_MORE_TRIGGER);
  if (parts.length !== 2) return null;
  const before = parts[0].trim();
  const after = parts[1].trim();
  if (!before || !after) return null;
  return { before, after };
}

interface CollectionDescriptionProps {
  description: string;
  /** Renders a real Next.js link to parent category (visible above Read more). Avoids stale ISR HTML for parent links. */
  parentCollectionLink?: { href: string; label: string } | null;
}

const linkClassName =
  'font-medium text-primary underline underline-offset-2 hover:text-primary-dark';

export function CollectionDescription({
  description,
  parentCollectionLink,
}: CollectionDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  const split = splitReadMore(description);

  if (split) {
    return (
      <div className="mb-6">
        <div
          className={descriptionProseClass}
          dangerouslySetInnerHTML={{ __html: split.before }}
        />
        {parentCollectionLink ? (
          <p className={`${descriptionProseClass} mt-2`}>
            They are part of our wider{' '}
            <Link href={parentCollectionLink.href} className={linkClassName}>
              {parentCollectionLink.label}
            </Link>{' '}
            collection.
          </p>
        ) : null}
        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="mt-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
          >
            Read more
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
        <div
          className={`${descriptionProseClass} space-y-4 ${isExpanded ? 'mt-4 block' : 'hidden'}`}
          dangerouslySetInnerHTML={{ __html: split.after }}
          aria-hidden={!isExpanded}
        />
        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="mt-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
          >
            Read less
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div
        className={`${descriptionProseClass} ${isExpanded ? '' : 'line-clamp-4'}`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      {parentCollectionLink ? (
        <p className={`${descriptionProseClass} mt-2`}>
          They are part of our wider{' '}
          <Link href={parentCollectionLink.href} className={linkClassName}>
            {parentCollectionLink.label}
          </Link>{' '}
          collection.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
      >
        {isExpanded ? (
          <>
            Read less
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        ) : (
          <>
            Read more
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
