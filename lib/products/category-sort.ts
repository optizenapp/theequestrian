import type { ShopifyProduct } from '@/types/shopify';
import type { CategorySortBy } from '@/lib/pagination/category-query';

type SortableProduct = Pick<
  ShopifyProduct,
  'id' | 'createdAt' | 'priceRange' | 'compareAtPriceRange' | 'variants'
>;

function inStock(p: SortableProduct): boolean {
  return p.variants.edges.some(({ node }) => node.availableForSale);
}

function price(p: SortableProduct): number {
  return parseFloat(p.priceRange?.minVariantPrice?.amount || '0');
}

function onSale(p: SortableProduct): boolean {
  return parseFloat(p.compareAtPriceRange?.minVariantPrice?.amount || '0') > price(p);
}

function created(p: SortableProduct): number {
  return new Date(p.createdAt || 0).getTime();
}

function compareIds(a: SortableProduct, b: SortableProduct): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Category PLP order. Every branch ends in a product-id tie-break so the
 * sequence (and therefore cursor page boundaries) is deterministic.
 */
export function compareCategoryProducts(
  a: SortableProduct,
  b: SortableProduct,
  sortBy?: CategorySortBy
): number {
  if (sortBy === 'on-sale' && onSale(a) !== onSale(b)) return onSale(a) ? -1 : 1;
  if (inStock(a) !== inStock(b)) return inStock(a) ? -1 : 1;

  let primary = 0;
  switch (sortBy) {
    case 'oldest':
      primary = created(a) - created(b);
      break;
    case 'price-asc':
      primary = price(a) - price(b);
      break;
    case 'price-desc':
      primary = price(b) - price(a);
      break;
    case 'on-sale':
      break;
    case 'newest':
    case 'featured':
    default:
      primary = created(b) - created(a);
  }
  return primary !== 0 ? primary : compareIds(a, b);
}
