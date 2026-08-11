'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ProductPrice } from './ProductPrice';
import { ProductReviewBadge, type ReviewStats } from './reviews/ProductReviewBadge';
import { ProductCardActions } from './product/ProductCardActions';
import type { ShopifyProduct } from '@/types/shopify';
import { buildGa4ItemFromProduct, trackSelectItem } from '@/lib/analytics/ga4-ecommerce';

interface ProductCardProps {
  product: ShopifyProduct;
  priority?: boolean;
  showBreadcrumbs?: boolean;
  canonicalUrl?: string;
  reviewStats?: ReviewStats | null;
  itemListId?: string;
  itemListName?: string;
  itemIndex?: number;
}

export function ProductCard({
  product,
  priority = false,
  showBreadcrumbs = false,
  canonicalUrl,
  reviewStats,
  itemListId,
  itemListName,
  itemIndex,
}: ProductCardProps) {
  void showBreadcrumbs;
  const productHref = canonicalUrl || `/products/${product.handle}`;
  const image = product.images.edges[0]?.node;
  const price = product.priceRange?.minVariantPrice || { amount: '0', currencyCode: 'USD' };
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;

  const handleAnalyticsClick = () => {
    if (itemListId == null || itemListName == null || itemIndex == null) return;
    const currency = price.currencyCode || 'AUD';
    trackSelectItem({
      item_list_id: itemListId,
      item_list_name: itemListName,
      currency,
      items: [
        buildGa4ItemFromProduct(product, {
          index: itemIndex,
          listId: itemListId,
          listName: itemListName,
        }),
      ],
    });
  };

  return (
    <div className="group relative flex h-full flex-col rounded-2xl bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-1">
        {product.availableForSale &&
          product.compareAtPriceRange?.minVariantPrice &&
          parseFloat(product.compareAtPriceRange.minVariantPrice.amount) >
            parseFloat(product.priceRange.minVariantPrice.amount) && (
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white shadow-sm">
              Sale
            </span>
          )}
      </div>

      <Link
        href={productHref}
        className="flex min-h-0 flex-1 flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={handleAnalyticsClick}
      >
        <article className="flex min-h-0 flex-1 flex-col">
          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white">
            {image ? (
              <Image
                src={image.url}
                alt={image.altText || product.title}
                fill
                className="object-contain object-center transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 639px) 88vw, (max-width: 1023px) 45vw, (max-width: 1535px) 30vw, 360px"
                quality={65}
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white text-gray-400">
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between">
            <div>
              <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 transition-colors group-hover:text-primary">
                {product.title}
              </h3>
              <div className="mb-2">
                <ProductReviewBadge
                  productId={product.id}
                  productHandle={product.handle}
                  initialStats={reviewStats}
                />
              </div>
            </div>
            <div className="mt-2">
              <ProductPrice
                price={price}
                compareAtPrice={compareAtPrice}
                currencyCode={price.currencyCode}
                vendor={product.vendor}
                tags={product.tags}
                includeShipping={false}
              />
              {!product.availableForSale && (
                <span className="mt-1 block text-xs font-medium text-red-600">Out of stock</span>
              )}
            </div>
          </div>
        </article>
      </Link>

      <div className="mt-3 shrink-0 border-t border-gray-100 pt-3">
        <ProductCardActions
          product={product}
          productHref={productHref}
          itemListId={itemListId}
          itemListName={itemListName}
          itemIndex={itemIndex}
        />
      </div>
    </div>
  );
}
