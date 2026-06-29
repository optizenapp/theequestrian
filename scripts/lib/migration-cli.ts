import * as fs from 'fs';
import { resolve } from 'path';
import { sql } from '@/lib/db/client';

export function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

export function loadHandlesFromFile(filePath: string): string[] {
  const absolute = resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Handles file not found: ${absolute}`);
  }
  const raw = fs.readFileSync(absolute, 'utf-8');
  const handles = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const handle = trimmed.split(',')[0]?.trim();
    if (handle) handles.add(handle);
  }
  return [...handles];
}

function brandHandlePrefix(brand: string): string {
  return `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-%`;
}

function vendorPrimaryLike(vendor: string): string {
  const token = vendor.trim().split(/\s+/)[0]?.toLowerCase();
  return token ? `${token}%` : `${vendor.trim().toLowerCase()}%`;
}

export async function fetchMigrationProducts(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  const vendor = options.vendor.trim();
  const brand = options.brand?.trim();
  const handles = options.handles?.filter(Boolean);

  if (handles && handles.length > 0 && brand) {
    return sql`
      SELECT p.id AS product_id, p.handle, p.title, p.available_for_sale, p.vendor, p.brand, p.brand_hub_handle,
        pca.product_id AS allocation_product_id, pca.canonical_path,
        co.product_handle AS override_handle,
        co.use_headless_meta_title, co.use_headless_meta_description, co.use_headless_title, co.use_headless_bullets
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
      WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      ORDER BY p.handle
    `;
  }

  if (handles && handles.length > 0) {
    return sql`
      SELECT p.id AS product_id, p.handle, p.title, p.available_for_sale, p.vendor, p.brand, p.brand_hub_handle,
        pca.product_id AS allocation_product_id, pca.canonical_path,
        co.product_handle AS override_handle,
        co.use_headless_meta_title, co.use_headless_meta_description, co.use_headless_title, co.use_headless_bullets
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
      WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      ORDER BY p.handle
    `;
  }

  if (brand) {
    const prefix = brandHandlePrefix(brand);
    return sql`
      SELECT p.id AS product_id, p.handle, p.title, p.available_for_sale, p.vendor, p.brand, p.brand_hub_handle,
        pca.product_id AS allocation_product_id, pca.canonical_path,
        co.product_handle AS override_handle,
        co.use_headless_meta_title, co.use_headless_meta_description, co.use_headless_title, co.use_headless_bullets
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
      WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      ORDER BY p.handle
    `;
  }

  return sql`
    SELECT p.id AS product_id, p.handle, p.title, p.available_for_sale, p.vendor, p.brand, p.brand_hub_handle,
      pca.product_id AS allocation_product_id, pca.canonical_path,
      co.product_handle AS override_handle,
      co.use_headless_meta_title, co.use_headless_meta_description, co.use_headless_title, co.use_headless_bullets
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    LEFT JOIN product_content_overrides co ON co.product_handle = p.handle
    WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    ORDER BY p.handle
  `;
}

export async function fetchStaleAllocations(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  const vendor = options.vendor.trim();
  const brand = options.brand?.trim();
  const handles = options.handles?.filter(Boolean);

  if (handles && handles.length > 0) {
    return sql`
      SELECT pca.product_handle, pca.product_id AS old_product_id, p.id AS new_product_id,
        pca.canonical_path, p.title, p.vendor
      FROM product_category_assignments pca
      INNER JOIN products p ON p.handle = pca.product_handle
      WHERE pca.product_id IS DISTINCT FROM p.id
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      ORDER BY pca.product_handle
    `;
  }

  if (brand) {
    const prefix = brandHandlePrefix(brand);
    return sql`
      SELECT pca.product_handle, pca.product_id AS old_product_id, p.id AS new_product_id,
        pca.canonical_path, p.title, p.vendor
      FROM product_category_assignments pca
      INNER JOIN products p ON p.handle = pca.product_handle
      WHERE pca.product_id IS DISTINCT FROM p.id
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      ORDER BY pca.product_handle
    `;
  }

  return sql`
    SELECT pca.product_handle, pca.product_id AS old_product_id, p.id AS new_product_id,
      pca.canonical_path, p.title, p.vendor
    FROM product_category_assignments pca
    INNER JOIN products p ON p.handle = pca.product_handle
    WHERE pca.product_id IS DISTINCT FROM p.id
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    ORDER BY pca.product_handle
  `;
}

export async function repointStaleAllocations(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  const vendor = options.vendor.trim();
  const brand = options.brand?.trim();
  const handles = options.handles?.filter(Boolean);

  if (handles && handles.length > 0) {
    const updated = await sql`
      UPDATE product_category_assignments pca
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pca.product_handle = p.handle
        AND pca.product_id IS DISTINCT FROM p.id
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      RETURNING pca.product_handle
    `;
    const overrides = await sql`
      UPDATE product_content_overrides pco
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pco.product_handle = p.handle
        AND (pco.product_id IS NULL OR pco.product_id IS DISTINCT FROM p.id)
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      RETURNING pco.product_handle
    `;
    return { updated, overrides };
  }

  if (brand) {
    const prefix = brandHandlePrefix(brand);
    const updated = await sql`
      UPDATE product_category_assignments pca
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pca.product_handle = p.handle
        AND pca.product_id IS DISTINCT FROM p.id
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      RETURNING pca.product_handle
    `;
    const overrides = await sql`
      UPDATE product_content_overrides pco
      SET product_id = p.id, updated_at = NOW()
      FROM products p
      WHERE pco.product_handle = p.handle
        AND (pco.product_id IS NULL OR pco.product_id IS DISTINCT FROM p.id)
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      RETURNING pco.product_handle
    `;
    return { updated, overrides };
  }

  const updated = await sql`
    UPDATE product_category_assignments pca
    SET product_id = p.id, updated_at = NOW()
    FROM products p
    WHERE pca.product_handle = p.handle
      AND pca.product_id IS DISTINCT FROM p.id
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    RETURNING pca.product_handle
  `;
  const overrides = await sql`
    UPDATE product_content_overrides pco
    SET product_id = p.id, updated_at = NOW()
    FROM products p
    WHERE pco.product_handle = p.handle
      AND (pco.product_id IS NULL OR pco.product_id IS DISTINCT FROM p.id)
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    RETURNING pco.product_handle
  `;
  return { updated, overrides };
}

export async function resetVendorPdpOverrides(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  const vendor = options.vendor.trim();
  const brand = options.brand?.trim();
  const handles = options.handles?.filter(Boolean);

  if (handles && handles.length > 0) {
    return sql`
      UPDATE product_content_overrides pco
      SET
        use_headless_title = FALSE,
        use_headless_meta_title = FALSE,
        use_headless_meta_description = FALSE,
        use_headless_description = FALSE,
        use_headless_bullets = FALSE,
        use_headless_top_description = FALSE,
        use_headless_bottom_description = FALSE,
        updated_at = NOW()
      FROM products p
      WHERE pco.product_handle = p.handle
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      RETURNING pco.product_handle
    `;
  }

  if (brand) {
    const prefix = brandHandlePrefix(brand);
    return sql`
      UPDATE product_content_overrides pco
      SET
        use_headless_title = FALSE,
        use_headless_meta_title = FALSE,
        use_headless_meta_description = FALSE,
        use_headless_description = FALSE,
        use_headless_bullets = FALSE,
        use_headless_top_description = FALSE,
        use_headless_bottom_description = FALSE,
        updated_at = NOW()
      FROM products p
      WHERE pco.product_handle = p.handle
        AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      RETURNING pco.product_handle
    `;
  }

  return sql`
    UPDATE product_content_overrides pco
    SET
      use_headless_title = FALSE,
      use_headless_meta_title = FALSE,
      use_headless_meta_description = FALSE,
      use_headless_description = FALSE,
      use_headless_bullets = FALSE,
      use_headless_top_description = FALSE,
      use_headless_bottom_description = FALSE,
      updated_at = NOW()
    FROM products p
    WHERE pco.product_handle = p.handle
      AND (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    RETURNING pco.product_handle
  `;
}

/** @deprecated Use resetVendorPdpOverrides — kept for callers that only reset description. */
export async function resetDescriptionOverrides(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  return resetVendorPdpOverrides(options);
}

export async function fetchStaleBrandProductRows(options: { vendor: string; brand: string }) {
  const vendor = options.vendor.trim();
  const brand = options.brand.trim();
  const prefix = brandHandlePrefix(brand);
  const glovesPrefix = `gloves-${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-%`;

  return sql`
    SELECT p.id, p.handle, p.title, p.vendor, p.brand
    FROM products p
    WHERE (
      LOWER(TRIM(COALESCE(p.brand, ''))) = LOWER(TRIM(${brand}))
      OR LOWER(p.handle) LIKE ${prefix}
      OR LOWER(p.handle) LIKE ${glovesPrefix}
    )
    AND NOT (
      LOWER(TRIM(COALESCE(p.vendor, ''))) = LOWER(TRIM(${vendor}))
      OR LOWER(TRIM(COALESCE(p.vendor, ''))) LIKE ${vendorPrimaryLike(vendor)}
    )
    ORDER BY p.handle
  ` as unknown as Array<{ id: string; handle: string; title: string; vendor: string | null; brand: string | null }>;
}

export async function deleteStaleBrandProducts(options: {
  vendor: string;
  brand: string;
}): Promise<Array<{ handle: string }>> {
  const staleRows = await fetchStaleBrandProductRows(options);
  if (staleRows.length === 0) return [];

  const ids = staleRows.map((r) => r.id);
  const handles = staleRows.map((r) => r.handle);

  const { deleteProductVariantsByProductId } = await import('@/lib/db/product-variants');

  for (const id of ids) {
    await deleteProductVariantsByProductId(id);
  }

  await sql`DELETE FROM product_category_assignments WHERE product_id = ANY(${ids}) OR product_handle = ANY(${handles})`;
  await sql`DELETE FROM products WHERE id = ANY(${ids})`;

  return staleRows.map((r) => ({ handle: r.handle }));
}

export async function fetchMigrationProductsForExport(options: {
  vendor: string;
  brand?: string;
  handles?: string[];
}) {
  const vendor = options.vendor.trim();
  const brand = options.brand?.trim();
  const handles = options.handles?.filter(Boolean);

  if (handles && handles.length > 0) {
    return sql`
      SELECT p.id, p.handle, p.title, p.vendor, p.brand, p.available_for_sale,
        pca.canonical_path, pca.product_id AS allocation_product_id,
        (pca.product_id IS NOT NULL AND pca.product_id IS DISTINCT FROM p.id) AS stale_allocation_id
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND p.handle = ANY(${handles})
      ORDER BY p.handle
    `;
  }

  if (brand) {
    const prefix = brandHandlePrefix(brand);
    return sql`
      SELECT p.id, p.handle, p.title, p.vendor, p.brand, p.available_for_sale,
        pca.canonical_path, pca.product_id AS allocation_product_id,
        (pca.product_id IS NOT NULL AND pca.product_id IS DISTINCT FROM p.id) AS stale_allocation_id
      FROM products p
      LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
      WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
        AND (LOWER(TRIM(p.brand)) = LOWER(TRIM(${brand})) OR LOWER(p.handle) LIKE ${prefix})
      ORDER BY p.handle
    `;
  }

  return sql`
    SELECT p.id, p.handle, p.title, p.vendor, p.brand, p.available_for_sale,
      pca.canonical_path, pca.product_id AS allocation_product_id,
      (pca.product_id IS NOT NULL AND pca.product_id IS DISTINCT FROM p.id) AS stale_allocation_id
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_handle = p.handle
    WHERE (LOWER(TRIM(p.vendor)) = LOWER(TRIM(${vendor})) OR LOWER(TRIM(p.vendor)) LIKE ${vendorPrimaryLike(vendor)})
    ORDER BY p.handle
  `;
}
