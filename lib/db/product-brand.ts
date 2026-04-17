import { sql } from '@/lib/db/client';

export type ProductBrandDisplay = {
  brand: string | null;
  brandHubHandle: string | null;
};

/**
 * Canonical brand label + hub handle for `/brands/[handle]` (nulls if unset or DB error).
 */
export async function getProductBrandForDisplay(handle: string): Promise<ProductBrandDisplay> {
  if (!handle) return { brand: null, brandHubHandle: null };
  try {
    const rows = (await sql`
      SELECT brand, brand_hub_handle FROM products WHERE handle = ${handle} LIMIT 1
    `) as unknown as Array<{ brand: string | null; brand_hub_handle: string | null }>;
    const r = rows[0];
    if (!r) return { brand: null, brandHubHandle: null };
    const brand = r.brand?.trim() || null;
    const brandHubHandle = r.brand_hub_handle?.trim() || null;
    return { brand, brandHubHandle };
  } catch {
    return { brand: null, brandHubHandle: null };
  }
}

export async function getProductBrandByHandle(handle: string): Promise<string | null> {
  const d = await getProductBrandForDisplay(handle);
  return d.brand;
}
