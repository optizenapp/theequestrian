/**
 * Shopify Product Delete Webhook
 * Removes deleted products from Postgres
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { deleteProductVariantsByProductId } from '@/lib/db/product-variants';
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
    
    console.log('[Webhook] Product delete received:', product.id);
    
    // Construct Shopify GID
    const productId = `gid://shopify/Product/${product.id}`;
    
    // Delete from database
    await deleteProductVariantsByProductId(productId);
    await sql`DELETE FROM products WHERE id = ${productId}`;

    await revalidateShopifyProductCaches(product.handle || null);
    
    console.log('[Webhook] ✅ Product deleted:', productId);
    
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
