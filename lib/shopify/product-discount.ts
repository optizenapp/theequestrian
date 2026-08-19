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

/**
 * When compare-at is strictly above the active price, return both amounts for
 * Google sale annotations (schema StrikethroughPrice / GMC sale_price).
 */
export function getCompareAtSalePair(
  saleAmount: string | null | undefined,
  compareAtAmount: string | null | undefined
): { saleAmount: string; compareAtAmount: string } | null {
  const sale = parseFloat(saleAmount || '');
  const compare = parseFloat(compareAtAmount || '');
  if (!Number.isFinite(sale) || !Number.isFinite(compare) || compare <= sale) {
    return null;
  }
  return {
    saleAmount: String(saleAmount),
    compareAtAmount: String(compareAtAmount),
  };
}
