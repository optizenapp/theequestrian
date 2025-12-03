'use client';

import { useMemo, useRef, useState } from 'react';

const DEAL_IMAGE =
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80';

const categories = [
  {
    label: 'Riding Apparel',
    image: 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Saddles & Tack',
    image: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Boots & Footwear',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Horse Care',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Helmets & Safety',
    image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Stable Equipment',
    image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Competition Gear',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
  },
];

const deals = [
  {
    title: 'Professional Riding Jacket',
    price: 'From $399',
    saving: '$150 off new',
    detail: 'Premium breathable fabric with competition-grade fit and stretch panels.',
  },
  {
    title: 'English Saddle - Pro Series',
    price: 'From $1,899',
    saving: '$600 off new',
    detail: 'Hand-crafted leather with ergonomic design for maximum comfort.',
  },
  {
    title: 'Tall Riding Boots',
    price: 'From $349',
    saving: '$120 off new',
    detail: 'Full-grain leather boots with reinforced heel and ankle support.',
  },
  {
    title: 'Premium Grooming Kit',
    price: 'From $129',
    saving: '$50 off new',
    detail: 'Complete set with brushes, hoof pick, and organic grooming products.',
  },
  {
    title: 'Safety Riding Helmet',
    price: 'From $249',
    saving: '$80 off new',
    detail: 'ASTM/SEI certified with advanced ventilation and adjustable fit.',
  },
  {
    title: 'Portable Water Trough',
    price: 'From $189',
    saving: '$60 off new',
    detail: 'Durable, collapsible design perfect for shows and trail riding.',
  },
  {
    title: 'Show Jumping Set',
    price: 'From $2,499',
    saving: '$800 off new',
    detail: 'Professional-grade jumps with adjustable heights and safety cups.',
  },
];


export function BestDealsSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeDeal = useMemo(() => deals[activeIndex], [activeIndex]);

  const next = () => setActiveIndex((prev) => (prev + 1) % deals.length);
  const prev = () =>
    setActiveIndex((prev) => (prev - 1 + deals.length) % deals.length);

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
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div
              className="w-full md:basis-[440px] md:flex-shrink-0 h-64 md:h-[580px] bg-cover bg-center"
              style={{ backgroundImage: `url(${DEAL_IMAGE})` }}
            />
            <div className="flex flex-col gap-6 p-6 md:flex-1 md:p-8 lg:p-10 overflow-hidden">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Shop our best deals</p>
                <h3 className="text-2xl lg:text-3xl font-semibold text-gray-900">Limited-time highlights</h3>
                <p className="text-gray-600 text-sm lg:text-base">
                  Scroll through our rotating list of curated deals, then jump to the product to claim it.
                </p>
              </div>

              <div className="space-y-4 overflow-hidden">
                <div className="relative">
                  <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
                  >
                    {categories.map((category, idx) => (
                      <button
                        key={category.label}
                        onClick={() => setActiveIndex(idx)}
                        className="group flex flex-col items-center gap-2 outline-none flex-shrink-0"
                        type="button"
                      >
                        <div
                          className={`relative h-20 w-28 overflow-hidden rounded-lg border-2 bg-gray-50 transition-all ${
                            idx === activeIndex
                              ? 'border-gray-900 ring-2 ring-gray-900/10'
                              : 'border-transparent group-hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={category.image}
                            alt={category.label}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span
                          className={`text-xs font-medium text-center transition-colors ${
                            idx === activeIndex ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                          }`}
                        >
                          {category.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Carousel Navigation Buttons */}
                  <button
                    onClick={scrollLeft}
                    aria-label="Scroll left"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all"
                  >
                    <svg className="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M10.957 12l3.47-3.47a.75.75 0 10-1.06-1.06L9.72 11.116a1.25 1.25 0 000 1.768l3.646 3.646a.75.75 0 001.06-1.06L10.958 12" clipRule="evenodd"/>
                    </svg>
                  </button>
                  <button
                    onClick={scrollRight}
                    aria-label="Scroll right"
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all"
                  >
                    <svg className="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M13.043 12l-3.47 3.47a.75.75 0 101.06 1.06l3.647-3.646a1.25 1.25 0 000-1.768L10.634 7.47a.75.75 0 00-1.06 1.06L13.042 12" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Selected deal</p>
                <h4 className="mt-2 text-xl lg:text-2xl font-semibold text-gray-900">{activeDeal.title}</h4>
                <p className="mt-1 text-lg text-gray-700">{activeDeal.price}</p>
                <p className="text-sm text-gray-500">{activeDeal.saving}</p>
                <p className="mt-3 text-sm text-gray-600">{activeDeal.detail}</p>
              </div>

              <div className="flex justify-end gap-3 mt-auto">
                <button
                  onClick={prev}
                  aria-label="Previous deal"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M10.957 12l3.47-3.47a.75.75 0 10-1.06-1.06L9.72 11.116a1.25 1.25 0 000 1.768l3.646 3.646a.75.75 0 001.06-1.06L10.958 12" clipRule="evenodd"/>
                  </svg>
                </button>
                <button
                  onClick={next}
                  aria-label="Next deal"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M13.043 12l-3.47 3.47a.75.75 0 101.06 1.06l3.647-3.646a1.25 1.25 0 000-1.768L10.634 7.47a.75.75 0 00-1.06 1.06L13.042 12" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
