/**
 * True when Shopify compare-at is strictly above the selling price.
 * Matches ProductCard / ProductPrice sale-badge logic.
 */
export function hasRealCompareAtDiscount(product: {
  priceRange?: { minVariantPrice?: { amount?: string } | null } | null;
  compareAtPriceRange?: { minVariantPrice?: { amount?: string } | null } | null;
}): boolean {
  const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '');
  const compare = parseFloat(product.compareAtPriceRange?.minVariantPrice?.amount || '');
  return Number.isFinite(price) && Number.isFinite(compare) && compare > price;
}
