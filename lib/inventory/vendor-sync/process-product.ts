import { fetchVendorProduct } from '@/lib/shopify/vendor-shopify-rest';
import {
  fetchMarketplaceProductTags,
  updateMarketplaceVariantPriceRest,
} from '@/lib/shopify/marketplace-inventory-rest';
import { loadShippingRates, normalizeTags, resolveShippingOffset } from '@/lib/shipping/rates';
import { sql } from '@/lib/db/client';
import {
  getActiveMapsForVendorProduct,
  getVendorConnectionByDomain,
  isMarketplaceVariantPriceLocked,
} from './repository';

type ProductWebhookBody = { id?: number };

export async function processVendorProductUpdateWebhook(
  shopDomain: string,
  rawBody: string
): Promise<{ ok: boolean; detail?: string; variantsUpdated?: number }> {
  let body: ProductWebhookBody;
  try {
    body = JSON.parse(rawBody) as ProductWebhookBody;
  } catch {
    return { ok: false, detail: 'invalid_json' };
  }

  const productId = body.id;
  if (productId == null) {
    return { ok: false, detail: 'missing_product_id' };
  }

  const connection = await getVendorConnectionByDomain(shopDomain);
  if (!connection) {
    return { ok: true, detail: 'unknown_shop' };
  }

  if (!connection.sync_price) {
    return { ok: true, detail: 'sync_price_disabled' };
  }

  const maps = await getActiveMapsForVendorProduct(connection.id, String(productId));
  if (maps.length === 0) {
    return { ok: true, detail: 'unmapped_product' };
  }

  const vendorProduct = await fetchVendorProduct(
    connection.shop_domain,
    connection.access_token,
    productId
  );

  const rates = await loadShippingRates();
  let updated = 0;

  for (const row of maps) {
    const vv = vendorProduct.variants.find(
      (v) => String(v.id) === row.vendor_shopify_variant_id
    );
    if (!vv) {
      console.warn('[vendor-sync] Vendor variant missing', row.vendor_shopify_variant_id);
      continue;
    }

    if (await isMarketplaceVariantPriceLocked(row.marketplace_variant_id)) {
      console.log(
        '[vendor-sync] price locked, skipping variant',
        row.marketplace_variant_id
      );
      continue;
    }

    const basePrice = parseFloat(vv.price);
    if (Number.isNaN(basePrice)) continue;

    const { vendor: mpVendor, tags } = await fetchMarketplaceProductTags(
      row.marketplace_product_id
    );
    const { shippingOffset, tagMatch } = resolveShippingOffset(
      mpVendor,
      normalizeTags(tags),
      rates
    );
    const offset = shippingOffset ?? 0;
    const newPrice = (basePrice + offset).toFixed(2);

    const currentCompare = vv.compare_at_price ? parseFloat(String(vv.compare_at_price)) : null;
    let newCompareAt: string | null = null;
    if (currentCompare != null && !Number.isNaN(currentCompare) && currentCompare > basePrice) {
      const ratio = basePrice / currentCompare;
      newCompareAt = (parseFloat(newPrice) / ratio).toFixed(2);
    }

    await updateMarketplaceVariantPriceRest({
      variantIdNumeric: row.marketplace_variant_id,
      price: newPrice,
      compareAtPrice: newCompareAt,
    });

    await sql`
      INSERT INTO shopify_price_audit (
        variant_id, product_id, vendor_name, shopify_price, shipping_offset,
        adjusted_price, last_source, updated_at, tags
      ) VALUES (
        ${row.marketplace_variant_id},
        ${row.marketplace_product_id},
        ${mpVendor},
        ${basePrice.toFixed(2)},
        ${offset},
        ${newPrice},
        'vendor_sync',
        NOW(),
        ${tags}
      )
      ON CONFLICT (variant_id)
      DO UPDATE SET
        vendor_name = EXCLUDED.vendor_name,
        tags = EXCLUDED.tags,
        shopify_price = EXCLUDED.shopify_price,
        shipping_offset = EXCLUDED.shipping_offset,
        adjusted_price = EXCLUDED.adjusted_price,
        last_source = EXCLUDED.last_source,
        updated_at = NOW()
    `;

    updated += 1;
  }

  console.log('[vendor-sync] product price', shopDomain, productId, 'variants', updated);
  return { ok: true, variantsUpdated: updated };
}
