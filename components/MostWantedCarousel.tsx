'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { ShopifyProductCard } from '@/types/shopify';
import { ReviewStars } from '@/components/reviews/ReviewStars';

interface Product {
  title: string;
  price: string;
  rating: string;
  tag: string;
  image: string;
}

interface MostWantedCarouselProps {
  products: Product[] | ShopifyProductCard[]; // Support both old and new format
  eyebrow?: string;
  heading?: string;
  description?: string;
}

// Helper to check if product is a Shopify product card shape
function isShopifyProduct(product: Product | ShopifyProductCard): product is ShopifyProductCard {
  return 'handle' in product && 'priceRange' in product;
}

// Helper to format Shopify product for display
function formatProduct(product: Product | ShopifyProductCard): {
  title: string;
  price: string;
  rating: string;
  tag: string;
  image: string;
  handle?: string;
  primaryCollection?: string;
  reviewCount?: string;
} {
  if (isShopifyProduct(product)) {
    const price = parseFloat(product.priceRange.minVariantPrice.amount);
    const comparePrice = product.compareAtPriceRange?.minVariantPrice?.amount
      ? parseFloat(product.compareAtPriceRange.minVariantPrice.amount)
      : null;
    
    const hasDiscount = comparePrice && comparePrice > price;
    const priceDisplay = hasDiscount
      ? `$${price.toFixed(2)} (was $${comparePrice.toFixed(2)})`
      : `$${price.toFixed(2)}`;

    // Get rating from Judge.me metafields (now Postgres)
    const rating = product.reviewRating?.value 
      ? parseFloat(product.reviewRating.value).toFixed(1)
      : null; // No fake fallback
    
    const reviewCount = product.reviewCount?.value || null;

    return {
      title: product.title,
      price: priceDisplay,
      rating: rating || '', // Empty string if no rating
      tag: hasDiscount ? 'On Sale' : 'Best Seller',
      image: product.images.edges[0]?.node.url || '',
      handle: product.handle,
      primaryCollection: product.primaryCollection?.value || product.metafield?.value,
      reviewCount: reviewCount || undefined,
    };
  }
  
  return product;
}

export function MostWantedCarousel({
  products,
  eyebrow = 'Most Wanted',
  heading = 'Shop our most coveted picks',
  description = 'Curated gear that riders reach for first — high performance, great reviews, and premium brands.',
}: MostWantedCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold tracking-[0.4em] uppercase text-gray-400">
            {eyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {heading}
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        <div className="relative">
          {/* Carousel Container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide pb-4"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {products.map((item, index) => {
              const formatted = formatProduct(item);
              const productUrl = formatted.handle && formatted.primaryCollection
                ? `/${formatted.primaryCollection}/${formatted.handle}`
                : '#';
              
              const CardContent = (
                <>
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={formatted.image}
                      alt={formatted.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-6 text-xs text-primary font-semibold uppercase tracking-[0.4em]">
                    {formatted.tag}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900 line-clamp-2">{formatted.title}</h3>
                  <p className="mt-1 text-lg text-gray-700">{formatted.price}</p>
                  {formatted.rating && (
                    <div className="mt-2">
                      <ReviewStars 
                        rating={parseFloat(formatted.rating)} 
                        size="sm"
                        showNumber={true}
                        count={formatted.reviewCount ? parseInt(formatted.reviewCount) : undefined}
                      />
                    </div>
                  )}
                </>
              );

              return (
                <div 
                  key={`${formatted.title}-${index}`}
                  className="flex-shrink-0 w-[calc(100%-2rem)] sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.125rem)] scroll-snap-align-start"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  {formatted.handle ? (
                    <Link href={productUrl} className="block rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                      {CardContent}
                    </Link>
                  ) : (
                    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm hover:shadow-md transition-shadow h-full">
                      {CardContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden lg:flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-300 shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all"
          >
            <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10.957 12l3.47-3.47a.75.75 0 10-1.06-1.06L9.72 11.116a1.25 1.25 0 000 1.768l3.646 3.646a.75.75 0 001.06-1.06L10.958 12" clipRule="evenodd"/>
            </svg>
          </button>
          <button
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden lg:flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-300 shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all"
          >
            <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M13.043 12l-3.47 3.47a.75.75 0 101.06 1.06l3.647-3.646a1.25 1.25 0 000-1.768L10.634 7.47a.75.75 0 00-1.06 1.06L13.042 12" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

