/**
 * Shopify Product Update Webhook
 * Syncs product changes from Shopify to Postgres in real-time
 * 
 * Note: Does NOT sync price or inventory - those are always fetched real-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { upsertProductVariantsFromWebhook } from '@/lib/db/product-variants';
import crypto from 'crypto';
import { revalidateShopifyProductCaches } from '@/lib/cache/shopify-revalidate';

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

export async function POST(request: NextRequest) {
  try {
    // Get raw body for verification
    const body = await request.text();
    
    // Verify webhook authenticity
    if (!verifyShopifyWebhook(request, body)) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse product data
    const product = JSON.parse(body);
    
    console.log('[Webhook] Product update received:', product.id, product.title);
    
    // Extract first image
    const firstImage = product.images?.[0];
    const imageUrl = firstImage?.src || null;
    const imageAlt = firstImage?.alt || null;
    
    // Extract tags (Shopify sends as comma-separated string)
    const tags = typeof product.tags === 'string' 
      ? product.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      : (product.tags || []);
    
    // Construct Shopify GID
    const productId = `gid://shopify/Product/${product.id}`;
    
    // Update database (upsert)
    // Note: We do NOT store price or inventory - always fetched real-time
    await sql`
      INSERT INTO products (
        id,
        handle,
        title,
        description,
        vendor,
        product_type,
        tags,
        image_url,
        image_alt,
        available_for_sale,
        shopify_created_at,
        synced_at,
        updated_at
      ) VALUES (
        ${productId},
        ${product.handle},
        ${product.title},
        ${product.body_html || ''},
        ${product.vendor || ''},
        ${product.product_type || ''},
        ${tags},
        ${imageUrl},
        ${imageAlt},
        ${product.status === 'active'},
        ${product.created_at || new Date().toISOString()},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        handle = EXCLUDED.handle,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        vendor = EXCLUDED.vendor,
        product_type = EXCLUDED.product_type,
        tags = EXCLUDED.tags,
        image_url = EXCLUDED.image_url,
        image_alt = EXCLUDED.image_alt,
        available_for_sale = EXCLUDED.available_for_sale,
        updated_at = NOW()
    `;
    await upsertProductVariantsFromWebhook({
      productId,
      productHandle: product.handle,
      variants: Array.isArray(product.variants) ? product.variants : [],
      options: Array.isArray(product.options) ? product.options : [],
    });

    revalidateShopifyProductCaches(product.handle || null);
    
    console.log('[Webhook] ✅ Product synced:', productId);
    
    return NextResponse.json({ ok: true, productId });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
