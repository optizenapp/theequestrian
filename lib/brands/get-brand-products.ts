import { sql } from '@/lib/db/client';
import type { BrandContentRow } from '@/lib/content/brand-content';
import {
  applyLiveStatus,
  dbProductToShopifyFormat,
  getLiveStatusByProductIds,
} from '@/lib/products/postgres-adapter';
import { enrichDbBrandProducts } from '@/lib/products/enrich-db-brand-products';
import { fetchProductVariantsByHandles } from '@/lib/shopify/fetch-product-variants-by-handles';
import { getProductByHandle } from '@/lib/shopify/products';
import {
  filterByBrand,
  filterByColor,
  filterBySize,
  getColorOptions,
  getPriceRange,
  getSizeOptions,
} from '@/lib/filters/product-filters';
import type { ProductQueryResult } from '@/lib/db/queries';
import type { ProductWithPrimaryCollection } from '@/types/shopify';

type BrandRule = { column?: string; relation?: string; condition?: string };
type BrandProductRow = ProductQueryResult & { canonical_path: string | null };

export type BrandFilters = {
  brands?: string[];
  sizes?: string[];
  colors?: string[];
};

type BrandFacets = {
  brands: { value: string; count: number; displayName: string }[];
  sizes: { value: string; count: number }[];
  colors: { value: string; count: number; originalValue: string }[];
  price: { min: number; max: number };
};

const PRICE_FACET_FALLBACK = { min: 0, max: 500 };

const EMPTY_RESULT = {
  products: [] as ReturnType<typeof dbProductToShopifyFormat>[],
  productUrls: new Map<string, string>(),
  totalCount: 0,
  pageInfo: { hasNextPage: false, endCursor: null as string | null },
  facets: {
    brands: [] as BrandFacets['brands'],
    sizes: [] as BrandFacets['sizes'],
    colors: [] as BrandFacets['colors'],
    price: PRICE_FACET_FALLBACK,
  } as BrandFacets,
};

// ---------------------------------------------------------------------------
// Cursor / pagination
// ---------------------------------------------------------------------------

function parseOffset(after: string | null): number {
  if (!after) return 0;
  const match = after.match(/^dbbrand:(\d+)$/);
  return match ? Math.max(0, parseInt(match[1], 10)) : 0;
}

// ---------------------------------------------------------------------------
// Brand rule → SQL
// ---------------------------------------------------------------------------

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function asLowerArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `'${escapeLiteral(v.toLowerCase())}'`).join(',');
  return `ARRAY[${escaped}]::text[]`;
}

function parseRules(rawRules: string | null, handle: string): BrandRule[] {
  if (!rawRules) {
    return [{ column: 'HANDLE', relation: 'STARTS_WITH', condition: `${handle}-` }];
  }
  try {
    const parsed = JSON.parse(rawRules) as BrandRule[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [{ column: 'HANDLE', relation: 'STARTS_WITH', condition: `${handle}-` }];
  } catch {
    return [{ column: 'HANDLE', relation: 'STARTS_WITH', condition: `${handle}-` }];
  }
}

function buildRuleClause(rule: BrandRule): string | null {
  const column = rule.column?.trim().toUpperCase();
  const relation = rule.relation?.trim().toUpperCase() || 'EQUALS';
  const condition = rule.condition?.trim();
  if (!column || !condition) return null;

  const escaped = escapeLiteral(condition.toLowerCase());

  if (column === 'TAG') {
    return `EXISTS (SELECT 1 FROM unnest(COALESCE(p.tags, ARRAY[]::text[])) AS t(tag) WHERE LOWER(tag) = '${escaped}')`;
  }
  if (column === 'VENDOR') {
    return `LOWER(COALESCE(p.vendor, '')) = '${escaped}'`;
  }
  if (column === 'TITLE') {
    return relation === 'EQUALS'
      ? `LOWER(COALESCE(p.title, '')) = '${escaped}'`
      : `LOWER(COALESCE(p.title, '')) LIKE '%${escaped}%'`;
  }
  if (column === 'HANDLE') {
    if (relation === 'STARTS_WITH') return `LOWER(COALESCE(p.handle, '')) LIKE '${escaped}%'`;
    return relation === 'EQUALS'
      ? `LOWER(COALESCE(p.handle, '')) = '${escaped}'`
      : `LOWER(COALESCE(p.handle, '')) LIKE '%${escaped}%'`;
  }
  return null;
}

/**
 * Returns the SQL WHERE clause fragment that identifies brand products.
 * Does NOT include size/color sub-selects — those are added by buildWhereClause.
 */
function buildBrandBaseClause(brand: BrandContentRow): string | null {
  const clauses = parseRules(brand.rules, brand.handle)
    .map(buildRuleClause)
    .filter(Boolean) as string[];
  if (clauses.length === 0) return null;
  return clauses.map((c) => `(${c})`).join(' OR ');
}

/**
 * Builds a full WHERE clause combining brand base clause with optional
 * size and color filters (via variant_options JOINs, same pattern as
 * buildCategoryWhereClause in postgres-adapter.ts).
 */
function buildWhereClause(
  brandBase: string,
  filters?: { sizes?: string[]; colors?: string[]; brands?: string[] }
): string {
  const conditions: string[] = [`(${brandBase})`];

  if (filters?.brands?.length) {
    const arr = asLowerArrayLiteral(filters.brands);
    conditions.push(`(
      LOWER(COALESCE(p.vendor, '')) = ANY(${arr})
      OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.tags, ARRAY[]::text[])) AS t(tag) WHERE LOWER(tag) = ANY(${arr}))
    )`);
  }

  if (filters?.sizes?.length) {
    const arr = asLowerArrayLiteral(filters.sizes);
    conditions.push(`EXISTS (
      SELECT 1 FROM variant_options vo
      WHERE vo.product_id = p.id
        AND vo.option_name_normalized = 'size'
        AND vo.option_value_normalized = ANY(${arr})
    )`);
  }

  if (filters?.colors?.length) {
    const arr = asLowerArrayLiteral(filters.colors);
    conditions.push(`EXISTS (
      SELECT 1 FROM variant_options vo
      WHERE vo.product_id = p.id
        AND vo.option_name_normalized IN ('color', 'colour')
        AND vo.option_value_normalized = ANY(${arr})
    )`);
  }

  return conditions.join(' AND ');
}

// ---------------------------------------------------------------------------
// DB-first fast path (uses variant_options — same as category pages)
// ---------------------------------------------------------------------------

async function getBrandFacetsFromDb(
  brandBase: string,
  filters?: BrandFilters
): Promise<BrandFacets> {
  // Disjunctive facets: each dimension computed without filtering on itself
  const sizeWhere = buildWhereClause(brandBase, { brands: filters?.brands, colors: filters?.colors });
  const colorWhere = buildWhereClause(brandBase, { brands: filters?.brands, sizes: filters?.sizes });
  const brandWhere = buildWhereClause(brandBase, { sizes: filters?.sizes, colors: filters?.colors });

  const [brandRows, sizeRows, colorRows] = await Promise.all([
    sql.unsafe(`
      SELECT
        LOWER(COALESCE(p.vendor, '')) AS value,
        MIN(COALESCE(p.vendor, '')) AS display_name,
        COUNT(DISTINCT p.id)::int AS count
      FROM products p
      WHERE ${brandWhere}
        AND COALESCE(p.vendor, '') <> ''
      GROUP BY LOWER(COALESCE(p.vendor, ''))
      ORDER BY count DESC
    `) as unknown as Array<{ value: string; display_name: string; count: number }>,

    sql.unsafe(`
      SELECT
        vo.option_value AS value,
        COUNT(DISTINCT p.id)::int AS count
      FROM products p
      JOIN variant_options vo ON vo.product_id = p.id
      WHERE ${sizeWhere}
        AND vo.option_name_normalized = 'size'
        AND COALESCE(vo.option_value, '') <> ''
      GROUP BY vo.option_value
      ORDER BY count DESC
    `) as unknown as Array<{ value: string; count: number }>,

    sql.unsafe(`
      SELECT
        vo.option_value_normalized AS value,
        MIN(vo.option_value) AS original_value,
        COUNT(DISTINCT p.id)::int AS count
      FROM products p
      JOIN variant_options vo ON vo.product_id = p.id
      WHERE ${colorWhere}
        AND vo.option_name_normalized IN ('color', 'colour')
        AND COALESCE(vo.option_value_normalized, '') <> ''
      GROUP BY vo.option_value_normalized
      ORDER BY count DESC
    `) as unknown as Array<{ value: string; original_value: string; count: number }>,
  ]);

  return {
    brands: (brandRows as Array<{ value: string; display_name: string; count: number }>)
      .filter((r) => r.value)
      .map((r) => ({ value: r.value, count: Number(r.count), displayName: r.display_name || r.value }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),

    sizes: (sizeRows as Array<{ value: string; count: number }>)
      .map((r) => ({ value: r.value, count: Number(r.count) }))
      .sort((a, b) => {
        const an = parseFloat(a.value);
        const bn = parseFloat(b.value);
        return !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : a.value.localeCompare(b.value);
      }),

    colors: (colorRows as Array<{ value: string; original_value: string; count: number }>)
      .map((r) => ({ value: r.value, count: Number(r.count), originalValue: r.original_value }))
      .sort((a, b) => a.originalValue.localeCompare(b.originalValue)),

    price: PRICE_FACET_FALLBACK,
  };
}

async function fetchBrandProductsFast(
  brand: BrandContentRow,
  brandBase: string,
  limit: number,
  offset: number,
  filters?: BrandFilters
): Promise<ReturnType<typeof getBrandProductsFromDb>> {
  const whereClause = buildWhereClause(brandBase, filters);

  const [countResult, rowsResult] = await Promise.all([
    sql.unsafe(`
      SELECT COUNT(*)::int AS total
      FROM products p
      WHERE ${whereClause}
    `) as unknown as Array<{ total: number }>,

    sql.unsafe(`
      SELECT
        p.id, p.handle, p.title, p.description,
        p.vendor, p.product_type, p.tags,
        p.image_url, p.image_alt,
        p.available_for_sale, p.shopify_created_at,
        pca.canonical_path
      FROM products p
      LEFT JOIN LATERAL (
        SELECT canonical_path
        FROM product_category_assignments
        WHERE product_id = p.id
        ORDER BY canonical_path
        LIMIT 1
      ) pca ON true
      WHERE ${whereClause}
      ORDER BY p.available_for_sale DESC, p.shopify_created_at DESC NULLS LAST, p.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as unknown as BrandProductRow[],
  ]);

  const totalCount = Number((countResult as Array<{ total: number }>)[0]?.total || 0);
  const rows = (Array.isArray(rowsResult) ? rowsResult : []) as BrandProductRow[];

  const enrichedRows = await enrichDbBrandProducts(rows);
  const mappedProducts = enrichedRows.map(dbProductToShopifyFormat);
  const [liveStatus, facets] = await Promise.all([
    getLiveStatusByProductIds(mappedProducts.map((p) => p.id)),
    getBrandFacetsFromDb(brandBase, filters),
  ]);
  const products = applyLiveStatus(mappedProducts, liveStatus);

  const productUrls = new Map<string, string>();
  for (const row of enrichedRows) {
    productUrls.set(row.id, row.canonical_path || `/products/${row.handle}`);
  }

  const hasNextPage = offset + limit < totalCount;
  return {
    products,
    productUrls,
    totalCount,
    pageInfo: { hasNextPage, endCursor: hasNextPage ? `dbbrand:${offset + limit}` : null },
    facets,
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when variant_options table doesn't exist locally)
// ---------------------------------------------------------------------------

const HANDLE_FALLBACK_CHUNK = 10;

async function attachStorefrontVariants(
  products: ProductWithPrimaryCollection[]
): Promise<ProductWithPrimaryCollection[]> {
  const missingHandles = products.filter((p) => !p.variants?.edges?.length).map((p) => p.handle);
  if (missingHandles.length === 0) return products;

  const variantMap = await fetchProductVariantsByHandles(missingHandles);

  let merged = products.map((p) => {
    const v = variantMap.get(p.handle.toLowerCase());
    return v?.edges?.length ? { ...p, variants: v } : p;
  });

  const stillMissing = merged.filter((p) => !p.variants?.edges?.length).map((p) => p.handle);
  if (stillMissing.length === 0) return merged;

  for (let i = 0; i < stillMissing.length; i += HANDLE_FALLBACK_CHUNK) {
    const slice = stillMissing.slice(i, i + HANDLE_FALLBACK_CHUNK);
    const rows = await Promise.all(
      slice.map(async (handle) => ({
        handleKey: handle.toLowerCase(),
        variants: (await getProductByHandle(handle))?.variants,
      }))
    );
    const byLower = new Map(rows.map((r) => [r.handleKey, r.variants]));
    merged = merged.map((p) => {
      if (p.variants?.edges?.length) return p;
      const v = byLower.get(p.handle.toLowerCase());
      return v?.edges?.length ? { ...p, variants: v } : p;
    });
  }

  return merged;
}

function applyInMemoryFilters(
  products: ProductWithPrimaryCollection[],
  filters?: BrandFilters
): ProductWithPrimaryCollection[] {
  let filtered = products;
  if (filters?.brands?.length) filtered = filterByBrand(filtered, filters.brands) as ProductWithPrimaryCollection[];
  if (filters?.sizes?.length) filtered = filterBySize(filtered, filters.sizes) as ProductWithPrimaryCollection[];
  if (filters?.colors?.length) filtered = filterByColor(filtered, filters.colors) as ProductWithPrimaryCollection[];
  return filtered;
}

function buildFacetsInMemory(
  allProducts: ProductWithPrimaryCollection[],
  filters?: BrandFilters
): BrandFacets {
  const withoutSize = applyInMemoryFilters(allProducts, { brands: filters?.brands, colors: filters?.colors });
  const withoutColor = applyInMemoryFilters(allProducts, { brands: filters?.brands, sizes: filters?.sizes });
  const withoutBrand = applyInMemoryFilters(allProducts, { sizes: filters?.sizes, colors: filters?.colors });
  const fully = applyInMemoryFilters(allProducts, filters);

  const brandCounts = new Map<string, { count: number; displayName: string }>();
  for (const p of withoutBrand) {
    const display = p.vendor?.trim();
    if (!display) continue;
    const key = display.toLowerCase();
    const e = brandCounts.get(key);
    brandCounts.set(key, { count: (e?.count || 0) + 1, displayName: e?.displayName || display });
  }

  return {
    brands: Array.from(brandCounts.entries())
      .map(([value, { count, displayName }]) => ({ value, count, displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    sizes: getSizeOptions(withoutSize),
    colors: getColorOptions(withoutColor).map((o) => ({
      value: o.value,
      count: o.count,
      originalValue: o.label,
    })),
    price: fully.length > 0 ? getPriceRange(fully) : PRICE_FACET_FALLBACK,
  };
}

async function fetchBrandProductsInMemory(
  brandBase: string,
  limit: number,
  offset: number,
  filters?: BrandFilters
): Promise<ReturnType<typeof getBrandProductsFromDb>> {
  const rowsResult = await sql.unsafe(`
    SELECT
      p.id, p.handle, p.title, p.description,
      p.vendor, p.product_type, p.tags,
      p.image_url, p.image_alt,
      p.available_for_sale, p.shopify_created_at,
      pca.canonical_path
    FROM products p
    LEFT JOIN LATERAL (
      SELECT canonical_path
      FROM product_category_assignments
      WHERE product_id = p.id
      ORDER BY canonical_path
      LIMIT 1
    ) pca ON true
    WHERE ${brandBase}
    ORDER BY p.available_for_sale DESC, p.shopify_created_at DESC NULLS LAST, p.updated_at DESC
  `) as unknown as BrandProductRow[];

  const rows = (Array.isArray(rowsResult) ? rowsResult : []) as BrandProductRow[];
  const enrichedRows = await enrichDbBrandProducts(rows);
  const mappedProducts = enrichedRows.map(dbProductToShopifyFormat);
  const allWithVariants = await attachStorefrontVariants(mappedProducts as ProductWithPrimaryCollection[]);

  const filtered = applyInMemoryFilters(allWithVariants, filters);
  const totalCount = filtered.length;
  const pageProducts = filtered.slice(offset, offset + limit);

  const liveStatus = await getLiveStatusByProductIds(pageProducts.map((p) => p.id));
  const products = applyLiveStatus(pageProducts, liveStatus);
  const facets = buildFacetsInMemory(allWithVariants, filters);

  const canonicalPaths = new Map<string, string>();
  for (const row of enrichedRows) {
    canonicalPaths.set(row.id, row.canonical_path || `/products/${row.handle}`);
  }

  const productUrls = new Map<string, string>();
  for (const p of products) {
    productUrls.set(p.id, canonicalPaths.get(p.id) || `/products/${p.handle}`);
  }

  const hasNextPage = offset + limit < totalCount;
  return {
    products,
    productUrls,
    totalCount,
    pageInfo: { hasNextPage, endCursor: hasNextPage ? `dbbrand:${offset + limit}` : null },
    facets,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function isTableMissingError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '42P01'
  );
}

export async function getBrandProductsFromDb(
  brand: BrandContentRow,
  limit: number = 36,
  after: string | null = null,
  filters?: BrandFilters
): Promise<{
  products: ReturnType<typeof dbProductToShopifyFormat>[];
  productUrls: Map<string, string>;
  totalCount: number;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  facets: BrandFacets;
}> {
  const brandBase = buildBrandBaseClause(brand);
  if (!brandBase) return EMPTY_RESULT;

  const offset = parseOffset(after);

  try {
    return await fetchBrandProductsFast(brand, brandBase, limit, offset, filters);
  } catch (error) {
    if (isTableMissingError(error)) {
      console.warn(
        '[getBrandProductsFromDb] variant_options table missing — falling back to in-memory filters. Run npm run db:sync to populate.'
      );
      return fetchBrandProductsInMemory(brandBase, limit, offset, filters);
    }
    throw error;
  }
}
