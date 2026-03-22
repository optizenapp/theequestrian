import { sql } from '@/lib/db/client';

export interface ProductAllocationInput {
  productId: string;
  productHandle: string;
  categoryPath: string;
}

export interface ProductAllocationRow {
  id: number;
  product_id: string;
  product_handle: string;
  canonical_path: string;
  category_path: string;
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
  created_at: string;
  updated_at: string;
}

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
};

const CATEGORY_CACHE_TTL_MS = Number(process.env.CATEGORY_ALLOC_CACHE_MS || 5 * 60 * 1000);
const categoryIdCache = new Map<string, { value: string[]; expiresAt: number }>();
const categoryHandleCache = new Map<string, { value: string[]; expiresAt: number }>();
let ensureAllocTableReady: Promise<void> | null = null;

const splitCategoryPath = (categoryPath: string) => {
  const normalized = normalizePath(categoryPath);
  const parts = normalized.replace(/^\//, '').split('/').filter(Boolean);
  return {
    normalized,
    parts,
    topLevel: parts[0] || null,
    parentCategory: parts[1] || null,
    subcategoryHandle: parts[2] || null,
  };
};

const ensureProductAllocationTable = async () => {
  if (!ensureAllocTableReady) {
    ensureAllocTableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS product_category_assignments (
          id SERIAL PRIMARY KEY,
          product_id TEXT NOT NULL UNIQUE,
          product_handle TEXT NOT NULL UNIQUE,
          canonical_path TEXT NOT NULL UNIQUE,
          category_path TEXT NOT NULL,
          top_level TEXT NOT NULL,
          parent_category TEXT,
          subcategory_handle TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_pca_category_path ON product_category_assignments(category_path)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pca_top_level ON product_category_assignments(top_level)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pca_parent_category ON product_category_assignments(parent_category)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pca_subcategory ON product_category_assignments(subcategory_handle)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pca_product_handle ON product_category_assignments(product_handle)`;
    })();
  }
  await ensureAllocTableReady;
};

function getCachedList(
  cache: Map<string, { value: string[]; expiresAt: number }>,
  key: string
): string[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedList(
  cache: Map<string, { value: string[]; expiresAt: number }>,
  key: string,
  value: string[]
) {
  cache.set(key, { value, expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS });
}

function clearCategoryAllocationCaches() {
  categoryIdCache.clear();
  categoryHandleCache.clear();
}

export async function getProductAllocationByProductId(productId: string) {
  await ensureProductAllocationTable();
  const result = await sql`
    SELECT *
    FROM product_category_assignments
    WHERE product_id = ${productId}
    LIMIT 1
  `;
  return (Array.isArray(result) ? result[0] : undefined) as ProductAllocationRow | undefined;
}

export async function getProductAllocationByHandle(productHandle: string) {
  await ensureProductAllocationTable();
  const result = await sql`
    SELECT *
    FROM product_category_assignments
    WHERE product_handle = ${productHandle}
    LIMIT 1
  `;
  return (Array.isArray(result) ? result[0] : undefined) as ProductAllocationRow | undefined;
}

export async function getProductAllocationMapByProductIds(productIds: string[]) {
  await ensureProductAllocationTable();
  if (productIds.length === 0) return new Map<string, string>();
  // Neon doesn't support .query() with placeholders - use template literals
  // Build a safe query by passing array to IN clause
  const result = await sql`
    SELECT product_id, canonical_path 
    FROM product_category_assignments 
    WHERE product_id = ANY(${productIds})
  `;
  const map = new Map<string, string>();
  const rows = (Array.isArray(result) ? result : []) as Array<{ product_id: string; canonical_path: string }>;
  for (const row of rows) {
    map.set(row.product_id, row.canonical_path);
  }
  return map;
}

export async function listProductAllocations(options: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await ensureProductAllocationTable();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const search = options.search?.trim();

  if (search) {
    const searchPattern = `%${search}%`;
    const result = await sql`
      SELECT 
        pca.*,
        p.title as product_title,
        p.vendor as product_vendor,
        p.product_type as product_type
      FROM product_category_assignments pca
      LEFT JOIN products p
        ON p.id = pca.product_id OR p.handle = pca.product_handle
      WHERE pca.product_handle ILIKE ${searchPattern} OR p.title ILIKE ${searchPattern}
      ORDER BY pca.updated_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    return Array.isArray(result) ? result : [];
  }

  const result = await sql`
    SELECT 
      pca.*,
      p.title as product_title,
      p.vendor as product_vendor,
      p.product_type as product_type
    FROM product_category_assignments pca
    LEFT JOIN products p
      ON p.id = pca.product_id OR p.handle = pca.product_handle
    ORDER BY pca.updated_at DESC 
    LIMIT ${limit} OFFSET ${offset}
  `;
  return Array.isArray(result) ? result : [];
}

/**
 * Get product IDs allocated to a specific category path
 * Includes products from the exact category and all child categories
 */
export async function getProductIdsByCategory(categoryPath: string): Promise<string[]> {
  await ensureProductAllocationTable();
  const normalized = normalizePath(categoryPath);
  const cached = getCachedList(categoryIdCache, normalized);
  if (cached) return cached;

  // Get products where category_path starts with the given path
  // This includes exact matches and child categories
  const result = await sql`
    SELECT product_id
    FROM product_category_assignments
    WHERE category_path = ${normalized}
       OR category_path LIKE ${normalized + '/%'}
    ORDER BY updated_at DESC
  `;
  
  const rows = (Array.isArray(result) ? result : []) as Array<{ product_id: string }>;
  const value = rows.map(row => row.product_id);
  setCachedList(categoryIdCache, normalized, value);
  return value;
}

/**
 * Get product handles allocated to a specific category path
 */
export async function getProductHandlesByCategory(categoryPath: string): Promise<string[]> {
  await ensureProductAllocationTable();
  const normalized = normalizePath(categoryPath);
  const cached = getCachedList(categoryHandleCache, normalized);
  if (cached) return cached;

  const result = await sql`
    SELECT product_handle
    FROM product_category_assignments
    WHERE category_path = ${normalized}
       OR category_path LIKE ${normalized + '/%'}
    ORDER BY updated_at DESC
  `;
  
  const rows = (Array.isArray(result) ? result : []) as Array<{ product_handle: string }>;
  const value = rows.map(row => row.product_handle);
  setCachedList(categoryHandleCache, normalized, value);
  return value;
}

export async function upsertProductAllocation(input: ProductAllocationInput) {
  await ensureProductAllocationTable();
  const { normalized, parts, topLevel, parentCategory, subcategoryHandle } = splitCategoryPath(input.categoryPath);
  if (!topLevel) {
    throw new Error('Category path must include at least a top-level segment.');
  }
  if (parts.length > 3) {
    throw new Error('Category path must be at most three levels deep.');
  }

  const canonicalPath = normalizePath(`${normalized}/${input.productHandle}`);

  const result = await sql`
    INSERT INTO product_category_assignments (
      product_id,
      product_handle,
      canonical_path,
      category_path,
      top_level,
      parent_category,
      subcategory_handle,
      updated_at
    )
    VALUES (
      ${input.productId},
      ${input.productHandle},
      ${canonicalPath},
      ${normalized},
      ${topLevel},
      ${parentCategory},
      ${subcategoryHandle},
      NOW()
    )
    ON CONFLICT (product_id) DO UPDATE
    SET product_handle = EXCLUDED.product_handle,
        canonical_path = EXCLUDED.canonical_path,
        category_path = EXCLUDED.category_path,
        top_level = EXCLUDED.top_level,
        parent_category = EXCLUDED.parent_category,
        subcategory_handle = EXCLUDED.subcategory_handle,
        updated_at = NOW()
    RETURNING *
  `;
  clearCategoryAllocationCaches();

  return (Array.isArray(result) ? result[0] : undefined) as ProductAllocationRow;
}

export async function deleteProductAllocation(productId: string) {
  await ensureProductAllocationTable();
  await sql`
    DELETE FROM product_category_assignments
    WHERE product_id = ${productId}
  `;
  clearCategoryAllocationCaches();
}

export async function getCategoryAllocationCounts() {
  await ensureProductAllocationTable();
  const result = await sql`
    SELECT 
      category_path,
      top_level,
      parent_category,
      subcategory_handle,
      COUNT(*)::int as product_count
    FROM product_category_assignments
    GROUP BY category_path, top_level, parent_category, subcategory_handle
  `;
  return (Array.isArray(result) ? result : []) as Array<{
    category_path: string;
    top_level: string;
    parent_category: string | null;
    subcategory_handle: string | null;
    product_count: number;
  }>;
}

export function buildCategoryPath(category: string, subcategory?: string, subsubcategory?: string) {
  const parts = [category, subcategory, subsubcategory].filter(Boolean);
  return normalizePath(parts.join('/'));
}
