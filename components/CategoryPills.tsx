'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

interface CategoryPill {
  handle: string;
  label: string;
  count?: number; // Optional product count
}

interface CategoryPillsProps {
  categories: CategoryPill[];
  basePath: string;
}

export function CategoryPills({ categories, basePath }: CategoryPillsProps) {
  // Filter out categories with 0 products (only show categories that have products)
  const visibleCategories = categories.filter(cat => {
    // If count is not provided, assume it has products (backward compatibility)
    // If count is provided and is 0, hide it
    return cat.count === undefined || cat.count > 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [visibleCategories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' 
        ? scrollRef.current.scrollLeft - scrollAmount
        : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  // Don't render if no visible categories
  if (visibleCategories.length === 0) return null;

  return (
    <div className="relative mb-6 flex items-center gap-3">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Scroll left"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Pills Container */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex-1 overflow-x-auto scrollbar-hide"
      >
        <div className="flex gap-3 pb-2">
          {visibleCategories.map((category) => (
            <Link
              key={category.handle}
              href={`${basePath}/${category.handle}`}
              className="inline-flex items-center px-5 py-2.5 bg-white hover:bg-primary hover:text-white rounded-full text-sm font-medium text-gray-900 whitespace-nowrap transition-all border-2 border-gray-300 hover:border-primary shadow-sm hover:shadow-md"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Scroll right"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

