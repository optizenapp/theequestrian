export interface WebkulVariantCombination {
  id: number;
  variant_id: number;
  option_value: string;
  option_id: number;
  option_value_id: number;
}

export interface WebkulInventoryLocation {
  id?: number;
  product_id?: number;
  variant_id?: number;
  shopify_inventory_item_id?: number;
  variant_quantity: number;
  location_id: number;
  location_name?: string;
  shopify_location_id?: number;
}

export interface WebkulVariant {
  id: string | number;
  price: string;
  compare_at_price?: string | null;
  sku?: string | null;
  barcode?: string | null;
  weight?: string | null;
  weight_unit?: string | null;
  track_inventory?: number;
  quantity?: number;
  requires_shipping?: number;
  charge_taxes?: number;
  inventory_policy?: number;
  combinations?: WebkulVariantCombination[];
  inventory_locations?: WebkulInventoryLocation[];
}

export interface WebkulProduct {
  id: string | number;
  vendor?: string;
  brand_name?: string;
  seller_id?: string | number;
  tags?: string[] | string;
  product_tag?: string;
  variants?: WebkulVariant[];
}

export interface WebkulSeller {
  id: string | number;
  seller_name: string;
  last_name?: string;
  full_name?: string;
  store_name_handle?: string;
  sp_store_name?: string;
}

export interface WebkulProductResponse {
  product?: WebkulProduct;
  products?: WebkulProduct[];
}

export interface WebkulSellerResponse {
  seller?: WebkulSeller;
}
