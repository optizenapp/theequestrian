'use client';

import Link from 'next/link';

interface SubcategoryItem {
  handle: string;
  label: string;
  count: number;
}

interface MegaMenuProps {
  categoryLabel: string;
  subcategories: SubcategoryItem[];
  onClose?: () => void;
}

/**
 * Mega Menu Component
 * 
 * Modern ecommerce mega menu inspired by Back Market
 * Features:
 * - Full-width dropdown
 * - Grid layout with subcategories from mapping
 * - Clean, professional design
 * - Smooth animations
 */
export function MegaMenu({
  categoryLabel,
  subcategories,
  onClose,
}: MegaMenuProps) {
  const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const displaySubcategories = subcategories.slice(0, 8);

  if (displaySubcategories.length === 0) {
    return null;
  }

  return (
    <div className="w-screen max-w-7xl bg-surface border border-gray-100 rounded-3xl shadow-2xl mt-2 overflow-hidden relative">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10 text-gray-600"
        aria-label="Close menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-1">Featured</p>
            <h3 className="text-2xl font-semibold text-gray-900">
              {categoryLabel}
            </h3>
          </div>
          <Link
            href={`/${categoryHandle}`}
            className="text-sm font-semibold text-action hover:underline transition"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Placeholder hero tile */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-pink-100 via-white to-purple-100 h-[220px] overflow-hidden">
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(29,196,198,0.4),_transparent_60%)] flex flex-col justify-end p-6">
                <p className="text-white font-semibold text-lg">Our Spotlight Collection</p>
                <p className="text-sm text-white/80">Premium gear curated weekly.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest">
                    Img
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Fresh Drops</p>
                    <p className="text-xs text-gray-500">Trending now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subcategory list */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {displaySubcategories.map((subcategory) => {
              const href = `/${categoryHandle}/${subcategory.handle}`;

              return (
                <Link
                  key={subcategory.handle}
                  href={href}
                  className="group rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">{subcategory.label}</h4>
                    <span className="opacity-60 transition-opacity group-hover:opacity-100">→</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    {subcategory.count > 0
                      ? `${subcategory.count} ${subcategory.count === 1 ? 'item' : 'items'}`
                      : 'Discover more'}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
