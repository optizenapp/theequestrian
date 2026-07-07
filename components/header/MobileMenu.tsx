'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import {
  SHOP_MENU,
  UTILITY_MENU,
  MOBILE_SECONDARY_LINKS,
  isNavItemActive,
} from '@/lib/navigation/menu-structure';
import type { TopLevelMenuItem } from '@/lib/navigation/menu-structure';

interface SubcategoryItem {
  handle: string;
  label: string;
}

const subcategoryCache = new Map<string, SubcategoryItem[]>();

async function fetchSubcategories(categoryHandle: string): Promise<SubcategoryItem[]> {
  if (subcategoryCache.has(categoryHandle)) {
    return subcategoryCache.get(categoryHandle) ?? [];
  }

  try {
    const response = await fetch(`/api/mapping/subcategories-with-images?category=${categoryHandle}`);
    if (!response.ok) return [];
    const data = await response.json();
    const items = (data.subcategories ?? []) as SubcategoryItem[];
    subcategoryCache.set(categoryHandle, items);
    return items;
  } catch {
    return [];
  }
}

function MobileNavLink({
  item,
  onNavigate,
}: {
  item: TopLevelMenuItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = isNavItemActive(pathname, item);
  const hasSubmenu = !!item.shopifyCollectionHandle;
  const [expanded, setExpanded] = useState(false);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpanded = async () => {
    if (!hasSubmenu) return;

    const next = !expanded;
    setExpanded(next);

    if (next && subcategories.length === 0 && item.shopifyCollectionHandle) {
      setLoading(true);
      const items = await fetchSubcategories(item.shopifyCollectionHandle);
      setSubcategories(items);
      setLoading(false);
    }
  };

  if (!hasSubmenu) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`block px-4 py-3 text-base font-medium rounded-md transition-colors ${
            item.isHighlight
              ? 'text-primary bg-primary/10'
              : isActive
                ? 'text-action bg-gray-50'
                : 'text-gray-700 hover:text-action hover:bg-gray-50'
          }`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`flex-1 px-4 py-3 text-base font-medium rounded-l-md transition-colors ${
            isActive ? 'text-action bg-gray-50' : 'text-gray-700 hover:text-action hover:bg-gray-50'
          }`}
        >
          {item.label}
        </Link>
        <button
          type="button"
          onClick={() => void toggleExpanded()}
          className="px-4 py-3 text-gray-500 hover:text-action rounded-r-md"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label} subcategories`}
        >
          <svg
            className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {expanded && (
        <ul className="ml-4 mt-1 mb-2 space-y-1 border-l border-gray-100 pl-2">
          {loading && (
            <li className="px-4 py-2 text-sm text-gray-400">Loading…</li>
          )}
          {!loading &&
            subcategories.map((sub) => (
              <li key={sub.handle}>
                <Link
                  href={`${item.href}/${sub.handle}`}
                  onClick={onNavigate}
                  className="block px-4 py-2 text-sm text-gray-600 hover:text-action rounded-md"
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          {!loading && subcategories.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-400">No subcategories</li>
          )}
        </ul>
      )}
    </li>
  );
}

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:text-primary transition-colors"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
          onClick={closeMenu}
        >
          <div
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-lg font-semibold">Menu</span>
              <button
                onClick={closeMenu}
                className="p-2 text-gray-700 hover:text-primary transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <SearchBar />
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Shop</p>
              <ul className="space-y-1 mb-6">
                {SHOP_MENU.map((item) => (
                  <MobileNavLink key={item.label} item={item} onNavigate={closeMenu} />
                ))}
              </ul>

              <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Discover</p>
              <ul className="space-y-1 mb-6">
                {UTILITY_MENU.map((item) => (
                  <MobileNavLink key={item.label} item={item} onNavigate={closeMenu} />
                ))}
              </ul>

              <ul className="space-y-1 pt-4 border-t border-gray-100">
                {MOBILE_SECONDARY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className="block px-4 py-3 text-sm font-medium text-gray-600 hover:text-action hover:bg-gray-50 rounded-md"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
