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
}

export function RelatedProducts({ products, reviewStatsMap, productHrefByHandle }: RelatedProductsProps) {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '200px' });

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section ref={ref} className="py-16 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">You might also like</h2>
      </div>
      
      {isVisible ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canonicalUrl={productHrefByHandle?.[product.handle]}
              reviewStats={reviewStatsMap?.[product.handle]}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.id}
              className="h-80 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      )}
    </section>
  );
}

