'use client';

import { ProductCard } from '@/components/ProductCard';
import type { ShopifyProduct } from '@/types/shopify';
import type { ReviewStats } from '@/lib/reviews/stats';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface RelatedProductsProps {
  products: ShopifyProduct[];
  reviewStatsMap?: Record<string, ReviewStats>; // plain object for RSC serialization
  /** Resolved storefront paths by handle (from getProductCanonicalUrls on the server). */
  productHrefByHandle?: Record<string, string>;
  /** Override default “You might also like” heading (e.g. blog inline block). */
  heading?: string;
  /** Extra section classes (e.g. tighter vertical padding in blog). */
  className?: string;
}

export function RelatedProducts({
  products,
  reviewStatsMap,
  productHrefByHandle,
  heading = 'You might also like',
  className = '',
}: RelatedProductsProps) {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '200px' });

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      className={`py-16 border-t border-gray-100 ${className}`.trim()}
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
      </div>
      
      {isVisible ? (
        <div className="flex flex-wrap justify-center gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)]"
            >
              <ProductCard
                product={product}
                canonicalUrl={productHrefByHandle?.[product.handle]}
                reviewStats={reviewStatsMap?.[product.handle]}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="h-80 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      )}
    </section>
  );
}

