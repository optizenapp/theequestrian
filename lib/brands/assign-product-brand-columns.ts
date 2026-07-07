import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import {
  buildBrandDisplayLexicon,
  resolveProductBrandDisplay,
  type BrandLexiconEntry,
} from '@/lib/brands/resolve-product-brand-display';

type ProductBrandRow = {
  id: string;
  handle: string;
  brand: string | null;
  brand_hub_handle: string | null;
  vendor: string | null;
  title: string | null;
  tags: string[] | null;
};

async function loadLexicon(): Promise<BrandLexiconEntry[]> {
  const brands = await getAllPublishedBrandContent();
  return buildBrandDisplayLexicon(brands);
}

function resolveRow(row: ProductBrandRow, lexicon: BrandLexiconEntry[]) {
  return resolveProductBrandDisplay(
    {
      brand: row.brand,
      brandHubHandle: row.brand_hub_handle,
      vendor: row.vendor,
      title: row.title,
      tags: Array.isArray(row.tags) ? row.tags : [],
    },
    lexicon
  );
}

/** Persist resolved brand columns when missing (Collective sync / migration backfill). */
export async function assignBrandColumnsForHandles(handles: string[]): Promise<number> {
  const unique = [...new Set(handles.map((h) => h.trim()).filter(Boolean))];
  if (unique.length === 0) return 0;

  await ensureProductsBrandColumns();
  const lexicon = await loadLexicon();

  const rows = (await sql`
    SELECT id, handle, brand, brand_hub_handle, vendor, title, tags
    FROM products
    WHERE handle = ANY(${unique})
      AND (brand IS NULL OR brand_hub_handle IS NULL)
  `) as unknown as ProductBrandRow[];

  let updated = 0;
  for (const row of rows) {
    const resolved = resolveRow(row, lexicon);
    if (!resolved.brand || !resolved.brandHubHandle) continue;

    await sql`
      UPDATE products
      SET brand = ${resolved.brand},
          brand_hub_handle = ${resolved.brandHubHandle},
          updated_at = NOW()
      WHERE id = ${row.id}
        AND (brand IS NULL OR brand_hub_handle IS NULL)
    `;
    updated += 1;
  }

  return updated;
}

/** Backfill all products for a vendor missing brand columns. */
export async function assignBrandColumnsForVendor(vendor: string): Promise<number> {
  const vendorTrimmed = vendor.trim();
  if (!vendorTrimmed) return 0;

  await ensureProductsBrandColumns();
  const lexicon = await loadLexicon();
  const token = vendorTrimmed.split(/\s+/)[0]?.toLowerCase() || vendorTrimmed.toLowerCase();
  const likePattern = `${token}%`;

  const rows = (await sql`
    SELECT id, handle, brand, brand_hub_handle, vendor, title, tags
    FROM products
    WHERE (brand IS NULL OR brand_hub_handle IS NULL)
      AND (
        LOWER(TRIM(vendor)) = LOWER(TRIM(${vendorTrimmed}))
        OR LOWER(TRIM(vendor)) LIKE ${likePattern}
      )
  `) as unknown as ProductBrandRow[];

  let updated = 0;
  for (const row of rows) {
    const resolved = resolveRow(row, lexicon);
    if (!resolved.brand || !resolved.brandHubHandle) continue;

    await sql`
      UPDATE products
      SET brand = ${resolved.brand},
          brand_hub_handle = ${resolved.brandHubHandle},
          updated_at = NOW()
      WHERE id = ${row.id}
        AND (brand IS NULL OR brand_hub_handle IS NULL)
    `;
    updated += 1;
  }

  return updated;
}
