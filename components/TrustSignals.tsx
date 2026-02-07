'use client';

import { useRef, useEffect } from 'react';

/**
 * Trust Signals Component
 * 
 * Displays trust badges with icons
 * Features:
 * - 5 trust signals
 * - Carousel on mobile/tablet with navigation arrows
 * - Grid layout on desktop
 * - Clean, minimal design
 */

const trustSignals = [
  {
    id: 'brands',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'World Leading Brands',
    description: 'Premium equestrian brands',
  },
  {
    id: 'reviews',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: '5 Star Reviews',
    description: 'Trusted by thousands',
  },
  {
    id: 'support',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Expert Support',
    description: 'Knowledgeable team ready to help',
  },
  {
    id: 'shipping',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'Free Shipping',
    description: 'On all orders',
  },
  {
    id: 'returns',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: '30 Day Returns',
    description: 'Easy returns & exchanges',
  },
];

export function TrustSignals() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to center item (5 Star Reviews) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const itemWidth = container.scrollWidth / (trustSignals.length + 2); // +2 for spacers
      const scrollPosition = itemWidth * 1.5; // Position to show second item (index 1) centered
      container.scrollLeft = scrollPosition;
    }
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Desktop: Grid Layout (5 columns) */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-4">
          {trustSignals.map((signal) => (
            <div
              key={signal.id}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-2 text-primary">
                {signal.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                {signal.title}
              </h3>
              <p className="text-xs text-gray-600">
                {signal.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile/Tablet: Carousel */}
        <div className="lg:hidden relative -mx-4">
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-4"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Spacer for first item centering */}
            <div className="flex-shrink-0 w-[calc(50vw-50%+1rem)] sm:w-[calc(50vw-25%+0.75rem)]" />
            
            {trustSignals.map((signal) => (
              <div
                key={signal.id}
                className="flex-shrink-0 w-[calc(100vw-8rem)] sm:w-[calc(50vw-4rem)] flex flex-col items-center text-center"
                style={{ scrollSnapAlign: 'center' }}
              >
                <div className="mb-2 text-primary">
                  {signal.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                  {signal.title}
                </h3>
                <p className="text-xs text-gray-600">
                  {signal.description}
                </p>
              </div>
            ))}
            
            {/* Spacer for last item centering */}
            <div className="flex-shrink-0 w-[calc(50vw-50%+1rem)] sm:w-[calc(50vw-25%+0.75rem)]" />
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-gray-300 shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all"
          >
            <svg className="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10.957 12l3.47-3.47a.75.75 0 10-1.06-1.06L9.72 11.116a1.25 1.25 0 000 1.768l3.646 3.646a.75.75 0 001.06-1.06L10.958 12" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white border border-gray-300 shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all"
          >
            <svg className="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M13.043 12l-3.47 3.47a.75.75 0 101.06 1.06l3.647-3.646a1.25 1.25 0 000-1.768L10.634 7.47a.75.75 0 00-1.06 1.06L13.042 12" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
