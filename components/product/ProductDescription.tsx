'use client';

import { useEffect, useRef, useState } from 'react';

interface ProductDescriptionProps {
  html: string;
  productTitle: string;
  collapsedHeight?: number;
  className?: string;
  accentBorder?: boolean;
  /** Stretch the container to fill its parent (e.g. a grid row) and clamp content to that height. */
  fillHeight?: boolean;
}

export function ProductDescription({
  html,
  productTitle,
  collapsedHeight = 220,
  className = '',
  accentBorder = false,
  fillHeight = false,
}: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      if (fillHeight) {
        setOverflowing(el.scrollHeight > el.clientHeight + 1);
      } else {
        setOverflowing(el.scrollHeight > collapsedHeight);
      }
    };

    measure();

    if (fillHeight && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [html, collapsedHeight, fillHeight, expanded]);

  const wrapperClass = [
    'bg-surface rounded-2xl p-8 shadow-sm',
    accentBorder ? 'border border-black' : 'border border-gray-100',
    fillHeight ? 'flex h-full flex-col' : 'space-y-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = [
    'product-description prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-action hover:prose-a:text-action-hover prose-strong:text-gray-900 prose-ul:list-disc prose-ul:pl-5 transition-[max-height] duration-300 ease-in-out',
    fillHeight && !expanded ? 'flex-1 min-h-0' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contentStyle = fillHeight
    ? { overflow: expanded ? ('visible' as const) : ('hidden' as const) }
    : {
        maxHeight: expanded ? 'none' : `${collapsedHeight}px`,
        overflow: expanded ? ('visible' as const) : ('hidden' as const),
      };

  return (
    <div className={wrapperClass}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex-shrink-0">
        {productTitle} Description
      </h2>

      <div
        className={`relative ${fillHeight ? 'flex flex-1 min-h-0 flex-col' : ''}`.trim()}
      >
        <div
          ref={contentRef}
          className={contentClass}
          style={contentStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {!expanded && overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        )}
      </div>

      {overflowing && (
        <button
          type="button"
          className={`text-sm font-semibold text-action transition-colors hover:text-action-hover ${
            fillHeight ? 'mt-4 self-start' : ''
          }`.trim()}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
