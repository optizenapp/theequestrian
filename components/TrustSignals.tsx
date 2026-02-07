'use client';

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

  return (
    <section className="py-4 md:py-6 overflow-hidden">
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

        {/* Mobile/Tablet: Horizontal Scroll Grid */}
        <div className="lg:hidden relative pb-4">
          {/* Left scroll indicator */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none pl-1">
            <div className="w-5 h-5 rounded-full bg-white/90 shadow-md flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>
          
          {/* Scrollable container */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 justify-start px-8">
              {trustSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex flex-col items-center text-center flex-shrink-0 w-[calc(50vw-3.5rem)]"
                >
                  <div className="mb-1.5 text-primary scale-75">
                    {signal.icon}
                  </div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-0.5 whitespace-normal leading-tight">
                    {signal.title}
                  </h3>
                  <p className="text-[10px] text-gray-600 whitespace-normal leading-tight">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right scroll indicator */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none pr-1">
            <div className="w-5 h-5 rounded-full bg-white/90 shadow-md flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
