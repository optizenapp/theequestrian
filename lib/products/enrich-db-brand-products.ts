import type { ProductQueryResult } from '@/lib/db/queries';
import { getProductsByHandlesAlt } from '@/lib/shopify/products-by-handles';

type BrandProductRow = ProductQueryResult & { canonical_path: string | null };

export async function enrichDbBrandProducts(
  rows: BrandProductRow[]
): Promise<BrandProductRow[]> {
  if (rows.length === 0) return rows;

  try {
    const shopifyProducts = await getProductsByHandlesAlt(rows.map((row) => row.handle));
    const byHandle = new Map(
      shopifyProducts.map((product) => [
        product.handle,
        {
          image_url: product.images.edges[0]?.node?.url || null,
          image_alt: product.images.edges[0]?.node?.altText || null,
          vendor: product.vendor || null,
        },
      ])
    );

    return rows.map((row) => {
      const shopify = byHandle.get(row.handle);
      if (!shopify) return row;

      return {
        ...row,
        image_url: shopify.image_url || row.image_url,
        image_alt: shopify.image_alt || row.image_alt,
        vendor: row.vendor || shopify.vendor || row.vendor,
      };
    });
  } catch (error) {
    console.warn('[enrichDbBrandProducts] Shopify image enrichment skipped:', error);
    return rows;
  }
}
