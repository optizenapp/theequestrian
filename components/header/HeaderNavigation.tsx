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
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (shouldShowMegaMenu(label)) {
      setActiveMenu(label);
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    timeoutRef.current = setTimeout(() => {
      if (!isHovering) {
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
    <nav className="flex items-center space-x-1">
      {TOP_LEVEL_MENU.map((item) => {
        const isActive = activeMenu === item.label;
        const showMegaMenu = shouldShowMegaMenu(item.label);

        return (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => handleMouseEnter(item.label)}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              href={item.href}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive
                  ? 'text-primary bg-primary-pale'
                  : 'text-gray-700 hover:text-primary hover:bg-gray-50'
              }`}
              aria-haspopup={showMegaMenu ? 'true' : undefined}
              aria-expanded={isActive ? 'true' : 'false'}
            >
              {item.label}
            </Link>

            {/* Mega Menu */}
            {showMegaMenu && isActive && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full pt-2"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={handleMouseLeave}
              >
                <MegaMenuWrapper categoryLabel={item.label} />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
