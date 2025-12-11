'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MegaMenuWrapper } from './MegaMenuWrapper';
import { TOP_LEVEL_MENU, getShopifyCollectionHandle, shouldShowMegaMenu } from '@/lib/navigation/menu-structure';
import type { CollectionWithParent } from '@/types/shopify';

/**
 * Header Navigation Component with Mega Menu
 * 
 * Shows fixed top-level menu items:
 * - Home
 * - Rider
 * - Horse
 * - Farm & Stable
 * - Contact
 * 
 * Mega menus open for categories that have Shopify collections
 */

export function HeaderNavigation() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isHoveringRef.current = true;
    
    // Add delay before opening to prevent accidental triggers and allow immediate clicks
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
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <nav className="flex items-center space-x-1">
        {TOP_LEVEL_MENU.map((item) => {
          const isActive = activeMenu === item.label;
          const showMegaMenu = shouldShowMegaMenu(item.label);
          const isHighlight = item.isHighlight;

          return (
            <div
              key={item.label}
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                href={item.href}
                onClick={() => setActiveMenu(null)}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-full flex items-center gap-2 ${
                  isActive
                    ? 'text-action bg-gray-100'
                    : isHighlight
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-action hover:bg-gray-50'
                }`}
                aria-haspopup={showMegaMenu ? 'true' : undefined}
                aria-expanded={isActive ? 'true' : 'false'}
              >
                {isHighlight && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Mega Menu - Centered on screen, outside nav items */}
      {activeMenu && (
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
            <MegaMenuWrapper 
              categoryLabel={activeMenu} 
              onClose={() => setActiveMenu(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
