import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Import from the webkul-price-offset service
// We'll need to make these imports work in Vercel
const DRY_RUN = process.env.WEBKUL_DRY_RUN === 'true';

// Simple in-memory cache for rates (loaded on cold start)
let vendorRates: Map<string, { shippingCost: number }> | null = null;
let tagRates: Map<string, { shippingCost: number }> | null = null;
let sellerMapping: Map<string, string> | null = null;

async function loadRates() {
  if (vendorRates && tagRates && sellerMapping) {
    return { vendorRates, tagRates, sellerMapping };
  }

  // Load CSV files from the file system
  const fs = await import('fs');
  const path = await import('path');
  const { parse } = await import('csv-parse/sync');

  // Load from public folder (deployed with Vercel)
  const projectRoot = process.cwd();
  const publicPath = path.join(projectRoot, 'public');
  
  // Load vendor rates
  const vendorCsv = fs.readFileSync(
    path.join(publicPath, 'vendor-shipping-rates.csv'),
    'utf-8'
  );
  const vendorRecords = parse(vendorCsv, { columns: true, skip_empty_lines: true });
  vendorRates = new Map(
    vendorRecords.map((r: any) => [
      r.vendor_name,
      { shippingCost: parseFloat(r.shipping_cost) || 0 }
    ])
  );

  // Load tag rates
  const tagCsv = fs.readFileSync(
    path.join(publicPath, 'tag-shipping-rates.csv'),
    'utf-8'
  );
  const tagRecords = parse(tagCsv, { columns: true, skip_empty_lines: true });
  tagRates = new Map(
    tagRecords.map((r: any) => [
      r.tag_name,
      { shippingCost: parseFloat(r.shipping_cost) || 0 }
    ])
  );

  // Load seller mapping
  const sellerCsv = fs.readFileSync(
    path.join(publicPath, 'seller-to-vendor-mapping.csv'),
    'utf-8'
  );
  const sellerRecords = parse(sellerCsv, { columns: true, skip_empty_lines: true });
  sellerMapping = new Map(
    sellerRecords.map((r: any) => [r.seller_id, r.vendor_name])
  );

  return { vendorRates, tagRates, sellerMapping };
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

    console.log(`[Webhook] Received product update: ${productId}`);

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

    if (DRY_RUN) {
      // Dry-run mode: Log what WOULD happen
      console.log(`[Webhook] DRY RUN MODE - Product ${productId}`);
      
      const vendorName = product.seller_id 
        ? sellerMapping.get(String(product.seller_id)) 
        : undefined;
      const shippingRate = vendorName ? vendorRates.get(vendorName) : undefined;
      
      console.log(`[Webhook]   Product: ${product.product_name || productId}`);
      console.log(`[Webhook]   Vendor: ${vendorName || 'unknown'}`);
      console.log(`[Webhook]   Shipping Offset: $${shippingRate?.shippingCost || 0}`);
      console.log(`[Webhook]   Variants: ${product.variants?.length || 0}`);
      
      for (const variant of product.variants || []) {
        const oldPrice = Number(variant.price);
        const newPrice = shippingRate ? oldPrice + shippingRate.shippingCost : oldPrice;
        console.log(`[Webhook]     Variant ${variant.id}: $${oldPrice} → $${newPrice.toFixed(2)} (DRY RUN)`);
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

    // TODO: In live mode, call the actual processor
    // For now, just acknowledge receipt
    const duration = Date.now() - startTime;
    console.log(`[Webhook] Product ${productId} processed in ${duration}ms`);

    return NextResponse.json({
      ok: true,
      processingTime: duration,
      message: 'Webhook received (live mode not yet implemented)'
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
