'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type TabId = 'description' | 'sizing';

interface DescriptionSizingTabsProps {
  description: ReactNode;
  sizing: ReactNode;
  className?: string;
  /** Optional compact chrome for buy-box-adjacent layouts */
  compact?: boolean;
}

/**
 * Description (default) | Sizing Information tabs.
 * Hash #sizing opens the sizing tab (used by buy-box Size chart link).
 */
export function DescriptionSizingTabs({
  description,
  sizing,
  className = '',
  compact = false,
}: DescriptionSizingTabsProps) {
  const [active, setActive] = useState<TabId>('description');
  const sizingPanelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    const applyHash = () => {
      if (typeof window === 'undefined') return;
      if (window.location.hash.replace(/^#/, '') === 'sizing') {
        setActive('sizing');
        requestAnimationFrame(() => {
          sizingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const selectTab = (tab: TabId) => {
    setActive(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'sizing') {
      url.hash = 'sizing';
    } else {
      url.hash = '';
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const tabClass = (tab: TabId) => {
    const isActive = active === tab;
    return [
      'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
      isActive
        ? 'border-action text-action'
        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
    ].join(' ');
  };

  return (
    <div
      id="sizing"
      className={['bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      ref={sizingPanelRef}
    >
      <div
        className={[
          'flex gap-1 border-b border-gray-200 px-2 sm:px-4',
          compact ? 'bg-gray-50/80' : 'bg-white',
        ].join(' ')}
        role="tablist"
        aria-label="Product information"
      >
        <button
          type="button"
          role="tab"
          id={`${baseId}-tab-description`}
          aria-selected={active === 'description'}
          aria-controls={`${baseId}-panel-description`}
          className={tabClass('description')}
          onClick={() => selectTab('description')}
        >
          Description
        </button>
        <button
          type="button"
          role="tab"
          id={`${baseId}-tab-sizing`}
          aria-selected={active === 'sizing'}
          aria-controls={`${baseId}-panel-sizing`}
          className={tabClass('sizing')}
          onClick={() => selectTab('sizing')}
        >
          Sizing Information
        </button>
      </div>

      <div
        id={`${baseId}-panel-description`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-description`}
        hidden={active !== 'description'}
        className={compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8'}
      >
        {description}
      </div>

      <div
        id={`${baseId}-panel-sizing`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-sizing`}
        hidden={active !== 'sizing'}
        className={compact ? 'p-4 sm:p-6' : 'p-6 sm:p-8'}
      >
        {sizing}
      </div>
    </div>
  );
}
