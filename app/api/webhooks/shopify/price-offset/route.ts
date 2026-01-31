/**
 * Shopify Price Offset Webhook
 * Automatically applies shipping offsets when products are created or updated
 * 
 * Triggers:
 * - products/create: New products added to Shopify
 * - products/update: Products updated (including draft → published)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Pool } from 'pg';
import { loadShippingRates, resolveShippingOffset, normalizeTags } from '@/lib/shipping/rates';

/**
 * Verify webhook is from Shopify
 */
function verifyShopifyWebhook(request: NextRequest, body: string): boolean {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!hmacHeader || !secret) {
    return false;
  }
  
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  return hash === hmacHeader;
}

/**
 * Update variant price in Shopify
 */
async function updateVariantPrice(variantId: string, price: string, compareAtPrice: string | null) {
  const payload: any = {
    variant: {
      id: variantId,
      price,
    },
  };

  if (compareAtPrice !== undefined) {
    payload.variant.compare_at_price = compareAtPrice;
  }

  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/variants/${variantId}.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update variant ${variantId}: ${error}`);
  }
}

/**
 * Log to audit database
 */
async function logToAudit(record: {
  variantId: string;
  productId: string;
  vendorName: string;
  shopifyPrice: number;
  shippingOffset: number;
  adjustedPrice: number;
}) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query(
      `
        INSERT INTO shopify_price_audit (
          variant_id, product_id, vendor_name, tags,
          shopify_price, shopify_compare_at, shipping_offset,
          adjusted_price, adjusted_compare_at, tag_match, last_source, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (variant_id) DO UPDATE SET
          vendor_name = EXCLUDED.vendor_name,
          shopify_price = EXCLUDED.shopify_price,
          shipping_offset = EXCLUDED.shipping_offset,
          adjusted_price = EXCLUDED.adjusted_price,
          last_source = EXCLUDED.last_source,
          updated_at = NOW()
      `,
      [
        record.variantId,
        record.productId,
        record.vendorName,
        [], // tags
        record.shopifyPrice,
        null, // shopify_compare_at
        record.shippingOffset,
        record.adjustedPrice,
        null, // adjusted_compare_at
        null, // tag_match
        'webhook',
      ]
    );
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for verification
    const body = await request.text();
    
    // Verify webhook authenticity
    if (!verifyShopifyWebhook(request, body)) {
      console.error('[Price Offset Webhook] Invalid signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse product data
    const product = JSON.parse(body);
    
    console.log('[Price Offset Webhook] Product received:', {
      id: product.id,
      title: product.title,
      vendor: product.vendor,
      status: product.status,
    });
    
    // Only process published products
    if (product.status !== 'active') {
      console.log('[Price Offset Webhook] Skipping non-published product');
      return NextResponse.json({ 
        ok: true, 
        skipped: true,
        reason: 'Product not published'
      });
    }
    
    // Load shipping rates from Postgres
    const rates = await loadShippingRates();
    const tags = normalizeTags(product.tags);
    const { shippingOffset, tagMatch } = resolveShippingOffset(
      product.vendor || '',
      tags,
      rates
    );
    
    // Check if vendor has an offset
    if (shippingOffset === null || shippingOffset === 0) {
      console.log('[Price Offset Webhook] No offset for vendor:', product.vendor);
      return NextResponse.json({ 
        ok: true, 
        skipped: true,
        reason: 'No shipping offset for vendor'
      });
    }
    
    console.log(`[Price Offset Webhook] Applying $${shippingOffset} offset to ${product.variants?.length || 0} variants`);
    
    // Update each variant
    let updated = 0;
    const PRICE_EPSILON = 0.01;
    
    for (const variant of product.variants || []) {
      const currentPrice = parseFloat(variant.price);
      const adjustedPrice = Number((currentPrice + shippingOffset).toFixed(2));
      
      // Check if update is needed
      const shouldUpdate = Math.abs(currentPrice - adjustedPrice) > PRICE_EPSILON;
      
      if (shouldUpdate) {
        await updateVariantPrice(
          variant.id.toString(),
          adjustedPrice.toFixed(2),
          null
        );
        updated++;
        console.log(`[Price Offset Webhook] ✓ Variant ${variant.id}: $${currentPrice} → $${adjustedPrice}`);
      }
      
      // Log to audit database
      await logToAudit({
        variantId: variant.id.toString(),
        productId: product.id.toString(),
        vendorName: product.vendor || '',
        shopifyPrice: currentPrice,
        shippingOffset,
        adjustedPrice,
      });
    }
    
    console.log(`[Price Offset Webhook] ✅ Complete: ${updated} variants updated`);
    
    return NextResponse.json({ 
      ok: true, 
      productId: product.id,
      vendor: product.vendor,
      variantsUpdated: updated,
      shippingOffset
    });
  } catch (error) {
    console.error('[Price Offset Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
