#!/usr/bin/env tsx
/**
 * Apply Category Structure Changes
 * 
 * This script applies the reviewed category changes:
 * 1. Creates missing categories in collection_content table
 * 2. Creates missing brands in brand_content table  
 * 3. Updates redirects/collections.csv with new mappings
 * 4. Regenerates lib/redirects/maps.ts
 * 
 * Run: npm run apply:categories
 * Dry run: npm run apply:categories -- --dry-run
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/vercel-postgres';
import { execSync } from 'child_process';

// ============================================================================
// TYPES
// ============================================================================

interface MissingCategory {
  url_path: string;
  parent_url: string | null;
  category_level: number;
  top_level: string;
  suggested_label: string;
  created_for_urls: string;
}

interface RedirectMapping {
  from: string;
  to: string;
  method: string;
  confidence: string;
  reasoning: string;
  is_new_category: string;
}

interface BrandInfo {
  handle: string;
  title: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const REDIRECTS_CSV_PATH = path.join(process.cwd(), 'exports', 'adjusted-full-audit-redirects-2026-02-09T02-29-58-449Z.csv');
const MISSING_CATEGORIES_CSV_PATH = path.join(process.cwd(), 'exports', 'adjusted-full-audit-missing-categories-2026-02-09T02-29-58-449Z.csv');

// ============================================================================
// DATA LOADING
// ============================================================================

function loadMissingCategories(): MissingCategory[] {
  const content = fs.readFileSync(MISSING_CATEGORIES_CSV_PATH, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records
    .filter((r: any) => r.url_path && r.url_path.trim()) // Skip empty rows
    .map((r: any) => ({
      url_path: r.url_path.trim(),
      parent_url: r.parent_url?.trim() || null,
      category_level: parseInt(r.category_level, 10),
      top_level: r.top_level.trim(),
      suggested_label: r.suggested_label.trim(),
      created_for_urls: r.created_for_urls || '',
    }));
}

function loadRedirectMappings(): RedirectMapping[] {
  const content = fs.readFileSync(REDIRECTS_CSV_PATH, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((r: any) => ({
    from: r.from.trim(),
    to: r.to.trim(),
    method: r.method.trim(),
    confidence: r.confidence.trim(),
    reasoning: r.reasoning || '',
    is_new_category: r.is_new_category || 'no',
  }));
}

// ============================================================================
// CATEGORY CREATION
// ============================================================================

async function createCategories(categories: MissingCategory[]) {
  console.log(`\n📝 Creating ${categories.length} missing categories...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const category of categories) {
    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would create: ${category.url_path}`);
        console.log(`  Label: ${category.suggested_label}`);
        console.log(`  Parent: ${category.parent_url || 'none'}`);
        console.log(`  Level: ${category.category_level}`);
        console.log('');
        created++;
        continue;
      }

      // Check if category already exists
      const existing = await sql`
        SELECT url_path FROM collection_content WHERE url_path = ${category.url_path}
      `;

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped (exists): ${category.url_path}`);
        skipped++;
        continue;
      }

      // Insert into collection_content
      const metaTitle = `${category.suggested_label} | The Equestrian`;
      const metaDescription = `Shop premium ${category.suggested_label.toLowerCase()} at The Equestrian. Free shipping Australia-wide.`;
      const shortDescription = `Quality ${category.suggested_label.toLowerCase()} for equestrians.`;
      const longDescription = `<h2>${category.suggested_label}</h2><p>Browse our collection of ${category.suggested_label.toLowerCase()}.</p>`;
      
      await sql`
        INSERT INTO collection_content (
          url_path,
          h1_title,
          meta_title,
          meta_description,
          short_description,
          long_description,
          breadcrumb_label,
          parent_url,
          category_level,
          status,
          default_sort,
          faq_items,
          related_categories
        ) VALUES (
          ${category.url_path},
          ${category.suggested_label},
          ${metaTitle},
          ${metaDescription},
          ${shortDescription},
          ${longDescription},
          ${category.suggested_label},
          ${category.parent_url},
          ${category.category_level},
          'published',
          'best-selling',
          '[]',
          '[]'
        )
      `;

      console.log(`✅ Created: ${category.url_path}`);
      created++;

    } catch (error) {
      console.error(`❌ Error creating ${category.url_path}:`, error);
      errors++;
    }
  }

  return { created, skipped, errors };
}

// ============================================================================
// BRAND CREATION
// ============================================================================

function extractBrandsFromCategories(categories: MissingCategory[]): BrandInfo[] {
  const brands: BrandInfo[] = [];

  for (const category of categories) {
    // Check if this is a brand path
    if (category.url_path.startsWith('/brands/')) {
      const handle = category.url_path.replace('/brands/', '');
      brands.push({
        handle,
        title: category.suggested_label,
      });
    }
  }

  return brands;
}

async function createBrands(brands: BrandInfo[]) {
  if (brands.length === 0) {
    console.log('\n📦 No new brands to create.\n');
    return { created: 0, skipped: 0, errors: 0 };
  }

  console.log(`\n📦 Creating ${brands.length} new brands...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const brand of brands) {
    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would create brand: ${brand.handle}`);
        console.log(`  Title: ${brand.title}`);
        console.log('');
        created++;
        continue;
      }

      // Check if brand already exists in brand_content
      const existing = await sql`
        SELECT handle FROM brand_content WHERE handle = ${brand.handle}
      `;

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped (exists): ${brand.handle}`);
        skipped++;
        continue;
      }

      // Insert into brand_content
      const metaTitle = `${brand.title} | The Equestrian`;
      const metaDescription = `Shop ${brand.title} products at The Equestrian. Free shipping Australia-wide.`;
      const shortDescription = `Quality ${brand.title} products for equestrians.`;
      const longDescription = `<h2>${brand.title}</h2><p>Browse our collection of ${brand.title} products.</p>`;
      
      await sql`
        INSERT INTO brand_content (
          handle,
          title,
          h1_title,
          meta_title,
          meta_description,
          short_description,
          long_description,
          breadcrumb_label,
          faq_json,
          status
        ) VALUES (
          ${brand.handle},
          ${brand.title},
          ${brand.title},
          ${metaTitle},
          ${metaDescription},
          ${shortDescription},
          ${longDescription},
          ${brand.title},
          '[]',
          'published'
        )
      `;

      console.log(`✅ Created brand: ${brand.handle}`);
      created++;

    } catch (error) {
      console.error(`❌ Error creating brand ${brand.handle}:`, error);
      errors++;
    }
  }

  return { created, skipped, errors };
}

// ============================================================================
// REDIRECT UPDATES
// ============================================================================

function updateRedirectsCSV(mappings: RedirectMapping[]) {
  console.log(`\n🔀 Updating redirects CSV with ${mappings.length} mappings...\n`);

  const redirectsPath = path.join(process.cwd(), 'redirects', 'collections.csv');

  // Convert mappings to simple from/to format
  const redirects = mappings.map(m => ({
    from: m.from,
    to: m.to,
  }));

  // Write CSV
  const csvContent = stringify(redirects, {
    header: true,
    columns: ['from', 'to'],
  });

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would write ${redirects.length} redirects to ${redirectsPath}`);
    console.log('\nSample redirects:');
    for (const redirect of redirects.slice(0, 5)) {
      console.log(`  ${redirect.from} → ${redirect.to}`);
    }
    console.log('  ...');
    return;
  }

  fs.writeFileSync(redirectsPath, csvContent);
  console.log(`✅ Updated ${redirectsPath}`);
}

function regenerateRedirectMaps() {
  console.log('\n🔄 Regenerating redirect maps...\n');

  if (DRY_RUN) {
    console.log('[DRY RUN] Would run: tsx scripts/generate-redirects.ts');
    return;
  }

  try {
    execSync('tsx scripts/generate-redirects.ts', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log('✅ Redirect maps regenerated');
  } catch (error) {
    console.error('❌ Error regenerating redirect maps:', error);
    throw error;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Apply Category Structure Changes\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Load data
  console.log('📥 Loading data...\n');
  const categories = loadMissingCategories();
  const redirects = loadRedirectMappings();
  const brands = extractBrandsFromCategories(categories);

  console.log(`✅ Loaded ${categories.length} categories to create`);
  console.log(`✅ Loaded ${brands.length} brands to create`);
  console.log(`✅ Loaded ${redirects.length} redirect mappings`);

  // Phase 1: Create categories
  const categoryResults = await createCategories(categories);

  // Phase 2: Create brands
  const brandResults = await createBrands(brands);

  // Phase 3: Update redirects
  updateRedirectsCSV(redirects);

  // Phase 4: Regenerate redirect maps
  regenerateRedirectMaps();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log('\n📝 Categories:');
  console.log(`  Created: ${categoryResults.created}`);
  console.log(`  Skipped (already exist): ${categoryResults.skipped}`);
  console.log(`  Errors: ${categoryResults.errors}`);

  console.log('\n📦 Brands:');
  console.log(`  Created: ${brandResults.created}`);
  console.log(`  Skipped (already exist): ${brandResults.skipped}`);
  console.log(`  Errors: ${brandResults.errors}`);

  console.log('\n🔀 Redirects:');
  console.log(`  Total mappings: ${redirects.length}`);
  console.log(`  Updated: ${DRY_RUN ? '(dry run)' : 'Yes'}`);

  console.log('\n' + '='.repeat(80));

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ All changes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run content generation for new categories: npm run content:generate');
    console.log('  2. Review new categories in admin: /admin/categories');
    console.log('  3. Review new brands in admin: /admin/categories/brands');
    console.log('  4. Test some redirects to verify they work');
    console.log('  5. Deploy changes: git add . && git commit && git push');
  }

  console.log('\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
