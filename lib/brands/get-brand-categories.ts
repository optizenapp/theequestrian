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
   * Canonical brand value to use for the `?brand=` URL param on category pages.
   * Derived from the actual `products.brand` value of products matched to this
   * brand row, so the link filter matches what the category page expects.
   * `null` when no matching products carry a non-empty brand.
   */
  brandFilterValue: string | null;
}

type BrandRule = { column?: string; relation?: string; condition?: string };

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Mirror of the rule parsing in lib/brands/get-brand-products.ts so brand
 * categories use the exact same matching logic as the product grid.
 */
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
    } else if (col === 'HANDLE' && rel === 'STARTS_WITH') {
      clauses.push(`LOWER(COALESCE(p.handle, '')) LIKE '${escaped}%'`);
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

/**
 * Strips the trailing product slug from a canonical_path so we get the parent
 * category path (e.g. /horse/tack/bridles/academy-bridle → /horse/tack/bridles).
 */
function parentCategoryPath(canonicalPath: string): string | null {
  const idx = canonicalPath.lastIndexOf('/');
  if (idx <= 0) return null;
  const parent = canonicalPath.slice(0, idx);
  return parent.length > 1 ? parent : null;
}

/**
 * Returns the categories on the site where this brand has products, ordered
 * by product count desc. Used for the auto-generated "What We Stock"
 * (Product Lines) section on brand pages.
 */
export async function getBrandCategories(
  brand: BrandContentRow,
  limit: number = 12
): Promise<BrandCategoriesResult> {
  const where = buildBrandWhereClause(brand);
  if (!where) return { categories: [], brandFilterValue: null };

  // Pull canonical_path AND the product's brand value in a single pass so we
  // can derive the canonical brand filter value for category-page links from
  // the same set of products that drive the category counts.
  const rows = (await sql.unsafe(`
    SELECT
      pca.canonical_path,
      LOWER(TRIM(COALESCE(p.brand, ''))) AS brand_value
    FROM products p
    JOIN product_category_assignments pca ON pca.product_id = p.id
    WHERE (${where})
      AND pca.canonical_path IS NOT NULL
  `)) as unknown as Array<{ canonical_path: string; brand_value: string }>;

  const counts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  for (const r of rows) {
    const parent = parentCategoryPath(r.canonical_path);
    if (parent) counts.set(parent, (counts.get(parent) || 0) + 1);
    if (r.brand_value) {
      brandCounts.set(r.brand_value, (brandCounts.get(r.brand_value) || 0) + 1);
    }
  }

  // Pick the most common non-empty brand value as the canonical filter value.
  let brandFilterValue: string | null = null;
  let topCount = 0;
  for (const [value, count] of brandCounts) {
    if (count > topCount) {
      topCount = count;
      brandFilterValue = value;
    }
  }

  if (counts.size === 0) return { categories: [], brandFilterValue };

  const paths = Array.from(counts.keys());
  const labels = (await sql`
    SELECT url_path, h1_title, breadcrumb_label
    FROM collection_content
    WHERE url_path = ANY(${paths})
  `) as unknown as Array<{ url_path: string; h1_title: string | null; breadcrumb_label: string | null }>;

  const labelMap = new Map<string, string>();
  for (const l of labels) {
    const label = (l.breadcrumb_label?.trim() && l.breadcrumb_label !== 'null'
      ? l.breadcrumb_label.trim()
      : l.h1_title?.trim()) || titleFromPath(l.url_path);
    labelMap.set(l.url_path, label);
  }

  const entries: BrandCategoryEntry[] = paths.map((path) => ({
    url_path: path,
    label: labelMap.get(path) || titleFromPath(path),
    count: counts.get(path) || 0,
  }));

  const categories = entries
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
    .slice(0, limit);

  return { categories, brandFilterValue };
}

function titleFromPath(path: string): string {
  const last = path.split('/').filter(Boolean).pop() || '';
  return last
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
