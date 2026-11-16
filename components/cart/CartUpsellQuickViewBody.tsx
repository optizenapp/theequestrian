'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { useProductVariantSelection } from '@/hooks/useProductVariantSelection';
import { buildGa4ItemFromProduct } from '@/lib/analytics/ga4-ecommerce';
import type { ShopifyProduct } from '@/types/shopify';

function truncateText(text: string, max = 420): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trimEnd()}…`;
}

type Props = {
  product: ShopifyProduct;
  productHref: string;
  onAdded: () => void;
};

export function CartUpsellQuickViewBody({ product, productHref, onAdded }: Props) {
  const { selectedOptions, selectedVariant, handleOptionSelect } =
    useProductVariantSelection(product);
  const image = selectedVariant?.image || product.images.edges[0]?.node;
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compare = selectedVariant?.compareAtPrice;
  const description = truncateText(product.description || '');

  const analyticsItem = useMemo(() => {
    if (!selectedVariant) return null;
    return buildGa4ItemFromProduct(product, {
      variantId: selectedVariant.id,
      priceOverride: parseFloat(selectedVariant.price.amount),
      listId: 'cart_upsell_quick_view',
      listName: 'Cart Upsell Quick View',
    });
  }, [product, selectedVariant]);

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-xl bg-gray-50">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.altText || product.title}
            fill
            className="object-cover"
            sizes="280px"
            priority
          />
        ) : null}
      </div>

      <div>
        {product.vendor ? (
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{product.vendor}</p>
        ) : null}
        <p className="mt-1 text-lg font-bold text-gray-900">
          ${parseFloat(price.amount).toFixed(2)}{' '}
          <span className="text-sm font-medium text-gray-500">{price.currencyCode}</span>
          {compare && parseFloat(compare.amount) > parseFloat(price.amount) ? (
            <span className="ml-2 text-sm font-medium text-gray-400 line-through">
              ${parseFloat(compare.amount).toFixed(2)}
            </span>
          ) : null}
        </p>
      </div>

      {description ? <p className="text-sm leading-relaxed text-gray-600">{description}</p> : null}

      <ProductVariantSelector
        product={product}
        selectedOptions={selectedOptions}
        onOptionSelect={handleOptionSelect}
      />

      <AddToCartButton
        variantId={selectedVariant?.id ?? ''}
        disabled={!selectedVariant?.availableForSale}
        analyticsItem={analyticsItem}
        currencyCode={price.currencyCode}
        onSuccess={onAdded}
      />

      <Link
        href={productHref}
        className="block text-center text-sm font-medium text-action hover:underline"
      >
        View full product details
      </Link>
    </div>
  );
}