/**
 * Validate category slugs from classification CSV against collection_mapping table
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { sql } from '@/lib/db/vercel-postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

interface ClassificationRow {
  shopify_id: string;
  handle: string;
  title: string;
  cat_slug: string;
  cat_title: string;
  suggested_type: string;
  confidence: string;
}

interface CategoryContent {
  url_path: string;
  h1_title: string;
  category_level: number;
  parent_url: string | null;
}

async function validateCategorySlugs() {
  console.log('🔍 Validating category slugs...\n');

  const csvFile = path.join(process.cwd(), 'exports', 'ai-classified-products-gpt-4o-2026-02-10-FINAL.csv');
  
  console.log(`📖 Reading CSV: ${path.basename(csvFile)}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as ClassificationRow[];
  console.log(`   ✓ Loaded ${rows.length} products\n`);

  // Fetch all valid category slugs from DB
  console.log('🗄️  Fetching valid categories from database...');
  const { rows: categories } = await sql<CategoryContent>`
    SELECT url_path, h1_title, category_level, parent_url
    FROM collection_content
    WHERE status = 'published'
    ORDER BY category_level, url_path
  `;
  console.log(`   ✓ Loaded ${categories.length} valid categories\n`);

  // Build set of valid slugs (url_path)
  const validSlugs = new Set(categories.map(c => c.url_path));
  const categoryMap = new Map(categories.map(c => [c.url_path, c]));

  // Validate each product's cat_slug
  const invalidSlugs = new Map<string, number>(); // slug -> count
  const missingSlug: ClassificationRow[] = [];
  const validProducts: ClassificationRow[] = [];

  for (const row of rows) {
    if (!row.cat_slug || row.cat_slug.trim() === '') {
      missingSlug.push(row);
      continue;
    }

    if (!validSlugs.has(row.cat_slug)) {
      const count = invalidSlugs.get(row.cat_slug) || 0;
      invalidSlugs.set(row.cat_slug, count + 1);
    } else {
      validProducts.push(row);
    }
  }

  // Generate validation report
  console.log('📊 Validation Results:');
  console.log(`   • Total products: ${rows.length}`);
  console.log(`   • Valid categories: ${validProducts.length}`);
  console.log(`   • Missing cat_slug: ${missingSlug.length}`);
  console.log(`   • Invalid cat_slug: ${Array.from(invalidSlugs.values()).reduce((a, b) => a + b, 0)}`);
  console.log(`   • Unique invalid slugs: ${invalidSlugs.size}\n`);

  if (invalidSlugs.size > 0) {
    console.log('❌ Invalid Category Slugs Found:\n');
    const sortedInvalid = Array.from(invalidSlugs.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedInvalid.forEach(([slug, count]) => {
      console.log(`   • ${slug} (${count} products)`);
    });
    console.log('');
  }

  if (missingSlug.length > 0) {
    console.log('⚠️  Products Missing cat_slug:\n');
    missingSlug.slice(0, 10).forEach(row => {
      console.log(`   • ${row.handle} | ${row.title}`);
    });
    if (missingSlug.length > 10) {
      console.log(`   ... and ${missingSlug.length - 10} more\n`);
    }
  }

  // Write detailed report
  const reportFile = path.join(process.cwd(), 'exports', 'category-validation-report.txt');
  const report = [
    '='.repeat(70),
    'CATEGORY SLUG VALIDATION REPORT',
    '='.repeat(70),
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'SUMMARY:',
    `  - Total products: ${rows.length}`,
    `  - Valid categories: ${validProducts.length}`,
    `  - Missing cat_slug: ${missingSlug.length}`,
    `  - Invalid cat_slug: ${Array.from(invalidSlugs.values()).reduce((a, b) => a + b, 0)}`,
    `  - Unique invalid slugs: ${invalidSlugs.size}`,
    '',
  ];

  if (invalidSlugs.size > 0) {
    report.push('INVALID CATEGORY SLUGS:');
    report.push('');
    const sortedInvalid = Array.from(invalidSlugs.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedInvalid.forEach(([slug, count]) => {
      report.push(`  ${slug}`);
      report.push(`    - Product count: ${count}`);
      report.push(`    - Suggested fix: Check if slug exists in collection_mapping`);
      report.push('');
    });
  }

  if (missingSlug.length > 0) {
    report.push('PRODUCTS MISSING CAT_SLUG:');
    report.push('');
    missingSlug.forEach(row => {
      report.push(`  - ${row.shopify_id}`);
      report.push(`    Handle: ${row.handle}`);
      report.push(`    Title: ${row.title}`);
      report.push(`    Suggested Type: ${row.suggested_type}`);
      report.push('');
    });
  }

  // Show category hierarchy for reference
  report.push('='.repeat(70));
  report.push('VALID CATEGORY STRUCTURE (for reference):');
  report.push('='.repeat(70));
  report.push('');

  const level1 = categories.filter(c => c.category_level === 1);
  for (const l1 of level1) {
    report.push(`${l1.url_path} (${l1.h1_title})`);
    const level2 = categories.filter(c => c.category_level === 2 && c.parent_url === l1.url_path);
    for (const l2 of level2) {
      report.push(`  ├─ ${l2.url_path} (${l2.h1_title})`);
      const level3 = categories.filter(c => c.category_level === 3 && c.parent_url === l2.url_path);
      for (const l3 of level3) {
        report.push(`     └─ ${l3.url_path} (${l3.h1_title})`);
      }
    }
    report.push('');
  }

  report.push('='.repeat(70));

  fs.writeFileSync(reportFile, report.join('\n'));
  console.log(`📄 Detailed report saved: ${path.basename(reportFile)}\n`);

  if (invalidSlugs.size === 0 && missingSlug.length === 0) {
    console.log('✅ All category slugs are valid!\n');
    console.log('Next steps:');
    console.log('  1. Review the merged CSV');
    console.log('  2. Run: npm run ai:allocate-products -- --dry-run');
  } else {
    console.log('⚠️  Validation issues found. Please review and fix before proceeding.\n');
    process.exit(1);
  }
}

validateCategorySlugs().catch(console.error);
