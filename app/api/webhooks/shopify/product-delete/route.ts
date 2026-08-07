/**
 * Shopify Product Delete Webhook
 * Removes deleted products from Postgres and 301s their URLs to the parent category
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/client';
import { deleteProductVariantsByProductId } from '@/lib/db/product-variants';
import { getProductAllocationByHandle, getProductAllocationByProductId } from '@/lib/db/product-allocations';
import { createManualRedirect } from '@/lib/redirects/manual';
import { parentPathFromProductUrl } from '@/lib/redirects/missing-product-redirect';
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

async function createDeletedProductRedirects(
  productId: string,
  handle: string | null
): Promise<string | null> {
  const allocation =
    (handle ? await getProductAllocationByHandle(handle) : null) ||
    (await getProductAllocationByProductId(productId));

  const parentCategory =
    allocation?.category_path?.trim() ||
    (allocation?.canonical_path ? parentPathFromProductUrl(allocation.canonical_path) : null) ||
    '/';

  const fromPaths = new Set<string>();
  if (allocation?.canonical_path) {
    fromPaths.add(allocation.canonical_path);
  }
  if (handle) {
    fromPaths.add(`/products/${handle}`);
    if (allocation?.category_path) {
      fromPaths.add(`${allocation.category_path.replace(/\/$/, '')}/${handle}`);
    }
  }

  if (fromPaths.size === 0) return null;

  for (const from of fromPaths) {
    if (from === parentCategory) continue;
    try {
      await createManualRedirect(from, parentCategory, '301', 'product-delete');
    } catch (error) {
      console.error('[Webhook] Failed to create delete redirect', from, '→', parentCategory, error);
    }
  }

  return parentCategory;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    if (!verifyShopifyWebhook(request, body)) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = JSON.parse(body);

    console.log('[Webhook] Product delete received:', product.id);

    const productId = `gid://shopify/Product/${product.id}`;
    const handle = typeof product.handle === 'string' ? product.handle : null;

    // Create parent-category redirects BEFORE wiping allocations
    const redirectTo = await createDeletedProductRedirects(productId, handle);
    if (redirectTo) {
      console.log('[Webhook] Created delete redirects →', redirectTo);
    }

    await deleteProductVariantsByProductId(productId);
    if (handle) {
      await sql`
        DELETE FROM product_content_overrides
        WHERE product_id = ${productId} OR product_handle = ${handle}
      `;
      await sql`
        DELETE FROM product_category_assignments
        WHERE product_id = ${productId} OR product_handle = ${handle}
      `;
    } else {
      await sql`DELETE FROM product_content_overrides WHERE product_id = ${productId}`;
      await sql`DELETE FROM product_category_assignments WHERE product_id = ${productId}`;
    }
    await sql`DELETE FROM products WHERE id = ${productId}`;

    await revalidateShopifyProductCaches(handle);

    console.log('[Webhook] ✅ Product deleted:', productId);

    return NextResponse.json({ ok: true, productId, redirectTo });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
