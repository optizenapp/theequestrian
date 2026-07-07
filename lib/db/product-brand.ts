import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import {
  buildBrandDisplayLexicon,
  resolveProductBrandDisplay,
} from '@/lib/brands/resolve-product-brand-display';

export type ProductBrandDisplay = {
  brand: string | null;
  brandHubHandle: string | null;
};

/**
 * Canonical brand label + hub handle for `/brands/[handle]`.
 * Uses DB columns when set; otherwise resolves vendor-as-brand or title inference
 * (same sources as Webkul onboard / parent-brand rollup).
 */
export async function getProductBrandForDisplay(handle: string): Promise<ProductBrandDisplay> {
  if (!handle) return { brand: null, brandHubHandle: null };
  try {
    await ensureProductsBrandColumns();
    const rows = (await sql`
      SELECT brand, brand_hub_handle, vendor, title, tags
      FROM products
      WHERE handle = ${handle}
      LIMIT 1
    `) as unknown as Array<{
      brand: string | null;
      brand_hub_handle: string | null;
      vendor: string | null;
      title: string | null;
      tags: string[] | null;
    }>;
    const r = rows[0];
    if (!r) return { brand: null, brandHubHandle: null };

    const brands = await getAllPublishedBrandContent();
    const lexicon = buildBrandDisplayLexicon(brands);

    return resolveProductBrandDisplay(
      {
        brand: r.brand,
        brandHubHandle: r.brand_hub_handle,
        vendor: r.vendor,
        title: r.title,
        tags: Array.isArray(r.tags) ? r.tags : [],
      },
      lexicon
    );
  } catch {
    return { brand: null, brandHubHandle: null };
  }
}

export async function getProductBrandByHandle(handle: string): Promise<string | null> {
  const d = await getProductBrandForDisplay(handle);
  return d.brand;
}
