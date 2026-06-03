/**
 * Auto-map new vendor products/variants into vendor_inventory_map by SKU match.
 * Called on products/create (and can be called on products/update to catch new variants).
 */
import { sql } from '@/lib/db/client';
import { lookupMarketplaceVariantsBySku } from '@/lib/shopify/marketplace-inventory-rest';
import { getVendorConnectionByDomain } from './repository';

type VendorVariant = {
  id: number;
  inventory_item_id: number;
  sku?: string | null;
};

type VendorProductPayload = {
  id?: number;
  variants?: VendorVariant[];
};

function getMarketplaceLocationId(): string {
  return process.env.SHOPIFY_MARKETPLACE_LOCATION_ID ?? '62137499729';
}

export async function processVendorProductCreateWebhook(
  shopDomain: string,
  rawBody: string
): Promise<{ ok: boolean; detail?: string; mapped?: number }> {
  let body: VendorProductPayload;
  try {
    body = JSON.parse(rawBody) as VendorProductPayload;
  } catch {
    return { ok: false, detail: 'invalid_json' };
  }

  const variants = body.variants ?? [];
  if (variants.length === 0) return { ok: true, detail: 'no_variants', mapped: 0 };

  const connection = await getVendorConnectionByDomain(shopDomain);
  if (!connection) return { ok: true, detail: 'unknown_shop' };

  const vendorProductId = String(body.id ?? '');
  const marketplaceLocationId = getMarketplaceLocationId();
  let mapped = 0;

  for (const vv of variants) {
    const sku = (vv.sku ?? '').trim();
    if (!sku) continue;

    // Skip if already mapped by this variant
    const existing = await sql`
      SELECT id FROM vendor_inventory_map
      WHERE vendor_connection_id = ${connection.id}
        AND vendor_shopify_variant_id = ${String(vv.id)}
      LIMIT 1
    `;
    if ((Array.isArray(existing) ? existing : []).length > 0) continue;

    // Find matching marketplace variant by SKU
    let marketplaceMatches;
    try {
      marketplaceMatches = await lookupMarketplaceVariantsBySku(sku);
    } catch {
      console.warn('[vendor-sync] SKU lookup failed for', sku);
      continue;
    }
    if (marketplaceMatches.length === 0) {
      console.log('[vendor-sync] No marketplace variant for SKU', sku, shopDomain);
      continue;
    }
    // Ambiguous SKU: maps to multiple marketplace variants. Mapping all of them
    // (or picking arbitrarily) corrupts sync, so skip and surface for review.
    if (marketplaceMatches.length > 1) {
      console.warn(
        '[vendor-sync] Ambiguous SKU maps to',
        marketplaceMatches.length,
        'marketplace variants; skipping',
        sku,
        shopDomain
      );
      continue;
    }

    for (const mkt of marketplaceMatches) {
      // Guard against many-to-one pollution: never attach a second vendor variant
      // to a marketplace variant that is already actively mapped elsewhere.
      const alreadyMapped = await sql`
        SELECT id FROM vendor_inventory_map
        WHERE vendor_connection_id = ${connection.id}
          AND marketplace_variant_id = ${mkt.variantId}
          AND vendor_shopify_variant_id <> ${String(vv.id)}
          AND status = 'active'
        LIMIT 1
      `;
      if ((Array.isArray(alreadyMapped) ? alreadyMapped : []).length > 0) {
        console.warn(
          '[vendor-sync] Marketplace variant already mapped to another vendor variant; skipping',
          sku,
          mkt.variantId
        );
        continue;
      }

      await sql`
        INSERT INTO vendor_inventory_map (
          vendor_connection_id,
          vendor_shopify_product_id,
          vendor_shopify_variant_id,
          vendor_inventory_item_id,
          vendor_location_id,
          marketplace_product_id,
          marketplace_variant_id,
          marketplace_inventory_item_id,
          marketplace_location_id,
          sku,
          status
        ) VALUES (
          ${connection.id},
          ${vendorProductId},
          ${String(vv.id)},
          ${String(vv.inventory_item_id)},
          ${connection.primary_location_id ?? null},
          ${mkt.productId},
          ${mkt.variantId},
          ${mkt.inventoryItemId},
          ${marketplaceLocationId},
          ${mkt.sku},
          'active'
        )
        ON CONFLICT DO NOTHING
      `;
      mapped++;
      console.log('[vendor-sync] auto-mapped SKU', sku, '→ marketplace variant', mkt.variantId);
    }
  }

  return { ok: true, mapped };
}
