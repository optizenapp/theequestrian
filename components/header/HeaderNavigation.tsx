'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MegaMenuWrapper, prefetchMegaMenuData } from './MegaMenuWrapper';
import {
  TOP_LEVEL_MENU,
  shouldShowMegaMenu,
  isNavItemActive,
} from '@/lib/navigation/menu-structure';
import type { TopLevelMenuItem } from '@/lib/navigation/menu-structure';

function NavChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function getNavLinkClassName(item: TopLevelMenuItem, isActive: boolean, isOpen: boolean): string {
  if (item.isHighlight) {
    return `px-4 py-2 text-sm font-semibold transition-colors rounded-full ${
      isActive ? 'text-primary bg-primary/15' : 'text-primary bg-primary/10 hover:bg-primary/15'
    }`;
  }

  return `px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 border-b-2 ${
    isActive || isOpen
      ? 'text-action border-action'
      : 'text-gray-600 border-transparent hover:text-action hover:border-gray-200'
  }`;
}

export function HeaderNavigation() {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isHoveringRef.current = true;

    if (shouldShowMegaMenu(label)) {
      void prefetchMegaMenuData(label);
    }

    timeoutRef.current = setTimeout(() => {
      if (isHoveringRef.current && shouldShowMegaMenu(label)) {
        setActiveMenu(label);
      }
    }, 150);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    timeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setActiveMenu(null);
      }
    }, 150);
  };

  useEffect(() => {
    const prefetchAll = async () => {
      for (const item of TOP_LEVEL_MENU) {
        if (shouldShowMegaMenu(item.label)) {
          await prefetchMegaMenuData(item.label);
        }
      }
    };

    const timer = setTimeout(() => {
      void prefetchAll();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const renderNavItem = (item: TopLevelMenuItem) => {
    const isOpen = activeMenu === item.label;
    const isActive = isNavItemActive(pathname, item);
    const hasMegaMenu = shouldShowMegaMenu(item.label);

    return (
      <div
        key={item.label}
        onMouseEnter={() => handleMouseEnter(item.label)}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          href={item.href}
          onClick={() => setActiveMenu(null)}
          className={`${item.handle === 'sale' ? 'ml-3' : ''} ${getNavLinkClassName(item, isActive, isOpen)}`}
          aria-haspopup={hasMegaMenu ? 'true' : undefined}
          aria-expanded={isOpen ? 'true' : 'false'}
        >
          {item.label}
          {item.showChevron && <NavChevron open={isOpen} />}
        </Link>
      </div>
    );
  };

  return (
    <div className="relative">
      <nav className="flex items-center justify-center gap-0.5" aria-label="Main navigation">
        {TOP_LEVEL_MENU.map(renderNavItem)}
      </nav>

      {activeMenu && shouldShowMegaMenu(activeMenu) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-[100]"
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            isHoveringRef.current = true;
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-[calc(100vw-2rem)] max-w-6xl">
            <MegaMenuWrapper categoryLabel={activeMenu} onClose={() => setActiveMenu(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
