import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { loadShippingRates, resolveShippingOffset, normalizeTags } from '@/lib/shipping/rates';
import { fetchVendorProduct } from '@/lib/shopify/vendor-shopify-rest';
import {
  canRunReconcile,
  getActiveMapsForMarketplaceProduct,
  getMarketplaceVendorsWithPriceSyncEnabled,
  getReconcilePriceConnectionsByMarketplaceVendor,
  markReconcileRun,
} from '@/lib/inventory/vendor-sync/repository';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

const sql = neon(DATABASE_URL);

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
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/variants/${variantId}.json`;
  
  const payload: any = {
    variant: {
      id: variantId,
      price,
    },
  };

  if (compareAtPrice !== undefined) {
    payload.variant.compare_at_price = compareAtPrice;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API ${response.status}: ${text}`);
  }

  return response.json();
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
  variants?: MarketplaceWebhookVariant[];
};

async function reconcileDirectVendorPriceDrift(
  product: MarketplaceWebhookProduct,
  shippingOffset: number,
  vendorName: string
): Promise<number> {
  const connections = await getReconcilePriceConnectionsByMarketplaceVendor(vendorName);
  if (connections.length === 0) return 0;

  const marketplaceVariantMap = new Map<string, MarketplaceWebhookVariant>();
  for (const variant of product.variants || []) {
    marketplaceVariantMap.set(String(variant.id), variant);
  }

  let reconciled = 0;
  for (const connection of connections) {
    if (!canRunReconcile(connection)) continue;

    const maps = await getActiveMapsForMarketplaceProduct(connection.id, String(product.id));
    if (maps.length === 0) continue;

    const vendorProductIds = Array.from(new Set(maps.map((m) => m.vendor_shopify_product_id)));
    const vendorVariantMap = new Map<string, { price: string; compare_at_price?: string | null }>();

    for (const vendorProductId of vendorProductIds) {
      const vendorProduct = await fetchVendorProduct(
        connection.shop_domain,
        connection.access_token,
        Number(vendorProductId)
      );
      for (const vv of vendorProduct.variants) {
        vendorVariantMap.set(String(vv.id), { price: vv.price, compare_at_price: vv.compare_at_price });
      }
    }

    let touched = false;
    for (const mapRow of maps) {
      const vendorVariant = vendorVariantMap.get(mapRow.vendor_shopify_variant_id);
      const marketplaceVariant = marketplaceVariantMap.get(mapRow.marketplace_variant_id);
      if (!vendorVariant || !marketplaceVariant) continue;

      const basePrice = parseFloat(vendorVariant.price);
      const currentPrice = parseFloat(marketplaceVariant.price);
      if (Number.isNaN(basePrice) || Number.isNaN(currentPrice)) continue;

      const desiredPrice = (basePrice + shippingOffset).toFixed(2);
      if (Math.abs(currentPrice - parseFloat(desiredPrice)) < 0.01) {
        continue;
      }

      const vendorCompare = vendorVariant.compare_at_price
        ? parseFloat(String(vendorVariant.compare_at_price))
        : null;
      let desiredCompareAt: string | null = null;
      if (vendorCompare != null && !Number.isNaN(vendorCompare) && vendorCompare > basePrice) {
        const ratio = basePrice / vendorCompare;
        desiredCompareAt = (parseFloat(desiredPrice) / ratio).toFixed(2);
      }

      await updateVariantPrice(mapRow.marketplace_variant_id, desiredPrice, desiredCompareAt);
      reconciled += 1;
      touched = true;
    }

    if (touched) {
      await markReconcileRun(connection.id);
    }
  }

  return reconciled;
}

/**
 * Shopify Product Update Webhook
 * 
 * Automatically adds shipping offset to product prices when Webkul syncs to Shopify
 * 
 * This ensures prices ALWAYS include shipping, no matter what Webkul syncs
 */
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
    const vendor = product.vendor || '';
    const tags = normalizeTags(product.tags);

    console.log(`[Shopify Webhook] Product update: ${product.title} (ID: ${productId})`);
    console.log(`[Shopify Webhook] Vendor: ${vendor}, Tags: ${tags.join(', ')}`);

    const directPriceVendors = await getMarketplaceVendorsWithPriceSyncEnabled();
    const vendorNorm = (vendor || '').toLowerCase().trim();
    if (directPriceVendors.some((x) => x.toLowerCase().trim() === vendorNorm)) {
      const rates = await loadShippingRates();
      const { shippingOffset } = resolveShippingOffset(vendor, tags, rates);
      const offset = shippingOffset ?? 0;
      const reconciled = await reconcileDirectVendorPriceDrift(product, offset, vendor);
      console.log(
        `[Shopify Webhook] Direct sync vendor (${vendor}) reconcile completed; variants corrected: ${reconciled}`
      );
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'vendor_direct_price_sync_reconcile',
        reconciled,
        processingTime: Date.now() - startTime,
      });
    }

    // Load shipping rates from Postgres and calculate offset
    const rates = await loadShippingRates();
    const { shippingOffset, tagMatch } = resolveShippingOffset(vendor, tags, rates);
    
    if (shippingOffset === null || shippingOffset === 0) {
      console.log(`[Shopify Webhook] No shipping offset for vendor: ${vendor}, skipping`);
      return NextResponse.json({ 
        ok: true, 
        message: 'No shipping offset needed',
        processingTime: Date.now() - startTime 
      });
    }

    console.log(`[Shopify Webhook] Applying +$${shippingOffset} shipping offset`);

    // CRITICAL: Prevent infinite loop by checking audit database
    // Only update if the current price matches the vendor's base price (no offset yet)
    
    let variantsUpdated = 0;
    let skipped = 0;
    
    for (const variant of product.variants || []) {
      const currentPrice = parseFloat(variant.price);
      const currentCompareAt = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;
      const variantId = variant.id.toString();

      // Check audit database to see if we've already processed this variant
      const auditCheck = await sql`
        SELECT shopify_price, adjusted_price, shipping_offset, updated_at
        FROM shopify_price_audit 
        WHERE variant_id = ${variantId}
        ORDER BY updated_at DESC 
        LIMIT 1
      `;

      let shouldUpdate = true;
      let isNewVendorPrice = false;

      if (auditCheck.length > 0) {
        const lastAudit = auditCheck[0];
        const lastAdjustedPrice = parseFloat(lastAudit.adjusted_price);
        const lastShopifyPrice = parseFloat(lastAudit.shopify_price);
        const lastUpdated = new Date(lastAudit.updated_at);
        const nowTime = new Date();
        const secondsSinceUpdate = (nowTime.getTime() - lastUpdated.getTime()) / 1000;
        
        // Case 1: Current price matches our last adjusted price
        // This means either:
        // - Our webhook just updated it (if recent) → SKIP to prevent loop
        // - Webkul synced back our adjusted price (if old) → SKIP, already correct
        if (Math.abs(currentPrice - lastAdjustedPrice) < 0.01) {
          console.log(`[Shopify Webhook] Variant ${variantId} price $${currentPrice} matches last adjusted price, skipping`);
          shouldUpdate = false;
        }
        
        // Case 2: Current price is different from both shopify and adjusted
        // This means Webkul synced a NEW vendor price (e.g., sale price) → UPDATE
        else if (Math.abs(currentPrice - lastShopifyPrice) > 0.01 && 
                 Math.abs(currentPrice - lastAdjustedPrice) > 0.01) {
          console.log(`[Shopify Webhook] Variant ${variantId} has new vendor price: $${lastShopifyPrice} → $${currentPrice}`);
          isNewVendorPrice = true;
          shouldUpdate = true;
        }
        
        // Case 3: Current price matches last shopify price (no offset)
        // This means Webkul synced, removing our offset → UPDATE to re-apply offset
        else if (Math.abs(currentPrice - lastShopifyPrice) < 0.01) {
          console.log(`[Shopify Webhook] Variant ${variantId} price reset to vendor price $${currentPrice}, re-applying offset`);
          shouldUpdate = true;
        }
      } else {
        // No audit record, this is the first time we're processing this variant
        console.log(`[Shopify Webhook] Variant ${variantId} is new, applying offset`);
        shouldUpdate = true;
        isNewVendorPrice = true;
      }

      if (!shouldUpdate) {
        skipped++;
        continue;
      }

      // Calculate new price with shipping
      const newPrice = (currentPrice + shippingOffset).toFixed(2);
      
      // Calculate adjusted compare_at_price (maintain discount ratio)
      let newCompareAt: string | null = null;
      if (currentCompareAt && currentCompareAt > currentPrice) {
        const ratio = currentPrice / currentCompareAt;
        newCompareAt = (parseFloat(newPrice) / ratio).toFixed(2);
      }

      // Update the variant price
      await updateVariantPrice(String(variant.id), newPrice, newCompareAt);
      
      // Log to audit database
      await sql`
        INSERT INTO shopify_price_audit (
          variant_id, product_id, vendor_name, shopify_price, shipping_offset, 
          adjusted_price, last_source, updated_at, tags
        ) VALUES (
          ${variantId}, ${productId.toString()}, ${vendor}, ${currentPrice.toFixed(2)}, 
          ${shippingOffset}, ${newPrice}, 'webhook', NOW(), ${tags}
        )
        ON CONFLICT (variant_id) 
        DO UPDATE SET
          shopify_price = ${currentPrice.toFixed(2)},
          shipping_offset = ${shippingOffset},
          adjusted_price = ${newPrice},
          last_source = 'webhook',
          updated_at = NOW()
      `;
      
      variantsUpdated++;
      console.log(`[Shopify Webhook] Updated variant ${variantId}: $${currentPrice} → $${newPrice}`);
    }

    if (skipped > 0) {
      console.log(`[Shopify Webhook] Skipped ${skipped} variants (already processed)`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Shopify Webhook] Completed in ${duration}ms: ${variantsUpdated} variants updated`);

    return NextResponse.json({
      ok: true,
      productId,
      variantsUpdated,
      shippingOffset,
      processingTime: duration,
    });

  } catch (error: any) {
    console.error('[Shopify Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
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
