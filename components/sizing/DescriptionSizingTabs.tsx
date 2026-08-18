'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type TabId = 'description' | 'sizing' | 'specifications';

interface DescriptionSizingTabsProps {
  description: ReactNode;
  sizing?: ReactNode;
  specifications?: ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Description (default) | Sizing Information | Specifications.
 * Hash #sizing / #specifications opens those tabs.
 */
export function DescriptionSizingTabs({
  description,
  sizing,
  specifications,
  className = '',
  compact = false,
}: DescriptionSizingTabsProps) {
  const tabs = [
    { id: 'description' as const, label: 'Description', content: description },
    ...(sizing
      ? [{ id: 'sizing' as const, label: 'Sizing Information', content: sizing }]
      : []),
    ...(specifications
      ? [{ id: 'specifications' as const, label: 'Specifications', content: specifications }]
      : []),
  ];

  const [active, setActive] = useState<TabId>('description');
  const rootRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const panelPad = compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8';

  const hasSizing = Boolean(sizing);
  const hasSpecs = Boolean(specifications);

  useEffect(() => {
    const applyHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === 'sizing' && hasSizing) {
        setActive('sizing');
        requestAnimationFrame(() => {
          rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      if (hash === 'specifications' && hasSpecs) setActive('specifications');
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [hasSizing, hasSpecs]);

  const selectTab = (tab: TabId) => {
    setActive(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.hash = tab === 'description' ? '' : tab;
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    if (tab === 'sizing') {
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <div
      id={hasSizing ? 'sizing' : hasSpecs ? 'specifications' : undefined}
      className={['bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      ref={rootRef}
    >
      <div
        className={[
          'flex gap-1 overflow-x-auto border-b border-gray-200 px-2 sm:px-4',
          compact ? 'bg-gray-50/80' : 'bg-white',
        ].join(' ')}
        role="tablist"
        aria-label="Product information"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-action text-action'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
              ].join(' ')}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
          className={panelPad}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
