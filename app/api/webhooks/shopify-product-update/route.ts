import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

const sql = neon(DATABASE_URL);

// Vendor shipping rates (hardcoded for performance)
const VENDOR_RATES: Record<string, number> = {
  'Ascot Saddlery': 12.00,
  'HORSE QUEENED': 15.00,
  'Tacklet': 15.00,
  'Shire Saddleworld': 15.00,
  'Paddock Blade': 0.00,
  'The Equestrian': 0.00,
  'JNK Collective': 12.00,
  'QJ Riding Wear': 8.00,
  'Runaway Equestrian Co.': 18.00,
  'Plum Tack': 8.00,
  'JP Equestrian Fashion': 8.00,
  'Ippico Equestrian': 8.00,
  'Top Brands': 8.00,
  'Little Equine Co': 8.00,
  'Helmet Brims': 18.00,
  'Diamond Deluxe Horsewear': 15.00,
  'Hitchley & Harrow': 8.00,
  'Living Horse Tails Jewellery By Monika': 8.00,
  'EAC Animal Care': 8.00,
  'Dapple Eq': 8.00,
  'Thinline Global Australia': 8.00,
  'Trailrace': 0.00,
  'CAN Animal Care': 15.00, // Base rate, weight-based overrides below
};

// Tag-based overrides (higher priority than vendor rates)
const TAG_OVERRIDES: Record<string, number> = {
  '#HEAVY': 15.00,
  'HEAVY': 15.00,
  'ponyjet': 15.00,
};

const DEFAULT_SHIPPING = 8.00;

function verifyWebhook(req: NextRequest, body: string): boolean {
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  if (!hmac || !SHOPIFY_WEBHOOK_SECRET) return false;

  const hash = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

function getShippingOffset(vendor: string, tags: string[]): number {
  // Priority 1: Check tag overrides
  for (const tag of tags) {
    const cleanTag = tag.trim().toUpperCase();
    if (TAG_OVERRIDES[cleanTag] !== undefined) {
      return TAG_OVERRIDES[cleanTag];
    }
    if (TAG_OVERRIDES[`#${cleanTag}`] !== undefined) {
      return TAG_OVERRIDES[`#${cleanTag}`];
    }
  }

  // Priority 2: Check vendor rate (case-insensitive)
  const vendorLower = vendor.toLowerCase().trim();
  for (const [vendorName, rate] of Object.entries(VENDOR_RATES)) {
    if (vendorName.toLowerCase() === vendorLower) {
      return rate;
    }
  }

  // Priority 3: Default shipping
  return DEFAULT_SHIPPING;
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
    const rawBody = await req.text();
    
    // Verify webhook signature
    if (!verifyWebhook(req, rawBody)) {
      console.error('[Shopify Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const product = JSON.parse(rawBody);
    const productId = product.id;
    const vendor = product.vendor || '';
    const tags = product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [];

    console.log(`[Shopify Webhook] Product update: ${product.title} (ID: ${productId})`);
    console.log(`[Shopify Webhook] Vendor: ${vendor}, Tags: ${tags.join(', ')}`);

    // Calculate shipping offset
    const shippingOffset = getShippingOffset(vendor, tags);
    
    if (shippingOffset === 0) {
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
        SELECT vendor_price, adjusted_price, shipping_offset, updated_at
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
        const lastVendorPrice = parseFloat(lastAudit.vendor_price);
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
        
        // Case 2: Current price is different from both vendor and adjusted
        // This means Webkul synced a NEW vendor price (e.g., sale price) → UPDATE
        else if (Math.abs(currentPrice - lastVendorPrice) > 0.01 && 
                 Math.abs(currentPrice - lastAdjustedPrice) > 0.01) {
          console.log(`[Shopify Webhook] Variant ${variantId} has new vendor price: $${lastVendorPrice} → $${currentPrice}`);
          isNewVendorPrice = true;
          shouldUpdate = true;
        }
        
        // Case 3: Current price matches last vendor price (no offset)
        // This means Webkul synced, removing our offset → UPDATE to re-apply offset
        else if (Math.abs(currentPrice - lastVendorPrice) < 0.01) {
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
      await updateVariantPrice(variant.id, newPrice, newCompareAt);
      
      // Log to audit database
      await sql`
        INSERT INTO shopify_price_audit (
          variant_id, product_id, vendor, vendor_price, shipping_offset, 
          adjusted_price, source, updated_at
        ) VALUES (
          ${variantId}, ${productId.toString()}, ${vendor}, ${currentPrice.toFixed(2)}, 
          ${shippingOffset}, ${newPrice}, 'webhook', NOW()
        )
        ON CONFLICT (variant_id) 
        DO UPDATE SET
          vendor_price = ${currentPrice.toFixed(2)},
          shipping_offset = ${shippingOffset},
          adjusted_price = ${newPrice},
          source = 'webhook',
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
  return NextResponse.json({
    ok: true,
    service: 'shopify-product-update-webhook',
    vendorRatesCount: Object.keys(VENDOR_RATES).length,
    tagOverridesCount: Object.keys(TAG_OVERRIDES).length,
    timestamp: new Date().toISOString(),
  });
}
