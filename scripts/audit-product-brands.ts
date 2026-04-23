#!/usr/bin/env tsx
/**
 * Read-only audit: infer brand per product → CSV reports under exports/.
 *
 * Usage: npx tsx scripts/audit-product-brands.ts
 * Requires POSTGRES_URL or DATABASE_URL (same as lib/db/client).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';
import { inferProductBrand, type ProductBrandAuditInput } from '@/lib/brands/infer-product-brand';
import { slugFromBrandName } from '@/lib/brands/brand-slug';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type ProductRow = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  vendor: string | null;
  tags: string[] | null;
  title_override: string | null;
  meta_title: string | null;
  meta_description: string | null;
  description_html: string | null;
};

function buildLexicon(vendors: string[], brandRows: { title: string; breadcrumb_label: string | null }[]): string[] {
  const set = new Set<string>();
  for (const v of vendors) {
    const t = v.trim();
    if (t.length > 1) set.add(t);
  }
  for (const b of brandRows) {
    const t = b.title?.trim();
    if (t) set.add(t.replace(/^Shop\s+/i, '').replace(/^Shop\s+&?\s*Buy\s+/i, '').trim());
    const bc = b.breadcrumb_label?.trim();
    if (bc) set.add(bc);
  }
  return [...set].sort((a, b) => b.length - a.length);
}

async function main(): Promise<void> {
  const products = (await sql`
    SELECT
      p.id,
      p.handle,
      p.title,
      p.description,
      p.vendor,
      p.tags,
      pco.title_override,
      pco.meta_title,
      pco.meta_description,
      pco.description_html
    FROM products p
    LEFT JOIN product_content_overrides pco ON pco.product_handle = p.handle
  `) as unknown as ProductRow[];

  const uniqueVendors = [
    ...new Set(
      products.map((p) => p.vendor?.trim()).filter((v): v is string => Boolean(v && v.length > 1))
    ),
  ];

  let brandRows: Array<{ title: string; breadcrumb_label: string | null }> = [];
  let existingHandles = new Set<string>();
  try {
    brandRows = (await sql`
      SELECT title, breadcrumb_label FROM brand_content WHERE status = 'published'
    `) as unknown as typeof brandRows;
    const handleRows = (await sql`SELECT handle FROM brand_content`) as unknown as Array<{ handle: string }>;
    existingHandles = new Set(handleRows.map((r) => r.handle));
  } catch {
    console.warn('[audit-product-brands] brand_content unavailable; lexicon uses vendors only');
  }

  const lexicon = buildLexicon(uniqueVendors, brandRows);

  const productCsvRows: Record<string, string>[] = [];
  const brandAgg = new Map<
    string,
    { count: number; confSum: number; sources: Map<string, number>; normalizedHandle: string }
  >();

  for (const p of products) {
    const input: ProductBrandAuditInput = {
      handle: p.handle,
      title: p.title,
      descriptionHtml: p.description || '',
      vendor: p.vendor,
      tags: p.tags || [],
      titleOverride: p.title_override,
      metaTitle: p.meta_title,
      metaDescription: p.meta_description,
      overrideDescriptionHtml: p.description_html,
      lexicon,
    };
    const inf = inferProductBrand(input);
    const slug = inf.inferredBrand ? slugFromBrandName(inf.inferredBrand) : '';
    const hasPage = inf.inferredBrand ? existingHandles.has(slug) : false;

    productCsvRows.push({
      product_id: p.id,
      handle: p.handle,
      current_vendor: p.vendor || '',
      inferred_brand: inf.inferredBrand,
      confidence: String(inf.confidence),
      evidence_sources: inf.evidenceSources,
      evidence_text: inf.evidenceText,
      needs_review: inf.needsReview ? 'true' : 'false',
      suggested_brand_handle: slug,
      brand_page_exists: hasPage ? 'true' : 'false',
    });

    if (!inf.inferredBrand) continue;
    const key = inf.inferredBrand.trim();
    const prev = brandAgg.get(key) || {
      count: 0,
      confSum: 0,
      sources: new Map<string, number>(),
      normalizedHandle: slugFromBrandName(key),
    };
    prev.count += 1;
    prev.confSum += inf.confidence;
    prev.sources.set(inf.evidenceSources, (prev.sources.get(inf.evidenceSources) || 0) + 1);
    brandAgg.set(key, prev);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = resolve(process.cwd(), 'exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const productPath = resolve(dir, `brand-audit-products-${ts}.csv`);
  const brandPath = resolve(dir, `brand-audit-inventory-${ts}.csv`);
  const missingPath = resolve(dir, `brand-audit-missing-pages-${ts}.csv`);

  fs.writeFileSync(
    productPath,
    stringify(productCsvRows, { header: true, quoted: true }),
    'utf-8'
  );

  const brandCsv = [...brandAgg.entries()].map(([name, v]) => ({
    brand_name: name,
    normalized_handle: v.normalizedHandle,
    product_count: String(v.count),
    avg_confidence: String(Math.round((v.confSum / v.count) * 100) / 100),
    source_mix: JSON.stringify(Object.fromEntries(v.sources)),
  }));
  brandCsv.sort((a, b) => Number(b.product_count) - Number(a.product_count));
  fs.writeFileSync(brandPath, stringify(brandCsv, { header: true, quoted: true }), 'utf-8');

  const missing = brandCsv.filter((row) => !existingHandles.has(row.normalized_handle));
  fs.writeFileSync(missingPath, stringify(missing, { header: true, quoted: true }), 'utf-8');

  console.log(`Wrote ${productCsvRows.length} rows → ${productPath}`);
  console.log(`Wrote ${brandCsv.length} brands → ${brandPath}`);
  console.log(`Missing brand pages: ${missing.length} → ${missingPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
