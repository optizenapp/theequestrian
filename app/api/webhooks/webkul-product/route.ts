import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Pool } from 'pg';

const DRY_RUN = process.env.WEBKUL_DRY_RUN === 'true';
const WEBHOOK_DISABLED = process.env.WEBKUL_WEBHOOK_DISABLED === 'true';

// In-memory cache for rates (15 min TTL)
interface RateCache {
  vendorRates: Map<string, { shippingCost: number; tagOverrides?: Map<string, number> }>;
  tagRates: Map<string, { shippingCost: number }>;
  sellerMapping: Map<string, string>;
  timestamp: number;
}

let rateCache: RateCache | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function loadRates() {
  // Return cached rates if still valid
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL) {
    return rateCache;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Load vendor rates from Postgres
    const vendorResult = await pool.query(`
      SELECT vendor_name, base_rate, tag_overrides
      FROM vendor_shipping_rates
      WHERE active = true
    `);

    const vendorRates = new Map();
    for (const row of vendorResult.rows) {
      const tagOverrides = new Map<string, number>();
      if (row.tag_overrides) {
        for (const [tag, rate] of Object.entries(row.tag_overrides)) {
          tagOverrides.set(tag, rate as number);
        }
      }
      vendorRates.set(row.vendor_name, {
        shippingCost: parseFloat(row.base_rate),
        tagOverrides: tagOverrides.size > 0 ? tagOverrides : undefined,
      });
    }

    // Load tag rates from Postgres
    const tagResult = await pool.query(`
      SELECT tag, rate
      FROM shipping_tag_rates
      WHERE active = true
    `);

    const tagRates = new Map();
    for (const row of tagResult.rows) {
      tagRates.set(row.tag, {
        shippingCost: parseFloat(row.rate),
      });
    }

    // Load seller mapping from CSV (still in public folder)
    const fs = await import('fs');
    const path = await import('path');
    const { parse } = await import('csv-parse/sync');
    
    const projectRoot = process.cwd();
    const publicPath = path.join(projectRoot, 'public');
    const sellerCsv = fs.readFileSync(
      path.join(publicPath, 'seller-to-vendor-mapping.csv'),
      'utf-8'
    );
    const sellerRecords = parse(sellerCsv, { columns: true, skip_empty_lines: true });
    const sellerMapping = new Map(
      sellerRecords.map((r: any) => [r.seller_id, r.vendor_name])
    );

    // Cache the results
    rateCache = {
      vendorRates,
      tagRates,
      sellerMapping,
      timestamp: Date.now(),
    };

    return rateCache;
  } finally {
    await pool.end();
  }
}

async function getProductById(productId: string) {
  const response = await fetch(
    `${process.env.WEBKUL_API_URL}/api/v2/products/${productId}.json`,
    {
      headers: {
        Authorization: `Bearer ${process.env.WEBKUL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Webkul API error: ${response.status}`);
  }

  const data = await response.json();
  return data.product;
}

async function updateVariantPrice(
  productId: string,
  variantId: string,
  price: string,
  variant: any
) {
  const variantPayload: any = {
    price,
  };

  // Include required fields from the full variant object
  if (variant) {
    // Option fields (required by Webkul API)
    if (variant.combinations && variant.combinations.length > 0) {
      variant.combinations.forEach((combo: any, index: number) => {
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
      variantPayload.inventory_locations = variant.inventory_locations.map((loc: any) => ({
        location_id: loc.location_id,
        variant_quantity: Math.max(0, Number(loc.variant_quantity) || 0)
      }));
    }
  }

  const response = await fetch(
    `${process.env.WEBKUL_API_URL}/api/v2/products/${productId}/variants/${variantId}.json`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.WEBKUL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(variantPayload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update variant ${variantId}: ${error}`);
  }

  return response.json();
}

function verifyWebhook(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.WEBKUL_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret set

  const signature = req.headers.get('x-webkul-signature') || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if webhook is disabled
    if (WEBHOOK_DISABLED) {
      return NextResponse.json({ 
        ok: true, 
        skipped: true, 
        reason: 'Webhook disabled' 
      });
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verify webhook signature
    if (!verifyWebhook(req, rawBody)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Extract product ID
    const productId = body?.product_id || body?.id || body?.product?.id;
    if (!productId) {
      return NextResponse.json(
        { error: 'Missing product id' },
        { status: 400 }
      );
    }

    console.log(`[Webkul Webhook] Received product update: ${productId}`);

    // Load rates (cached after first call)
    const { vendorRates, tagRates, sellerMapping } = await loadRates();

    // Fetch full product details
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Only process products that are published to Shopify
    if (!product.shopify_product_id || product.shopify_product_id === '0' || product.shopify_product_id === 0) {
      console.log(`[Webkul Webhook] Skipping unpublished product ${productId}`);
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Product not published to Shopify'
      });
    }

    // Get vendor name from seller mapping
    const vendorName = product.seller_id 
      ? sellerMapping.get(String(product.seller_id)) 
      : product.vendor || product.brand_name;

    // Check if vendor has a shipping rate
    const vendorRate = vendorName ? vendorRates.get(vendorName) : undefined;
    
    if (!vendorRate) {
      console.log(`[Webkul Webhook] No shipping offset for vendor: ${vendorName || 'unknown'}`);
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'No shipping offset for vendor'
      });
    }

    console.log(`[Webkul Webhook] Processing: ${product.product_name || productId} (Vendor: ${vendorName}, Offset: $${vendorRate.shippingCost})`);

    if (DRY_RUN) {
      // Dry-run mode: Log what WOULD happen
      console.log(`[Webkul Webhook] DRY RUN MODE`);
      
      for (const variant of product.variants || []) {
        const oldPrice = Number(variant.price);
        const newPrice = oldPrice + vendorRate.shippingCost;
        console.log(`[Webkul Webhook]   Variant ${variant.id}: $${oldPrice} → $${newPrice.toFixed(2)} (DRY RUN)`);
      }
      
      const duration = Date.now() - startTime;
      return NextResponse.json({
        ok: true,
        dryRun: true,
        processingTime: duration,
        message: 'Dry run - no prices updated',
        product: {
          id: productId,
          name: product.product_name,
          vendor: vendorName,
          variantCount: product.variants?.length || 0,
        }
      });
    }

    // Live mode: Update prices in Webkul
    let variantsUpdated = 0;
    const PRICE_EPSILON = 0.01;

    for (const variant of product.variants || []) {
      const currentPrice = Number(variant.price);
      const adjustedPrice = Number((currentPrice + vendorRate.shippingCost).toFixed(2));
      
      // Check if update is needed
      const shouldUpdate = Math.abs(currentPrice - adjustedPrice) > PRICE_EPSILON;
      
      if (shouldUpdate) {
        await updateVariantPrice(
          productId,
          variant.id,
          adjustedPrice.toFixed(2),
          variant
        );
        variantsUpdated++;
        console.log(`[Webkul Webhook] ✓ Variant ${variant.id}: $${currentPrice} → $${adjustedPrice}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Webkul Webhook] Product ${productId} complete: ${variantsUpdated} variants updated in ${duration}ms`);

    return NextResponse.json({
      ok: true,
      processingTime: duration,
      productId,
      vendor: vendorName,
      variantsUpdated,
      shippingOffset: vendorRate.shippingCost
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Webhook] Error after ${duration}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const { vendorRates, tagRates, sellerMapping } = await loadRates();
    
    return NextResponse.json({
      ok: true,
      dryRun: DRY_RUN,
      vendorRateCount: vendorRates.size,
      tagRateCount: tagRates.size,
      sellerMappingCount: sellerMapping.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
