'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ProductCard } from '@/components/ProductCard';
import type { ShopifyProduct } from '@/types/shopify';
import type { ReviewStats } from '@/lib/reviews/stats';
import { buildGa4ItemFromProduct, trackViewItemList } from '@/lib/analytics/ga4-ecommerce';

const LIST_ID = 'site_search';

type SearchResultsProductGridProps = {
  products: ShopifyProduct[];
  searchQuery: string;
  reviewStatsMap?: Record<string, ReviewStats | undefined>;
};

export function SearchResultsProductGrid({
  products,
  searchQuery,
  reviewStatsMap,
}: SearchResultsProductGridProps) {
  const lastFiredSignature = useRef<string | null>(null);

  const listSignature = useMemo(
    () => `${searchQuery}::${products.map((p) => p.id).join('|')}`,
    [searchQuery, products]
  );

  useEffect(() => {
    if (products.length === 0) return;
    if (lastFiredSignature.current === listSignature) return;
    lastFiredSignature.current = listSignature;

    const currency =
      products[0]?.priceRange?.minVariantPrice?.currencyCode || 'AUD';
    const listName =
      searchQuery.length > 80
        ? `Search: ${searchQuery.slice(0, 77)}…`
        : `Search: ${searchQuery}`;

    trackViewItemList({
      item_list_id: LIST_ID,
      item_list_name: listName,
      currency,
      items: products.map((p, i) =>
        buildGa4ItemFromProduct(p, {
          index: i,
          listId: LIST_ID,
          listName,
        })
      ),
    });
  }, [listSignature, products, searchQuery]);

  const listNameForSelect =
    searchQuery.length > 80
      ? `Search: ${searchQuery.slice(0, 77)}…`
      : `Search: ${searchQuery}`;

  return (
    <section
      aria-labelledby="search-results-products-heading"
      className="min-w-0"
    >
      <h2 id="search-results-products-heading" className="sr-only">
        Product results
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 list-none p-0 m-0">
        {products.map((product, index) => (
          <li key={product.id} className="min-h-0">
            <ProductCard
              product={product}
              reviewStats={reviewStatsMap?.[product.handle] ?? null}
              itemListId={LIST_ID}
              itemListName={listNameForSelect}
              itemIndex={index}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
