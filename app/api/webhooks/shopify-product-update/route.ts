import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';

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

    // Update each variant
    let variantsUpdated = 0;
    for (const variant of product.variants || []) {
      const currentPrice = parseFloat(variant.price);
      const currentCompareAt = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;

      // Calculate new price with shipping
      const newPrice = (currentPrice + shippingOffset).toFixed(2);
      
      // Calculate adjusted compare_at_price (maintain discount ratio)
      let newCompareAt: string | null = null;
      if (currentCompareAt && currentCompareAt > currentPrice) {
        const ratio = currentPrice / currentCompareAt;
        newCompareAt = (parseFloat(newPrice) / ratio).toFixed(2);
      }

      // Only update if price changed
      if (Math.abs(parseFloat(newPrice) - currentPrice) > 0.01) {
        await updateVariantPrice(variant.id, newPrice, newCompareAt);
        variantsUpdated++;
        console.log(`[Shopify Webhook] Updated variant ${variant.id}: $${currentPrice} → $${newPrice}`);
      }
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
