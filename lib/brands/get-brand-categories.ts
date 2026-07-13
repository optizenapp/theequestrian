import { sql } from '@/lib/db/client';
import type { BrandContentRow } from '@/lib/content/brand-content';

export interface BrandCategoryEntry {
  url_path: string;
  label: string;
  count: number;
}

export interface BrandCategoriesResult {
  categories: BrandCategoryEntry[];
  /**
   * Canonical brand value for `?brand=` on category pages.
   * `null` when no matching products carry a non-empty brand.
   */
  brandFilterValue: string | null;
}

type BrandRule = { column?: string; relation?: string; condition?: string };

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** Same matching semantics as get-brand-products (including HANDLE CONTAINS). */
function buildBrandWhereClause(brand: BrandContentRow): string | null {
  const rawRules = brand.rules;
  let rules: BrandRule[];

  if (rawRules) {
    try {
      const parsed = JSON.parse(rawRules) as BrandRule[];
      rules = Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
    } catch {
      rules = [];
    }
  } else {
    rules = [];
  }

  if (rules.length === 0) {
    const label = (brand.breadcrumb_label?.trim() || brand.title.trim())
      .replace(/^Shop\s+(?:&\s+Buy\s+)?/i, '')
      .trim();
    if (label) rules.push({ column: 'BRAND', relation: 'EQUALS', condition: label });
    rules.push({ column: 'HANDLE', relation: 'STARTS_WITH', condition: `${brand.handle}-` });
  }

  const clauses: string[] = [];
  for (const rule of rules) {
    const col = rule.column?.trim().toUpperCase();
    const rel = rule.relation?.trim().toUpperCase() || 'EQUALS';
    const cond = rule.condition?.trim();
    if (!col || !cond) continue;
    const escaped = escapeLiteral(cond.toLowerCase());

    if (col === 'BRAND') {
      clauses.push(`LOWER(TRIM(COALESCE(p.brand, ''))) = '${escaped}'`);
    } else if (col === 'VENDOR') {
      clauses.push(`LOWER(COALESCE(p.vendor, '')) = '${escaped}'`);
    } else if (col === 'TAG') {
      clauses.push(
        `EXISTS (SELECT 1 FROM unnest(COALESCE(p.tags, ARRAY[]::text[])) AS t(tag) WHERE LOWER(tag) = '${escaped}')`
      );
    } else if (col === 'HANDLE') {
      if (rel === 'STARTS_WITH') {
        clauses.push(`LOWER(COALESCE(p.handle, '')) LIKE '${escaped}%'`);
      } else if (rel === 'EQUALS') {
        clauses.push(`LOWER(COALESCE(p.handle, '')) = '${escaped}'`);
      } else {
        clauses.push(`LOWER(COALESCE(p.handle, '')) LIKE '%${escaped}%'`);
      }
    } else if (col === 'TITLE') {
      clauses.push(
        rel === 'EQUALS'
          ? `LOWER(COALESCE(p.title, '')) = '${escaped}'`
          : `LOWER(COALESCE(p.title, '')) LIKE '%${escaped}%'`
      );
    }
  }

  if (clauses.length === 0) return null;
  return clauses.map((c) => `(${c})`).join(' OR ');
}

function titleFromPath(path: string): string {
  const last = path.split('/').filter(Boolean).pop() || '';
  return last
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * Categories where this brand has products ("What We Stock").
 * Aggregates in SQL — never pulls unbounded assignment rows into Node/Neon work_mem.
 */
export async function getBrandCategories(
  brand: BrandContentRow,
  limit: number = 12
): Promise<BrandCategoriesResult> {
  const where = buildBrandWhereClause(brand);
  if (!where) return { categories: [], brandFilterValue: null };

  const safeLimit = Math.max(1, Math.min(limit, 24));

  try {
    const [categoryRows, brandRows] = await Promise.all([
      sql.unsafe(`
        WITH matched AS (
          SELECT
            regexp_replace(pca.canonical_path, '/[^/]+$', '') AS url_path
          FROM products p
          JOIN product_category_assignments pca ON pca.product_id = p.id
          WHERE (${where})
            AND pca.canonical_path IS NOT NULL
            AND pca.canonical_path LIKE '/%/%/%'
        )
        SELECT url_path, COUNT(*)::int AS count
        FROM matched
        WHERE url_path <> '' AND url_path <> '/'
        GROUP BY url_path
        ORDER BY count DESC
        LIMIT ${safeLimit}
      `) as unknown as Array<{ url_path: string; count: number }>,

      sql.unsafe(`
        SELECT
          LOWER(TRIM(p.brand)) AS brand_value,
          COUNT(*)::int AS count
        FROM products p
        WHERE (${where})
          AND COALESCE(TRIM(p.brand), '') <> ''
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 1
      `) as unknown as Array<{ brand_value: string; count: number }>,
    ]);

    const paths = (categoryRows || []).map((r) => r.url_path).filter(Boolean);
    if (paths.length === 0) {
      return {
        categories: [],
        brandFilterValue: brandRows[0]?.brand_value || null,
      };
    }

    const labels = (await sql`
      SELECT url_path, h1_title, breadcrumb_label
      FROM collection_content
      WHERE url_path = ANY(${paths})
    `) as unknown as Array<{
      url_path: string;
      h1_title: string | null;
      breadcrumb_label: string | null;
    }>;

    const labelMap = new Map<string, string>();
    for (const l of labels) {
      const label =
        (l.breadcrumb_label?.trim() && l.breadcrumb_label !== 'null'
          ? l.breadcrumb_label.trim()
          : l.h1_title?.trim()) || titleFromPath(l.url_path);
      labelMap.set(l.url_path, label);
    }

    const categories: BrandCategoryEntry[] = (categoryRows || []).map((r) => ({
      url_path: r.url_path,
      label: labelMap.get(r.url_path) || titleFromPath(r.url_path),
      count: Number(r.count) || 0,
    }));

    return {
      categories,
      brandFilterValue: brandRows[0]?.brand_value || null,
    };
  } catch (error) {
    console.error(
      `[getBrandCategories] failed for ${brand.handle}:`,
      error instanceof Error ? error.message : error
    );
    return { categories: [], brandFilterValue: null };
  }
}
