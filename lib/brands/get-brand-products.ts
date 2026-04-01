import { sql } from '@/lib/db/client';
import type { BrandContentRow } from '@/lib/content/brand-content';
import {
  applyLiveStatus,
  dbProductToShopifyFormat,
  getLiveStatusByProductIds,
} from '@/lib/products/postgres-adapter';
import { enrichDbBrandProducts } from '@/lib/products/enrich-db-brand-products';
import type { ProductQueryResult } from '@/lib/db/queries';

type BrandRule = { column?: string; relation?: string; condition?: string };
type BrandProductRow = ProductQueryResult & { canonical_path: string | null };

function parseOffset(after: string | null, limit: number): number {
  if (!after) return 0;
  const match = after.match(/^dbbrand:(\d+)$/);
  return match ? Math.max(0, parseInt(match[1], 10)) : 0;
}

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
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
    return `EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.tags, ARRAY[]::text[])) AS t(tag)
      WHERE LOWER(tag) = '${escaped}'
    )`;
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
    if (relation === 'STARTS_WITH') {
      return `LOWER(COALESCE(p.handle, '')) LIKE '${escaped}%'`;
    }
    return relation === 'EQUALS'
      ? `LOWER(COALESCE(p.handle, '')) = '${escaped}'`
      : `LOWER(COALESCE(p.handle, '')) LIKE '%${escaped}%'`;
  }

  return null;
}

export async function getBrandProductsFromDb(
  brand: BrandContentRow,
  limit: number = 36,
  after: string | null = null
): Promise<{
  products: ReturnType<typeof dbProductToShopifyFormat>[];
  productUrls: Map<string, string>;
  totalCount: number;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  const clauses = parseRules(brand.rules, brand.handle).map(buildRuleClause).filter(Boolean) as string[];
  if (clauses.length === 0) {
    return {
      products: [],
      productUrls: new Map(),
      totalCount: 0,
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  }

  const whereClause = clauses.map((clause) => `(${clause})`).join(' OR ');
  const offset = parseOffset(after, limit);

  const countResult = await sql.unsafe(`
    SELECT COUNT(*)::int AS total
    FROM products p
    WHERE ${whereClause}
  `);
  const countRows = (Array.isArray(countResult) ? countResult : []) as Array<{ total: number }>;
  const totalCount = Number(countRows[0]?.total || 0);

  const rowsResult = await sql.unsafe(`
    SELECT
      p.id,
      p.handle,
      p.title,
      p.description,
      p.vendor,
      p.product_type,
      p.tags,
      p.image_url,
      p.image_alt,
      p.available_for_sale,
      p.shopify_created_at,
      pca.canonical_path
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_id = p.id
    WHERE ${whereClause}
    ORDER BY p.available_for_sale DESC, p.shopify_created_at DESC NULLS LAST, p.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const rows = (Array.isArray(rowsResult) ? rowsResult : []) as BrandProductRow[];
  const enrichedRows = await enrichDbBrandProducts(rows);
  const hydratedProducts = applyLiveStatus(
    enrichedRows.map(dbProductToShopifyFormat),
    await getLiveStatusByProductIds(enrichedRows.map((row) => row.id))
  );

  const productUrls = new Map<string, string>();
  for (const row of enrichedRows) {
    productUrls.set(row.id, row.canonical_path || `/products/${row.handle}`);
  }

  const hasNextPage = offset + limit < totalCount;
  return {
    products: hydratedProducts,
    productUrls,
    totalCount,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? `dbbrand:${offset + limit}` : null,
    },
  };
}
