import { webkulFetch } from './client';
import { webkulQueue } from '../queue/limiter';
import type { WebkulProduct, WebkulProductResponse } from './types';

export async function getProductById(productId: string | number): Promise<WebkulProduct | null> {
  const data = await webkulQueue.add(() =>
    webkulFetch<WebkulProductResponse>(`/api/v2/products/${productId}.json`, {
      method: 'GET',
    })
  );

  return data.product || null;
}

export async function listProducts(page: number, limit: number): Promise<WebkulProduct[]> {
  const data = await webkulQueue.add(() =>
    webkulFetch<WebkulProductResponse>(`/api/v2/products.json?page=${page}&limit=${limit}`, {
      method: 'GET',
    })
  );

  return data.products || [];
}

export async function updateVariantPrice(
  productId: string | number,
  variantId: string | number,
  price: string,
  compareAtPrice?: string,
  variant?: WebkulVariant
) {
  const variantPayload: any = {
    price,
    ...(compareAtPrice ? { compare_at_price: compareAtPrice } : {}),
  };

  // Include required fields from the full variant object
  if (variant) {
    // Option fields (required by Webkul API)
    if (variant.combinations && variant.combinations.length > 0) {
      variant.combinations.forEach((combo, index) => {
        if (index === 0) variantPayload.option1 = combo.option_value;
        else if (index === 1) variantPayload.option2 = combo.option_value;
        else if (index === 2) variantPayload.option3 = combo.option_value;
      });
    }

    // Other required fields
    if (variant.track_inventory !== undefined) variantPayload.track_inventory = variant.track_inventory;
    if (variant.quantity !== undefined) variantPayload.quantity = variant.quantity;
    if (variant.requires_shipping !== undefined) variantPayload.require_shipping = variant.requires_shipping;
    if (variant.charge_taxes !== undefined) variantPayload.charge_taxes = variant.charge_taxes;
    if (variant.inventory_policy !== undefined) variantPayload.inventory_policy = variant.inventory_policy;
    if (variant.sku) variantPayload.sku = variant.sku;
    if (variant.barcode) variantPayload.barcode = variant.barcode;
    if (variant.weight) variantPayload.weight = variant.weight;
    
    // Inventory locations (required by Webkul API)
    if (variant.inventory_locations && variant.inventory_locations.length > 0) {
      variantPayload.inventory_locations = variant.inventory_locations.map(loc => ({
        location_id: loc.location_id,
        variant_quantity: Math.max(0, Number(loc.variant_quantity) || 0) // Ensure non-negative integer
      }));
    }
  }

  // Uncomment for debugging: console.log(`[API] Updating variant ${variantId}: payload =`, JSON.stringify(variantPayload, null, 2));

  // NOTE: Webkul API expects fields directly, NOT wrapped in a "variant" object
  return webkulQueue.add(() =>
    webkulFetch(`/api/v2/products/${productId}/variants/${variantId}.json`, {
      method: 'PUT',
      body: JSON.stringify(variantPayload),
    })
  );
}
