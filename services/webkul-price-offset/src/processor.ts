import type { WebkulProduct } from './webkul/types';
import { resolveShippingOffset, normalizeTags } from './price/offset';
import { updateVariantPrice } from './webkul/products';
import { extractVariantOptions } from './webkul/variant-options';
import { webkulQueue } from './queue/limiter';
import { getAuditByVariant, upsertAudit } from './db';
import type { ShippingRates } from './price/offset';

const PRICE_EPSILON = 0.01;

function closeTo(a: number, b: number) {
  return Math.abs(a - b) <= PRICE_EPSILON;
}

export async function processProduct(
  product: WebkulProduct,
  rates: ShippingRates,
  source: string,
  eventId?: string
) {
  const startTime = Date.now();
  const { shippingOffset, tagMatch } = resolveShippingOffset(product, rates);
  const tags = normalizeTags(product.product_tag ?? product.tags);
  const vendorName = product.brand_name || product.vendor;

  if (shippingOffset === null) {
    if (product.variants?.length) {
      for (const variant of product.variants) {
        const compareAt = variant.compare_at_price ? Number(variant.compare_at_price) : null;
        await upsertAudit({
          variantId: String(variant.id),
          productId: String(product.id),
          vendorName,
          tags,
          vendorPrice: Number(variant.price),
          vendorCompareAt: compareAt || undefined,
          shippingOffset: null,
          adjustedPrice: null,
          adjustedCompareAt: null,
          tagMatch,
          lastSource: source,
          lastEventId: eventId || null,
        });
      }
    }
    return;
  }

  for (const variant of product.variants || []) {
    const existing = await getAuditByVariant(String(variant.id));
    const currentPrice = Number(variant.price);

    let vendorPrice = currentPrice;
    let adjustedPrice = Number((vendorPrice + shippingOffset).toFixed(2));

    if (existing?.adjustedPrice !== null && existing?.adjustedPrice !== undefined) {
      if (closeTo(currentPrice, existing.adjustedPrice)) {
        vendorPrice = Number((currentPrice - shippingOffset).toFixed(2));
        adjustedPrice = currentPrice;
      } else {
        vendorPrice = currentPrice;
        adjustedPrice = Number((vendorPrice + shippingOffset).toFixed(2));
      }
    }

    const compareAt = variant.compare_at_price ? Number(variant.compare_at_price) : null;
    const vendorCompareAt =
      existing?.vendorCompareAt !== null && existing?.vendorCompareAt !== undefined
        ? Number(existing.vendorCompareAt)
        : compareAt;

    let adjustedCompareAt: number | null = null;
    if (vendorCompareAt && vendorPrice > 0 && vendorCompareAt > vendorPrice) {
      const ratio = vendorPrice / vendorCompareAt;
      adjustedCompareAt = Number((adjustedPrice / ratio).toFixed(2));
    }

    const shouldUpdatePrice = !closeTo(currentPrice, adjustedPrice);
    const shouldUpdateCompareAt =
      adjustedCompareAt !== null &&
      (!compareAt || !closeTo(compareAt, adjustedCompareAt));

    if (shouldUpdatePrice || shouldUpdateCompareAt) {
      const updateStart = Date.now();
      
      await updateVariantPrice(
        product.id,
        variant.id,
        adjustedPrice.toFixed(2),
        adjustedCompareAt ? adjustedCompareAt.toFixed(2) : undefined,
        variant  // Pass full variant object for required fields
      );
      const updateDuration = Date.now() - updateStart;
      console.log(`[Process] Updated variant ${variant.id} in ${updateDuration}ms`);
    }

    await upsertAudit({
      variantId: String(variant.id),
      productId: String(product.id),
      vendorName,
      tags,
      vendorPrice,
      vendorCompareAt: vendorCompareAt || undefined,
      shippingOffset,
      adjustedPrice,
      adjustedCompareAt: adjustedCompareAt || undefined,
      tagMatch,
      lastSource: source,
      lastEventId: eventId || null,
    });
  }
  
  const totalDuration = Date.now() - startTime;
  const variantCount = product.variants?.length || 0;
  console.log(`[Process] Product ${product.id} complete: ${variantCount} variants in ${totalDuration}ms (${Math.round(totalDuration/variantCount)}ms/variant)`);
}
