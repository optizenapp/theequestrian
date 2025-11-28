import { HeaderNavigation } from './HeaderNavigation';
import { HeaderTopBar } from './HeaderTopBar';
import { MobileMenu } from './MobileMenu';
import { Logo } from '../Logo';
import { TOP_LEVEL_MENU } from '@/lib/navigation/menu-structure';

/**
 * Main Header Component
 * 
 * Modern ecommerce header with mega menu
 * Back Market inspired design with brand colors
 */

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top Bar - Promotional message */}
      <HeaderTopBar />

      {/* Main Header */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Logo variant="full" className="h-8" />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:flex-1 lg:justify-center">
              <HeaderNavigation />
            </div>

            {/* Right Side - Search, Cart, Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Search Icon - Placeholder */}
              <button
                className="p-2 text-gray-700 hover:text-primary transition-colors"
                aria-label="Search"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              {/* Cart Icon - Placeholder */}
              <button
                className="p-2 text-gray-700 hover:text-primary transition-colors relative"
                aria-label="Shopping cart"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {/* Cart count badge - placeholder */}
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-primary rounded-full">
                  0
                </span>
              </button>

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
