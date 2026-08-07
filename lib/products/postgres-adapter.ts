/**
 * Postgres Product Adapter
 * Converts database products to Shopify format for compatibility
 */

import { shopifyFetch } from '@/lib/shopify/client';
import { searchProducts, type ProductFilters, type ProductQueryResult } from '@/lib/db/queries';
import { sql } from '@/lib/db/client';
import { ensureProductsBrandColumns } from '@/lib/db/ensure-products-brand-columns';
import type { ProductWithPrimaryCollection } from '@/types/shopify';

type CategoryFilters = {
  brands?: string[];
  sizes?: string[];
  colors?: string[];
};

type CollectionFacets = {
  brands: { value: string; count: number; displayName: string }[];
  sizes: { value: string; count: number }[];
  colors: { value: string; count: number; originalValue: string }[];
  price: { min: number; max: number };
};

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'AUD';
const PRICE_FACET_FALLBACK = { min: 0, max: 500 };

/**
 * Run a raw SQL query and degrade to an empty result on failure.
 *
 * Used for non-critical facet/filter queries (sizes, colours) that join the
 * `variant_options` table, which may be missing or out of sync. Without this,
 * a single broken sub-query would 500 the entire category page.
 */
async function safeSql<T>(query: string, label: string): Promise<T[]> {
  try {
    return (await sql.unsafe(query)) as unknown as T[];
  } catch (err) {
    console.error(`[postgres-adapter] ${label} query failed, degrading to empty:`, err);
    return [];
  }
}

const LIVE_STATUS_QUERY = `
  query GetProductsStatus($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        availableForSale
        totalInventory
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

/**
 * Convert database product to Shopify format
 * Note: Prices are set to 0 - will be hydrated client-side
 */
export function dbProductToShopifyFormat(dbProduct: ProductQueryResult): ProductWithPrimaryCollection {
  const desc = dbProduct.description ?? '';
  const tags = dbProduct.tags ?? [];
  const displayVendor = (dbProduct.brand?.trim() || dbProduct.vendor || '').trim();
  return {
    id: dbProduct.id,
    handle: dbProduct.handle,
    title: dbProduct.title,
    description: desc,
    descriptionHtml: desc,
    vendor: displayVendor || dbProduct.vendor,
    brand: dbProduct.brand?.trim() || null,
    productType: dbProduct.product_type,
    tags,
    availableForSale: dbProduct.available_for_sale,
    createdAt: dbProduct.shopify_created_at,
    
    // Images
    images: {
      edges: dbProduct.image_url ? [{
        node: {
          url: dbProduct.image_url,
          altText: dbProduct.image_alt || dbProduct.title,
          width: 800,
          height: 800,
        }
      }] : []
    },
    
    // Price range (placeholder - will be hydrated client-side)
    priceRange: {
      minVariantPrice: {
        amount: '0',
        currencyCode: DEFAULT_CURRENCY
      },
      maxVariantPrice: {
        amount: '0',
        currencyCode: DEFAULT_CURRENCY
      }
    },
    
    // Compare at price (placeholder)
    compareAtPriceRange: {
      minVariantPrice: {
        amount: '0',
        currencyCode: DEFAULT_CURRENCY
      },
      maxVariantPrice: {
        amount: '0',
        currencyCode: DEFAULT_CURRENCY
      }
    },
    
    // Variants (placeholder - will be hydrated client-side)
    variants: {
      edges: []
    },
    
    // Collections (not stored in DB)
    collections: {
      edges: []
    },
    
    // Metafield (not used with Postgres)
    metafield: null,
  } as ProductWithPrimaryCollection;
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

function parseDbCursor(after: string | null, limit: number): number {
  if (!after) return 0;
  const dbMatch = after.match(/^db:(\d+)$/);
  if (dbMatch) {
    return Math.max(0, parseInt(dbMatch[1], 10));
  }
  const legacyPageMatch = after.match(/^page:(\d+)$/);
  if (legacyPageMatch) {
    return Math.max(0, parseInt(legacyPageMatch[1], 10) * limit);
  }
  return 0;
}

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function asLowerArrayLiteral(values: string[]): string {
  const escaped = values.map((value) => `'${escapeLiteral(value.toLowerCase())}'`).join(',');
  return `ARRAY[${escaped}]::text[]`;
}

function buildCategoryWhereClause(categoryPath: string, filters?: CategoryFilters): string {
  const normalized = normalizePath(categoryPath);
  const escapedPath = escapeLiteral(normalized);
  const conditions: string[] = [
    `(pca.category_path = '${escapedPath}' OR pca.category_path LIKE '${escapedPath}/%')`,
  ];

  if (filters?.brands && filters.brands.length > 0) {
    // Brand filter uses the canonical `products.brand` column only.
    // We deliberately no longer fall back to vendor / tags: the parent-brand
    // rollup made `brand` the single source of truth, and unmapped products
    // are NULL by design (so they should not appear in any brand filter).
    const brands = asLowerArrayLiteral(filters.brands);
    conditions.push(`LOWER(TRIM(COALESCE(p.brand, ''))) = ANY(${brands})`);
  }

  if (filters?.sizes && filters.sizes.length > 0) {
    const sizes = asLowerArrayLiteral(filters.sizes);
    conditions.push(`EXISTS (
      SELECT 1
      FROM variant_options vo
      WHERE vo.product_id = p.id
        AND vo.option_name_normalized = 'size'
        AND vo.option_value_normalized = ANY(${sizes})
    )`);
  }

  if (filters?.colors && filters.colors.length > 0) {
    // Filter values come from option_value_normalized in the facet (already lowercased).
    // Do NOT apply normalizeColor() here — it strips multi-word prefixes like "beetle "
    // from "beetle khaki green", corrupting the WHERE clause.
    const colors = asLowerArrayLiteral(filters.colors);
    conditions.push(`EXISTS (
      SELECT 1
      FROM variant_options vo
      WHERE vo.product_id = p.id
        AND vo.option_name_normalized IN ('color', 'colour')
        AND vo.option_value_normalized = ANY(${colors})
    )`);
  }

  return conditions.join(' AND ');
}

export type LiveProductStatus = {
  available: boolean;
  price: string;
  compareAtPrice?: string;
  currencyCode: string;
};

/** ok=false means timeout/error — callers should keep Neon placeholders. */
export type LiveStatusResult = {
  ok: boolean;
  map: Map<string, LiveProductStatus>;
};

export async function getLiveStatusByProductIds(productIds: string[]): Promise<LiveStatusResult> {
  if (productIds.length === 0) return { ok: true, map: new Map() };
  // 1.2s is too aggressive in production and causes frequent fallback to placeholder prices,
  // which hides sale badges on category grids.
  const timeoutMs = Number(process.env.DB_SERVER_STATUS_TIMEOUT_MS || 4000);

  let data: { nodes: Array<{
    id: string;
    availableForSale: boolean;
    priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
    compareAtPriceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
  } | null> };

  try {
    const statusPromise = shopifyFetch<{ nodes: Array<{
      id: string;
      availableForSale: boolean;
      priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
      compareAtPriceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
    } | null> }>({
      query: LIVE_STATUS_QUERY,
      variables: { ids: productIds.slice(0, 250) },
      // Always fetch fresh pricing/compare-at for correct sale badges.
      cache: 'no-store',
    });

    data = await Promise.race([
      statusPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`status-timeout-${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.warn('[getLiveStatusByProductIds] Live status fetch skipped:', error);
    return { ok: false, map: new Map() };
  }

  const statusMap = new Map<string, LiveProductStatus>();

  for (const node of data.nodes || []) {
    if (!node?.id) continue;
    const currencyCode = node.priceRange?.minVariantPrice?.currencyCode || DEFAULT_CURRENCY;
    statusMap.set(node.id, {
      available: Boolean(node.availableForSale),
      price: node.priceRange?.minVariantPrice?.amount || '0',
      compareAtPrice: node.compareAtPriceRange?.minVariantPrice?.amount,
      currencyCode,
    });
  }

  // Successful Storefront response (including all-null for DRAFT/deleted IDs).
  return { ok: true, map: statusMap };
}

function hasPositivePrice(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}

export function applyLiveStatus(
  products: ProductWithPrimaryCollection[],
  liveStatus: LiveStatusResult
): ProductWithPrimaryCollection[] {
  // Timeout/error — keep DB rows rather than blanking the PLP (client hydration repairs ACTIVE).
  if (!liveStatus.ok) return products;

  // Authoritative Storefront response: drop unpublished / missing / $0 products.
  return products.flatMap((product) => {
    const live = liveStatus.map.get(product.id);
    if (!live || !hasPositivePrice(live.price)) return [];

    return [{
      ...product,
      availableForSale: live.available,
      priceRange: {
        minVariantPrice: {
          amount: live.price,
          currencyCode: live.currencyCode,
        },
        maxVariantPrice: {
          amount: live.price,
          currencyCode: live.currencyCode,
        },
      },
      compareAtPriceRange: live.compareAtPrice
        ? {
            minVariantPrice: {
              amount: live.compareAtPrice,
              currencyCode: live.currencyCode,
            },
            maxVariantPrice: {
              amount: live.compareAtPrice,
              currencyCode: live.currencyCode,
            },
          }
        : undefined,
    }];
  });
}

/** Adjust Neon COUNT after dropping unpublished/$0 rows from the current page. */
export function adjustTotalCountAfterLiveFilter(
  neonTotal: number,
  beforeCount: number,
  afterCount: number,
  liveOk: boolean,
  options?: { offset?: number; unfiltered?: boolean }
): number {
  if (!liveOk) return neonTotal;
  const dropped = Math.max(0, beforeCount - afterCount);
  const offset = options?.offset ?? 0;
  const unfiltered = options?.unfiltered !== false;
  // Entire Neon match set was on this page and none are sellable in Storefront.
  if (offset === 0 && unfiltered && afterCount === 0 && beforeCount >= neonTotal) {
    return 0;
  }
  if (neonTotal === 0) return 0;
  return Math.max(afterCount, neonTotal - dropped);
}

/**
 * Disjunctive facet queries: each dimension's counts are computed WITHOUT
 * filtering by that same dimension. This means:
 * - Size options always show all available sizes (filtered by active colour/brand)
 * - Colour options always show all available colours (filtered by active size/brand)
 * - Brand options always show all available brands (filtered by active size/colour)
 * Counts use COUNT(DISTINCT p.id) to count products, not variant rows.
 */
async function getCollectionFacetsFromDb(
  sizeWhereClause: string,  // category + colour + brand (no size filter)
  colorWhereClause: string, // category + size + brand (no colour filter)
  brandWhereClause: string, // category + size + colour (no brand filter)
): Promise<CollectionFacets> {
  // Brand facet derives from the canonical `products.brand` column only.
  // Products without an assigned brand do not contribute to any brand option.
  const brandRows = (await sql.unsafe(`
    SELECT
      LOWER(TRIM(p.brand)) AS value,
      MIN(TRIM(p.brand)) AS display_name,
      COUNT(DISTINCT p.id)::int AS count
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE ${brandWhereClause}
      AND COALESCE(TRIM(p.brand), '') <> ''
    GROUP BY LOWER(TRIM(p.brand))
    ORDER BY count DESC
  `)) as unknown as Array<{ value: string; display_name: string; count: number }>;

  // Size and colour facets join `variant_options`. That table is populated by
  // the catalogue sync job, but if it's missing on a fresh DB or its sync is
  // behind, we must NOT 500 the entire category page — degrade to empty
  // size/colour facets and let the brand filter still work.
  const sizeRows = await safeSql<{ value: string; count: number }>(
    `SELECT
       vo.option_value AS value,
       COUNT(DISTINCT p.id)::int AS count
     FROM product_category_assignments pca
     JOIN products p ON p.id = pca.product_id
     JOIN variant_options vo ON vo.product_id = p.id
     WHERE ${sizeWhereClause}
       AND vo.option_name_normalized = 'size'
       AND COALESCE(vo.option_value, '') <> ''
     GROUP BY vo.option_value
     ORDER BY count DESC`,
    'size facet'
  );

  const colorRows = await safeSql<{ value: string; original_value: string; count: number }>(
    `SELECT
       vo.option_value_normalized AS value,
       MIN(vo.option_value) AS original_value,
       COUNT(DISTINCT p.id)::int AS count
     FROM product_category_assignments pca
     JOIN products p ON p.id = pca.product_id
     JOIN variant_options vo ON vo.product_id = p.id
     WHERE ${colorWhereClause}
       AND vo.option_name_normalized IN ('color', 'colour')
       AND COALESCE(vo.option_value_normalized, '') <> ''
     GROUP BY vo.option_value_normalized
     ORDER BY count DESC`,
    'color facet'
  );

  const brands = brandRows
    .filter((row) => row.value)
    .map((row) => ({
      value: row.value,
      count: Number(row.count),
      displayName: row.display_name || row.value,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const sizes = sizeRows
    .map((row) => ({ value: row.value, count: Number(row.count) }))
    .sort((a, b) => {
      const aNum = parseFloat(a.value);
      const bNum = parseFloat(b.value);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return a.value.localeCompare(b.value);
    });

  const colors = colorRows
    .map((row) => ({
      value: row.value,
      count: Number(row.count),
      originalValue: row.original_value,
    }))
    .sort((a, b) => a.originalValue.localeCompare(b.originalValue));

  return {
    brands,
    sizes,
    colors,
    price: PRICE_FACET_FALLBACK,
  };
}

export async function getProductsByCategoryFromDB(
  categoryPath: string,
  limit: number = 36,
  after: string | null = null,
  filters?: CategoryFilters
): Promise<{
  products: ProductWithPrimaryCollection[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount: number;
  facets: CollectionFacets;
}> {
  // Self-heal `products.brand` / `brand_hub_handle` columns on first call so the
  // SELECTs below don't 500 if a deploy ran before the migration script.
  await ensureProductsBrandColumns();

  // Full filter where clause (for products + count)
  const whereClause = buildCategoryWhereClause(categoryPath, filters);
  // Per-dimension where clauses for disjunctive facets:
  // each omits its own dimension so all options remain visible
  const sizeWhereClause = buildCategoryWhereClause(categoryPath, { colors: filters?.colors, brands: filters?.brands });
  const colorWhereClause = buildCategoryWhereClause(categoryPath, { sizes: filters?.sizes, brands: filters?.brands });
  const brandWhereClause = buildCategoryWhereClause(categoryPath, { sizes: filters?.sizes, colors: filters?.colors });
  const offset = parseDbCursor(after, limit);

  const countRows = await sql.unsafe(`
    SELECT COUNT(*)::int AS total
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE ${whereClause}
  `) as unknown as Array<{ total: number }>;
  const totalCount = Number(countRows[0]?.total || 0);

  if (totalCount === 0) {
    return {
      products: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
      facets: {
        brands: [],
        sizes: [],
        colors: [],
        price: PRICE_FACET_FALLBACK,
      },
    };
  }

  // Omit p.description (large HTML) — grid cards don't render it; cuts Neon egress vs selecting it per row.
  const dbRows = await sql.unsafe(`
    SELECT
      p.id,
      p.handle,
      p.title,
      p.vendor,
      p.brand,
      p.product_type,
      p.image_url,
      p.image_alt,
      p.available_for_sale,
      p.shopify_created_at
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE ${whereClause}
    ORDER BY p.available_for_sale DESC, p.shopify_created_at DESC NULLS LAST, p.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as unknown as ProductQueryResult[];

  const mappedProducts = dbRows.map(dbProductToShopifyFormat);
  const [liveStatus, facets] = await Promise.all([
    getLiveStatusByProductIds(mappedProducts.map((product) => product.id)),
    getCollectionFacetsFromDb(sizeWhereClause, colorWhereClause, brandWhereClause),
  ]);
  const products = applyLiveStatus(mappedProducts, liveStatus);
  const unfiltered = !(
    filters?.brands?.length || filters?.sizes?.length || filters?.colors?.length
  );
  const adjustedTotal = adjustTotalCountAfterLiveFilter(
    totalCount,
    mappedProducts.length,
    products.length,
    liveStatus.ok,
    { offset, unfiltered }
  );

  const hasNextPage = offset + limit < adjustedTotal;
  const endCursor = hasNextPage ? `db:${offset + limit}` : null;

  return {
    products,
    pageInfo: {
      hasNextPage,
      endCursor,
    },
    totalCount: adjustedTotal,
    facets,
  };
}

/**
 * Get products by types using Postgres (replaces Shopify query)
 */
export async function getProductsByTypesFromDB(
  productTypes: string[],
  limit: number = 36,
  after: string | null = null,
  filters?: {
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  }
): Promise<{
  products: ProductWithPrimaryCollection[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount: number;
  facets: {
    brands: { value: string; count: number; displayName: string }[];
    sizes: { value: string; count: number }[];
    colors: { value: string; count: number; originalValue: string }[];
    price: { min: number; max: number };
  };
}> {
  // Parse pagination cursor
  let offset = 0;
  if (after) {
    const match = after.match(/^page:(\d+)$/);
    if (match) {
      offset = parseInt(match[1]) * limit;
    }
  }
  
  // Build filters for database query
  const dbFilters: ProductFilters = {};
  if (filters?.brands) {
    dbFilters.brands = filters.brands;
  }
  if (filters?.sizes) {
    dbFilters.sizes = filters.sizes;
  }
  if (filters?.colors) {
    dbFilters.colors = filters.colors;
  }
  
  // Query database
  const { products: dbProducts, totalCount, hasNextPage } = await searchProducts(
    productTypes,
    dbFilters,
    limit,
    offset
  );
  
  // Convert to Shopify format
  const products = dbProducts.map(dbProductToShopifyFormat);
  
  // Calculate next cursor
  const nextPage = Math.floor(offset / limit) + 1;
  const endCursor = hasNextPage ? `page:${nextPage}` : null;
  
  // Build facets (simplified for now - can be enhanced)
  // In a real implementation, you'd query the database for facets
  const facets = {
    brands: [] as { value: string; count: number; displayName: string }[],
    sizes: [] as { value: string; count: number }[],
    colors: [] as { value: string; count: number; originalValue: string }[],
    price: { min: 0, max: 1000 }
  };
  
  return {
    products,
    pageInfo: {
      hasNextPage,
      endCursor
    },
    totalCount,
    facets
  };
}
