import type { CartUpsellProduct } from '@/lib/cart-upsells/types';
import type { ShopifyProduct } from '@/types/shopify';

export function cartUpsellFromShopifyProduct(product: ShopifyProduct): CartUpsellProduct {
  const image = product.images.edges[0]?.node;
  const firstAvailable =
    product.variants.edges.find((e) => e.node.availableForSale)?.node ??
    product.variants.edges[0]?.node ??
    null;
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    availableForSale: product.availableForSale,
    vendor: product.vendor,
    productType: product.productType,
    priceAmount: product.priceRange.minVariantPrice.amount,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
    imageUrl: image?.url ?? null,
    imageAlt: image?.altText ?? null,
    firstVariantId: firstAvailable?.id ?? null,
  };
}