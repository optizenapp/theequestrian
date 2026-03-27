'use client';

/**
 * Collection Description Component
 *
 * - If HTML contains `<!--read-more-trigger-->`, shows content before the marker
 *   with "Read more"; content after the marker stays in the DOM (hidden until
 *   expanded) so the full markup is present in the page HTML for crawlers.
 * - Otherwise: legacy line-clamp (3–4 lines) + Read more for the whole block.
 */

import { useState } from 'react';

const READ_MORE_TRIGGER = /<!--\s*read-more-trigger\s*-->/i;

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
}

export function CollectionDescription({ description }: CollectionDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  const split = splitReadMore(description);

  if (split) {
    return (
      <div className="mb-6">
        <div
          className="text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: split.before }}
        />
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
          className={`text-gray-700 leading-relaxed space-y-4 ${isExpanded ? 'mt-4 block' : 'hidden'}`}
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
        className={`text-gray-700 leading-relaxed ${
          isExpanded ? '' : 'line-clamp-4'
        }`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
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
