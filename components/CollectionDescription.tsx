'use client';

/**
 * Collection Description Component
 * 
 * Displays collection description with expandable "Read more" functionality
 * Shows 3-4 lines initially, expands to show full content
 */

import { useState } from 'react';

interface CollectionDescriptionProps {
  description: string;
}

export function CollectionDescription({ description }: CollectionDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) return null;

  return (
    <div className="mb-6">
      <div
        className={`text-gray-700 leading-relaxed ${
          isExpanded ? '' : 'line-clamp-4'
        }`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      <button
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





