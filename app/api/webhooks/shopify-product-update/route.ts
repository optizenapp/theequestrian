import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { loadShippingRates, normalizeTags } from '@/lib/shipping/rates';
import {
  setMarketplaceInventoryLevel,
  setMarketplaceProductStatus,
  updateMarketplaceVariantPriceRest,
} from '@/lib/shopify/marketplace-inventory-rest';
import {
  getActiveMapsForMarketplaceProduct,
  getMarketplaceVariantLock,
} from '@/lib/inventory/vendor-sync/repository';
import {
  aggregateMarketplaceStatusForProduct,
  getVendorStatusForMarketplaceProduct,
} from '@/lib/inventory/vendor-sync/status-repository';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

const sql = neon(DATABASE_URL);

export const runtime = 'nodejs';
export const maxDuration = 300;

function runAsync(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

function verifyWebhook(req: NextRequest, body: string): boolean {
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  if (!hmac || !SHOPIFY_WEBHOOK_SECRET) return false;

  const hash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

async function updateVariantPrice(variantId: string, price: string, compareAtPrice?: string | null) {
  return updateMarketplaceVariantPriceRest({
    variantIdNumeric: variantId,
    price,
    compareAtPrice,
  });
}

type MarketplaceWebhookVariant = {
  id: number;
  price: string;
  compare_at_price?: string | null;
};

type MarketplaceWebhookProduct = {
  id: number;
  title?: string;
  vendor?: string;
  tags?: string | string[];
  status?: string;
  variants?: MarketplaceWebhookVariant[];
};

/**
 * Anti-Webkul status reconcile. If the vendor source has marked a product as
 * non-active (draft/archived/deleted) but Webkul (or anything else) just set
 * the marketplace product back to 'active', revert it to 'draft' and zero out
 * inventory across all variants in the payload. Vendor store is the source of
 * truth for status when sync_status = true on the connection.
 */
async function reconcileVendorStatusDrift(
  product: MarketplaceWebhookProduct
): Promise<{ reverted: boolean; zeroedVariants: number }> {
  if ((product.status ?? '').toLowerCase() !== 'active') {
    return { reverted: false, zeroedVariants: 0 };
  }
  const lookup = await getVendorStatusForMarketplaceProduct(String(product.id));
  if (!lookup) return { reverted: false, zeroedVariants: 0 };
  if (lookup.row.vendor_status === 'active') {
    return { reverted: false, zeroedVariants: 0 };
  }

  // Aggregation rule: only revert to draft if EVERY vendor product mapping
  // into this marketplace product is non-active. Otherwise an active sibling
  // mapping should keep the listing alive.
  const agg = await aggregateMarketplaceStatusForProduct(String(product.id));
  if (!agg.allNonActive) {
    console.log(
      `[Shopify Webhook] Status drift detected on ${product.id} but ${agg.activeMappings} active sibling mapping(s) exist; leaving active`
    );
    return { reverted: false, zeroedVariants: 0 };
  }

  console.log(
    `[Shopify Webhook] Vendor status drift: marketplace ${product.id} active but all ${agg.totalMappings} vendor mapping(s) non-active (latest source: ${lookup.connection.shop_domain} ${lookup.row.vendor_status}); reverting to draft`
  );
  await setMarketplaceProductStatus({
    productIdNumeric: String(product.id),
    status: 'draft',
  });

  const maps = await getActiveMapsForMarketplaceProduct(lookup.connection.id, String(product.id));
  const dedupe = new Map<string, { inventoryItemId: number; locationId: number }>();
  for (const m of maps) {
    const key = `${m.marketplace_inventory_item_id}:${m.marketplace_location_id}`;
    if (dedupe.has(key)) continue;
    dedupe.set(key, {
      inventoryItemId: Number(m.marketplace_inventory_item_id),
      locationId: Number(m.marketplace_location_id),
    });
  }
  for (const target of dedupe.values()) {
    try {
      await setMarketplaceInventoryLevel({ ...target, available: 0 });
    } catch (e) {
      console.error('[Shopify Webhook] Failed to zero inventory during status revert', e);
    }
  }
  return { reverted: true, zeroedVariants: dedupe.size };
}

/**
 * Auto-revert any locked variant whose Shopify price has drifted from the
 * recorded lock. Returns the set of variant ids that are price-locked so the
 * caller can skip subsequent offset/reconcile logic for them.
 */
async function enforcePriceLocks(
  product: MarketplaceWebhookProduct
): Promise<{ locked: Set<string>; reverted: number }> {
  const locked = new Set<string>();
  let reverted = 0;

  for (const variant of product.variants || []) {
    const variantId = String(variant.id);
    const lock = await getMarketplaceVariantLock(variantId);
    if (!lock) continue;
    locked.add(variantId);

    const currentPrice = parseFloat(variant.price);
    if (Number.isNaN(currentPrice)) continue;

    const priceDiff = Math.abs(currentPrice - lock.lockedPrice);
    const currentCompareAt =
      variant.compare_at_price != null ? parseFloat(String(variant.compare_at_price)) : null;
    const targetCompareAt = lock.lockedCompareAt;
    const compareDiff =
      targetCompareAt == null
        ? currentCompareAt == null
          ? 0
          : Math.abs(currentCompareAt)
        : currentCompareAt == null
          ? Math.abs(targetCompareAt)
          : Math.abs(currentCompareAt - targetCompareAt);

    if (priceDiff < 0.01 && compareDiff < 0.01) continue;

    console.log(
      `[Shopify Webhook] Locked variant ${variantId} drifted ($${currentPrice} → $${lock.lockedPrice.toFixed(2)}); reverting`
    );
    await updateVariantPrice(
      variantId,
      lock.lockedPrice.toFixed(2),
      targetCompareAt != null ? targetCompareAt.toFixed(2) : null
    );
    reverted += 1;
  }

  return { locked, reverted };
}

/**
 * Shopify Product Update Webhook
 *
 * Price-offset baking is permanently disabled. This webhook still:
 * - reverts vendor status drift
 * - enforces manual price locks
 */
async function processProductUpdate(
  product: MarketplaceWebhookProduct,
  startTime: number
): Promise<void> {
  try {
    const productId = product.id;
    const vendor = product.vendor || '';
    const tags = normalizeTags(product.tags);

    console.log(`[Shopify Webhook] Product update: ${product.title} (ID: ${productId})`);
    console.log(`[Shopify Webhook] Vendor: ${vendor}, Tags: ${tags.join(', ')}`);

    // Anti-Webkul: if vendor source says product is non-active, force marketplace
    // back to draft and zero inventory before any price logic runs.
    const statusRevert = await reconcileVendorStatusDrift(product);
    if (statusRevert.reverted) {
      console.log(
        `[Shopify Webhook] Completed vendor status revert in ${Date.now() - startTime}ms; zeroed ${statusRevert.zeroedVariants} variant(s)`
      );
      return;
    }

    // Enforce manual price locks before any offset/reconcile work. Locked
    // variants are reverted to their stored price and excluded from the rest
    // of the pipeline so external syncs (Webkul, vendor-sync, etc.) cannot
    // override the manual override.
    const { reverted: lockedVariantsReverted } = await enforcePriceLocks(product);
    if (lockedVariantsReverted > 0) {
      console.log(
        `[Shopify Webhook] Reverted ${lockedVariantsReverted} locked variant(s) to manual price`
      );
    }

    // Price-offset baking permanently disabled — freight is calculated at checkout.
    // Do not mutate variant prices here for Collective or any other vendor.
    console.log(
      `[Shopify Webhook] Price offset bake disabled — skipping price mutation for ${vendor || product.id}`
    );
  } catch (error) {
    console.error('[Shopify Webhook] Async processing error:', error);
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    if (process.env.PRICE_OFFSET_WEBHOOK_DISABLED === 'true') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Webhook disabled' });
    }

    const rawBody = await req.text();
    
    // Verify webhook signature
    if (!verifyWebhook(req, rawBody)) {
      console.error('[Shopify Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const product = JSON.parse(rawBody) as MarketplaceWebhookProduct;
    const productId = product.id;

    runAsync(() => processProductUpdate(product, startTime));

    return NextResponse.json({
      ok: true,
      accepted: true,
      productId,
      processingTime: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[Shopify Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  const rates = await loadShippingRates();
  return NextResponse.json({
    ok: true,
    service: 'shopify-product-update-webhook',
    vendorRatesCount: rates.vendorRates.size,
    tagRatesCount: rates.tagRates.size,
    timestamp: new Date().toISOString(),
  });
}
