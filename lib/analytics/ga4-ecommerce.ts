import type { ShopifyProduct } from '@/types/shopify';
import { trackGaEvent } from '@/lib/analytics/ga4';

/** Numeric segment from Shopify GID (stable `item_id` for GA4 / BigQuery joins). */
export function stripShopifyGid(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

export type Ga4EcommerceItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
};

type Ga4ProductInput = Pick<
  ShopifyProduct,
  'id' | 'title' | 'vendor' | 'productType' | 'priceRange'
>;

export function buildGa4ItemFromProduct(
  product: Ga4ProductInput,
  opts?: {
    variantId?: string;
    index?: number;
    listId?: string;
    listName?: string;
    priceOverride?: number;
    itemNameOverride?: string;
  }
): Ga4EcommerceItem {
  const price =
    opts?.priceOverride ??
    parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
  const item: Ga4EcommerceItem = {
    item_id: stripShopifyGid(product.id),
    item_name: opts?.itemNameOverride ?? product.title,
    item_brand: product.vendor || undefined,
    item_category: product.productType || undefined,
    price,
    quantity: 1,
  };
  if (opts?.variantId) item.item_variant = stripShopifyGid(opts.variantId);
  if (opts?.index !== undefined) item.index = opts.index;
  if (opts?.listId) item.item_list_id = opts.listId;
  if (opts?.listName) item.item_list_name = opts.listName;
  return item;
}

export function trackViewItemList(params: {
  item_list_id: string;
  item_list_name: string;
  items: Ga4EcommerceItem[];
  currency: string;
}) {
  trackGaEvent('view_item_list', params);
}

export function trackSelectItem(params: {
  item_list_id: string;
  item_list_name: string;
  items: Ga4EcommerceItem[];
  currency: string;
}) {
  trackGaEvent('select_item', params);
}

export function trackViewItem(params: {
  currency: string;
  value: number;
  items: Ga4EcommerceItem[];
}) {
  trackGaEvent('view_item', params);
}
