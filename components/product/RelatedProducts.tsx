'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { ProductCard } from '@/components/ProductCard';
import type { ShopifyProduct } from '@/types/shopify';
import type { ReviewStats } from '@/lib/reviews/stats';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { buildGa4ItemFromProduct, trackViewItemList } from '@/lib/analytics/ga4-ecommerce';

interface RelatedProductsProps {
  products: ShopifyProduct[];
  reviewStatsMap?: Record<string, ReviewStats>; // plain object for RSC serialization
  /** Resolved storefront paths by handle (from getProductCanonicalUrls on the server). */
  productHrefByHandle?: Record<string, string>;
  /** Override default “You might also like” heading (e.g. blog inline block). */
  heading?: string;
  /** GA4 `item_list_id` (default `related_products`). */
  analyticsListId?: string;
  /** GA4 `item_list_name` (defaults to `heading`). */
  analyticsListName?: string;
  /** Extra section classes (e.g. tighter vertical padding in blog). */
  className?: string;
}

export function RelatedProducts({
  products,
  reviewStatsMap,
  productHrefByHandle,
  heading = 'You might also like',
  analyticsListId = 'related_products',
  analyticsListName,
  className = '',
}: RelatedProductsProps) {
  const headingDomId = useId();
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '200px' });
  const listName = analyticsListName ?? heading;
  const lastFiredSignature = useRef<string | null>(null);

  const listSignature = useMemo(
    () => products.map((p) => p.id).join('|'),
    [products]
  );

  useEffect(() => {
    if (!isVisible || products.length === 0) return;
    if (lastFiredSignature.current === listSignature) return;
    lastFiredSignature.current = listSignature;

    const currency =
      products[0]?.priceRange?.minVariantPrice?.currencyCode || 'AUD';
    trackViewItemList({
      item_list_id: analyticsListId,
      item_list_name: listName,
      currency,
      items: products.map((p, i) =>
        buildGa4ItemFromProduct(p, {
          index: i,
          listId: analyticsListId,
          listName,
        })
      ),
    });
  }, [isVisible, listSignature, analyticsListId, listName, products]);

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      className={`py-16 border-t border-gray-100 ${className}`.trim()}
      aria-labelledby={headingDomId}
    >
      <div className="flex items-center justify-between mb-8">
        <h2 id={headingDomId} className="text-2xl font-bold text-gray-900">
          {heading}
        </h2>
      </div>
      
      {isVisible ? (
        <ul className="flex flex-wrap justify-center gap-6 list-none p-0 m-0">
          {products.map((product, index) => (
            <li
              key={product.id}
              className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] min-h-0"
            >
              <ProductCard
                product={product}
                canonicalUrl={productHrefByHandle?.[product.handle]}
                reviewStats={reviewStatsMap?.[product.handle]}
                itemListId={analyticsListId}
                itemListName={listName}
                itemIndex={index}
              />
            </li>
          ))}
        </ul>
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

