#!/usr/bin/env tsx
/**
 * Apply pill_title → H1 + breadcrumb, generate Koray collection SEO title/description.
 *
 * Usage:
 *   npx tsx scripts/apply-pill-h1-seo.ts --floral-prod
 *   npx tsx scripts/apply-pill-h1-seo.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const BRAND = ' | The Equestrian';
const TITLE_MAX = 68;
const CSV_PATH =
  process.env.TAXONOMY_CSV ||
  '/Users/jonosmmachine/Downloads/category-taxonomy-review2.csv';

const PILL_FIXES: Record<string, string> = {
  'Womens Jaclets': 'Womens Jackets',
  'Hor Bit Accessories': 'Horse Bit Accessories',
  'Super Accessories': 'Spur Accessories',
};

type CsvRow = {
  path: string;
  parent_path: string;
  status: string;
  pill_title: string;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function clipTitle(core: string): string {
  let title = `${core}${BRAND}`;
  if (title.length <= TITLE_MAX) return title;
  const budget = TITLE_MAX - BRAND.length;
  const cut = core.slice(0, budget).replace(/\s+\S*$/, '').replace(/[,:&-]+$/, '').trim();
  return `${cut}${BRAND}`;
}

function topic(path: string, pill: string): { titleAttr: string; who: string; attrs: string } {
  const p = path.toLowerCase();
  const has = (w: string) => pill.toLowerCase().includes(w);
  if (p.startsWith('/clothing/womens')) {
    return { titleAttr: has('women') ? 'for Riding in Australia' : 'for Women Riders', who: 'women riders', attrs: 'breeches, jackets, tights and tops' };
  }
  if (p.startsWith('/clothing/mens')) {
    return { titleAttr: has('men') ? 'for Riding in Australia' : 'for Men Riders', who: 'men riders', attrs: 'breeches, jackets and show shirts' };
  }
  if (p.startsWith('/clothing/kids')) {
    return { titleAttr: has('kid') ? 'for Riding in Australia' : 'for Young Riders', who: 'young riders', attrs: 'breeches, jodhpurs and everyday kit' };
  }
  if (p.startsWith('/clothing/footwear')) {
    return { titleAttr: 'for Riding in Australia', who: 'riders', attrs: 'tall, riding and casual boots' };
  }
  if (p.startsWith('/clothing')) {
    return { titleAttr: 'for Riders in Australia', who: 'riders', attrs: 'apparel, footwear and accessories' };
  }
  if (p.startsWith('/horse/bits')) {
    return { titleAttr: 'for Horses in Australia', who: 'horses and ponies', attrs: 'mouthpiece type, discipline and training use' };
  }
  if (p.startsWith('/horse/rugs')) {
    return { titleAttr: 'for Horses in Australia', who: 'horses', attrs: 'weight, season and turnout or stable use' };
  }
  if (p.startsWith('/horse/tack')) {
    return { titleAttr: 'for Horses in Australia', who: 'horses', attrs: 'bridles, girths, reins and related tack' };
  }
  if (p.startsWith('/horse/boots')) {
    return { titleAttr: 'for Horses in Australia', who: 'horses', attrs: 'tendon, fetlock, overreach and bell protection' };
  }
  if (p.startsWith('/horse/pads')) {
    return { titleAttr: 'for Horses in Australia', who: 'horses', attrs: 'dressage, jump, western and half pads' };
  }
  if (p.startsWith('/horse')) {
    return { titleAttr: has('horse') ? 'in Australia' : 'for Horses in Australia', who: 'horses', attrs: 'type, fit and everyday stable or arena use' };
  }
  if (p.startsWith('/rider/helmets')) {
    return { titleAttr: 'in Australia', who: 'riders', attrs: 'safety standard, fit and discipline' };
  }
  if (p.startsWith('/rider/jewellery')) {
    return { titleAttr: 'in Australia', who: 'riders', attrs: 'material, style and everyday wear' };
  }
  if (p.startsWith('/rider')) {
    return { titleAttr: has('rider') || has('riding') ? 'in Australia' : 'for Riders in Australia', who: 'riders', attrs: 'safety, fit and everyday riding use' };
  }
  if (p.startsWith('/pet')) {
    return { titleAttr: 'in Australia', who: 'dogs', attrs: 'coats, collars and leads' };
  }
  if (p.includes('/books')) {
    return { titleAttr: 'in Australia', who: 'riders and horse owners', attrs: 'training, care and competition titles' };
  }
  if (p.includes('/gift')) {
    return { titleAttr: 'in Australia', who: 'horse lovers', attrs: 'occasion, budget and recipient' };
  }
  return { titleAttr: 'in Australia', who: 'riders and horse owners', attrs: 'type, use and everyday needs' };
}

function seoTitle(path: string, h1: string): string {
  const { titleAttr } = topic(path, h1);
  const core = `${h1} ${titleAttr}`.replace(/\s+/g, ' ').trim();
  let title = clipTitle(core);
  if (title.replace(BRAND, '').trim().toLowerCase() === h1.toLowerCase()) {
    title = clipTitle(`${h1} in Australia`);
  }
  return title;
}

function seoDescription(path: string, h1: string): string {
  const { who, attrs } = topic(path, h1);
  const desc = `${h1} for ${who}. Covers ${attrs}. Australia-wide shipping from The Equestrian.`;
  return desc.replace(/\s+/g, ' ').trim();
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const sql = createSql(floralProd);

  const rows = parse(readFileSync(CSV_PATH, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as CsvRow[];

  const plan = rows
    .filter((r) => (r.status || '').trim() === 'published')
    .map((r) => {
      const raw = (r.pill_title || '').trim();
      const pill = PILL_FIXES[raw] || raw;
      const h1 = pill;
      return {
        path: r.path.trim(),
        pill_title: pill,
        pill_typo_fixed: PILL_FIXES[raw] ? 'yes' : '',
        h1,
        breadcrumb_label: pill,
        seo_title: seoTitle(r.path.trim(), h1),
        seo_description: seoDescription(r.path.trim(), h1),
      };
    })
    .filter((r) => r.pill_title);

  const out = resolve(process.cwd(), 'exports/category-pill-h1-seo-plan.csv');
  writeFileSync(out, stringify(plan, { header: true }));

  console.log(`Pill → H1 + Koray SEO (${floralProd ? 'floral-prod' : 'local'})`);
  console.log(`  CSV: ${CSV_PATH}`);
  console.log(`  Plan: ${out} (${plan.length} published)`);
  console.log(`  Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  for (const row of plan.slice(0, 8)) {
    console.log(`${row.path}`);
    console.log(`  H1: ${row.h1}`);
    console.log(`  T:  ${row.seo_title} (${row.seo_title.length})`);
    console.log(`  D:  ${row.seo_description} (${row.seo_description.length})`);
  }
  console.log(`  ... ${plan.length} total`);

  if (!apply) {
    console.log('\nDry run — pass --apply to write collection_content.');
    return;
  }

  let updated = 0;
  for (const row of plan) {
    const result = (await sql`
      UPDATE collection_content
      SET h1_title = ${row.h1},
          breadcrumb_label = ${row.breadcrumb_label},
          meta_title = ${row.seo_title},
          meta_description = ${row.seo_description},
          updated_at = NOW()
      WHERE url_path = ${row.path}
      RETURNING url_path
    `) as Array<{ url_path: string }>;
    if (result.length) updated += 1;
    else console.log(`MISS ${row.path}`);
  }
  console.log(`\nUpdated ${updated}/${plan.length} collection_content rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
