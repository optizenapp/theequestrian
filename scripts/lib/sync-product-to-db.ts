import { sql } from '@/lib/db/client';
import { deleteProductVariantsByProductId, upsertProductVariantsFromStorefront } from '@/lib/db/product-variants';
import type { ShopifyProduct } from '@/types/shopify';

export async function syncProductToDb(
  product: Pick<
    ShopifyProduct,
    'id' | 'handle' | 'title' | 'description' | 'vendor' | 'productType' | 'tags' | 'images' | 'variants' | 'availableForSale' | 'createdAt'
  >
): Promise<'inserted' | 'updated' | 'failed'> {
  try {
    const firstImage = product.images.edges[0]?.node;
    const imageUrl = firstImage?.url || null;
    const imageAlt = firstImage?.altText || null;

    const staleRows = await sql`
      SELECT id FROM products
      WHERE handle = ${product.handle}
        AND id != ${product.id}
    `;
    for (const row of staleRows) {
      await deleteProductVariantsByProductId(String(row.id));
    }
    if (staleRows.length > 0) {
      await sql`
        DELETE FROM products
        WHERE handle = ${product.handle}
          AND id != ${product.id}
      `;
    }

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
        ${product.id},
        ${product.handle},
        ${product.title},
        ${product.description || ''},
        ${product.vendor || ''},
        ${product.productType || ''},
        ${product.tags || []},
        ${imageUrl},
        ${imageAlt},
        ${product.availableForSale},
        ${product.createdAt || new Date().toISOString()},
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
        shopify_created_at = EXCLUDED.shopify_created_at,
        updated_at = NOW()
    `;

    await upsertProductVariantsFromStorefront({
      id: product.id,
      handle: product.handle,
      variants: product.variants,
    });

    return 'inserted';
  } catch (error) {
    console.error(`[syncProductToDb] Failed to sync ${product.id}:`, error);
    return 'failed';
  }
}
