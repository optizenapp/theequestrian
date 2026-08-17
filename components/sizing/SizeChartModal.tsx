'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';

interface SizeChartModalProps {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  sizing: ResolvedBrandSizing;
}

/**
 * Size chart dialog opened from the buy-box “Size Chart” link (beside size options).
 */
export function SizeChartModal({ open, onClose, productTitle, sizing }: SizeChartModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(960px,calc(100vw-1.5rem))] max-h-[90vh] p-0 rounded-2xl border-0 bg-white shadow-2xl backdrop:bg-black/60 open:flex open:flex-col"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 shrink-0">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold text-gray-900 truncate">
            {productTitle}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Size chart</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Close size chart"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-5 flex-1 min-h-0">
        <BrandSizingPanel sizing={{ ...sizing, sizingPagePath: sizing.sizingPagePath }} />
      </div>
    </dialog>
  );
}

export function SizeChartTriggerButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 text-sm font-semibold text-action hover:text-action-hover',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      Size Chart
    </button>
  );
}
