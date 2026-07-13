import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { BrandInventory, InventoryProduct } from './types';

function handleToDisplayName(handle: string): string {
  return handle
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function dominantBrand(products: InventoryProduct[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const p of products) {
    const b = p.brand?.trim();
    if (!b) continue;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let best = fallback;
  let bestN = 0;
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name;
      bestN = n;
    }
  }
  return best;
}

/** Inventory products that likely belong to a brand hub handle. */
export async function inventoryBrand(
  sql: NeonQueryFunction<false, false>,
  handle: string
): Promise<BrandInventory> {
  const phrase = handle.replace(/-/g, ' ');
  const likeHandle = `%${handle}%`;
  const likePhrase = `%${phrase}%`;

  const rows = (await sql`
    SELECT
      p.handle,
      p.title,
      p.brand,
      p.vendor,
      (
        SELECT pca.canonical_path
        FROM product_category_assignments pca
        WHERE pca.product_id = p.id
        ORDER BY pca.canonical_path
        LIMIT 1
      ) AS canonical_path
    FROM products p
    WHERE
      LOWER(TRIM(COALESCE(p.brand, ''))) LIKE ${likePhrase}
      OR LOWER(COALESCE(p.handle, '')) LIKE ${likeHandle}
      OR LOWER(COALESCE(p.title, '')) LIKE ${likePhrase}
    ORDER BY p.title ASC
    LIMIT 250
  `) as InventoryProduct[];

  const brandCounts: Record<string, number> = {};
  const pathSet = new Set<string>();
  for (const p of rows) {
    const b = p.brand?.trim();
    if (b) brandCounts[b] = (brandCounts[b] ?? 0) + 1;
    if (p.canonical_path?.startsWith('/')) {
      const parts = p.canonical_path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        pathSet.add(`/${parts.slice(0, 2).join('/')}`);
      }
      if (parts.length >= 3) {
        pathSet.add(`/${parts.slice(0, 3).join('/')}`);
      }
    }
  }

  const fallback = handleToDisplayName(handle);
  const displayName = dominantBrand(rows, fallback);

  return {
    handle,
    displayName,
    products: rows,
    totalCount: rows.length,
    brandCounts,
    categoryPaths: [...pathSet].slice(0, 12),
    sampleTitles: rows.slice(0, 40).map((p) => p.title),
  };
}
