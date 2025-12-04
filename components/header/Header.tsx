'use client';

import { HeaderNavigation } from './HeaderNavigation';
import { HeaderTopBar } from './HeaderTopBar';
import { MobileMenu } from './MobileMenu';
import { Logo } from '../Logo';
import Link from 'next/link';
import { useCart } from '@/components/cart/cart-context';

/**
 * Main Header Component
 * 
 * Redesigned to match Back Market's layout:
 * - Prominent Search Bar
 * - Clean White Background
 * - Clear Action Icons
 */
export function Header() {
  const { cart } = useCart();
  const itemCount = cart?.totalQuantity || 0;

  return (
    <header className="sticky top-0 z-50 bg-surface shadow-sm">
      <div className="border-b border-gray-100 py-4">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            {/* 1. Logo */}
            <div className="flex-shrink-0">
              <Logo variant="full" className="h-8 w-auto" />
            </div>

            {/* 2. Search Bar - Centered */}
            <div className="flex flex-1 justify-center">
              <div className="hidden lg:block w-full max-w-2xl">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="What are you looking for?"
                    className="w-full rounded-full border border-gray-300 py-2.5 pl-4 pr-12 text-sm focus:border-action focus:outline-none focus:ring-1 focus:ring-action bg-gray-50"
                  />
                  <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:text-action"
                    aria-label="Search"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Right Actions */}
            <div className="flex items-center space-x-6">
              {/* Help/About - Optional */}
              <Link href="/about" className="hidden lg:block text-sm font-medium text-gray-600 hover:text-action">
                About us
              </Link>

              {/* User / Login */}
              <button className="hidden lg:flex items-center gap-2 text-gray-700 hover:text-action">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden xl:inline text-sm font-medium">Log in</span>
              </button>

              {/* Cart */}
              <Link href="/cart" className="flex items-center gap-2 text-gray-700 hover:text-action relative">
                <div className="relative">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-action text-[11px] font-bold text-white z-10">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-sm font-medium">Cart</span>
              </Link>

              {/* Mobile Menu Toggle */}
              <div className="lg:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Navigation - Categories */}
      <div className="hidden lg:flex border-b border-gray-100 bg-surface py-3">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex justify-center">
          <HeaderNavigation />
        </div>
      </div>

      <HeaderTopBar />
    </header>
  );
}
