'use client';

import { useEffect, useRef, useState } from 'react';

interface ProductDescriptionProps {
  html: string;
  productTitle: string;
  collapsedHeight?: number;
  className?: string;
  accentBorder?: boolean;
}

export function ProductDescription({
  html,
  productTitle,
  collapsedHeight = 220,
  className = '',
  accentBorder = false,
}: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > collapsedHeight);
  }, [html, collapsedHeight]);

  return (
    <div className={`bg-surface rounded-2xl p-8 shadow-sm ${accentBorder ? 'border border-black' : 'border border-gray-100'} space-y-4 ${className}`.trim()}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{productTitle} Description</h2>

      <div className="relative">
        <div
          ref={contentRef}
          className="product-description prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-action hover:prose-a:text-action-hover prose-strong:text-gray-900 prose-ul:list-disc prose-ul:pl-5 transition-[max-height] duration-300 ease-in-out"
          style={{
            maxHeight: expanded ? 'none' : `${collapsedHeight}px`,
            overflow: expanded ? 'visible' : 'hidden',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {!expanded && overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        )}
      </div>

      {overflowing && (
        <button
          className="text-sm font-semibold text-action transition-colors hover:text-action-hover"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

