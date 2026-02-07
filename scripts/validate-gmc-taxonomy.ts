/**
 * Validate GMC Product Category Mapping
 *
 * Checks that all category IDs in gmc-product-category-mapping.csv
 * exist in Google's official taxonomy and reports any issues.
 *
 * Usage: tsx scripts/validate-gmc-taxonomy.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import path from 'path';
import * as csv from 'csv-parse/sync';

type MappingRow = {
  product_type: string;
  google_product_category: string;
  category_name?: string;
};

type TaxonomyEntry = {
  id: string;
  path: string;
};

function loadOfficialTaxonomy(): Map<string, string> {
  const taxonomyPath = path.join(process.cwd(), 'config', 'google-product-taxonomy-official.txt');
  
  if (!fs.existsSync(taxonomyPath)) {
    throw new Error(`Official taxonomy not found: ${taxonomyPath}`);
  }

  const content = fs.readFileSync(taxonomyPath, 'utf8');
  const lines = content.split('\n');
  const taxonomy = new Map<string, string>();

  lines.forEach((line) => {
    const match = line.match(/^(\d+)\s+-\s+(.+)$/);
    if (match) {
      const [, id, path] = match;
      taxonomy.set(id, path);
    }
  });

  console.log(`✅ Loaded ${taxonomy.size} official Google taxonomy entries`);
  return taxonomy;
}

function loadMapping(): MappingRow[] {
  const mappingPath = path.join(process.cwd(), 'config', 'gmc-product-category-mapping.csv');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}`);
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  console.log(`✅ Loaded ${records.length} product type mappings\n`);
  return records;
}

async function validateMapping() {
  console.log('🔍 Validating GMC Product Category Mapping...\n');

  const officialTaxonomy = loadOfficialTaxonomy();
  const mapping = loadMapping();

  const issues: Array<{ productType: string; categoryId: string; issue: string }> = [];
  const valid: Array<{ productType: string; categoryId: string; categoryPath: string }> = [];

  mapping.forEach((row) => {
    const categoryId = row.google_product_category.trim();
    const productType = row.product_type.trim();

    if (!categoryId || categoryId === '') {
      issues.push({
        productType,
        categoryId: 'EMPTY',
        issue: 'Missing category ID',
      });
      return;
    }

    const officialPath = officialTaxonomy.get(categoryId);
    
    if (!officialPath) {
      issues.push({
        productType,
        categoryId,
        issue: 'Category ID not found in official taxonomy',
      });
      return;
    }

    // Check if provided category_name matches official path (if provided)
    if (row.category_name && row.category_name.trim() !== '') {
      const providedName = row.category_name.trim();
      if (providedName !== officialPath) {
        issues.push({
          productType,
          categoryId,
          issue: `Category name mismatch. Expected: "${officialPath}", Got: "${providedName}"`,
        });
        return;
      }
    }

    valid.push({
      productType,
      categoryId,
      categoryPath: officialPath,
    });
  });

  console.log(`\n📊 Validation Results:\n`);
  console.log(`✅ Valid mappings: ${valid.length}`);
  console.log(`❌ Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('❌ Issues:\n');
    issues.forEach(({ productType, categoryId, issue }) => {
      console.log(`  - ${productType}`);
      console.log(`    Category ID: ${categoryId}`);
      console.log(`    Issue: ${issue}\n`);
    });
  }

  if (valid.length > 0) {
    console.log('✅ Valid Mappings (sample):\n');
    valid.slice(0, 10).forEach(({ productType, categoryId, categoryPath }) => {
      console.log(`  - ${productType}`);
      console.log(`    ID: ${categoryId}`);
      console.log(`    Path: ${categoryPath}\n`);
    });
    
    if (valid.length > 10) {
      console.log(`  ... and ${valid.length - 10} more valid mappings\n`);
    }
  }

  // Summary by category
  const categoryUsage = new Map<string, string[]>();
  valid.forEach(({ productType, categoryPath }) => {
    const topLevel = categoryPath.split(' > ')[0];
    if (!categoryUsage.has(topLevel)) {
      categoryUsage.set(topLevel, []);
    }
    categoryUsage.get(topLevel)!.push(productType);
  });

  console.log('📊 Category Distribution:\n');
  Array.from(categoryUsage.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([category, types]) => {
      console.log(`  ${category}: ${types.length} product types`);
    });

  if (issues.length > 0) {
    console.log('\n❌ Validation FAILED - Fix issues above');
    process.exit(1);
  } else {
    console.log('\n✅ Validation PASSED - All mappings are valid!');
  }
}

if (require.main === module) {
  validateMapping().catch((error) => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  });
}

export { validateMapping };
