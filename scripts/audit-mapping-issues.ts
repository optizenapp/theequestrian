#!/usr/bin/env tsx
/**
 * Audit Collection Mapping for Problematic Merge Rules
 * 
 * This script identifies merge_to values that are too generic and cause
 * cross-category contamination (e.g., "boots" pulling in both horse and human boots)
 * 
 * Run: npm run mapping:audit
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Create SQL client directly
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL or DATABASE_URL');
  process.exit(1);
}
const sql = neon(connectionString);

// Generic/ambiguous product type handles that appear across multiple categories
const GENERIC_HANDLES = [
  'boots',
  'accessories',
  'care',
  'grooming',
  'clothing',
  'gloves',
  'bags',
  'halters',
  'leads',
  'reins',
  'bridles',
  'pads',
  'rugs',
  'supplements',
  'treats',
  'toys',
  'helmets',
  'bits',
  'spurs',
  'whips',
  'chaps',
  'belts',
  'socks',
  'hats',
];

interface ProblematicMapping {
  id: number;
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  merge_to: string;
  path: string;
  usage_count: number;
}

async function auditMappingIssues() {
  console.log('🔍 Auditing collection mapping for problematic merge rules...\n');

  try {
    // 1. Find all merge_to values that are generic/ambiguous
    console.log('📊 Finding problematic merge_to values...');
    const problematicMerges = await sql`
      SELECT 
        id,
        top_level,
        parent_category,
        subcategory_handle,
        product_type,
        merge_to,
        CONCAT_WS('/', 
          top_level, 
          NULLIF(parent_category, ''), 
          NULLIF(subcategory_handle, '')
        ) as path,
        COUNT(*) OVER (PARTITION BY merge_to) as usage_count
      FROM collection_mapping
      WHERE action = 'merge'
        AND merge_to = ANY(${GENERIC_HANDLES})
      ORDER BY merge_to, top_level, parent_category, subcategory_handle
    ` as ProblematicMapping[];

    if (problematicMerges.length === 0) {
      console.log('✅ No problematic merge rules found!');
      return;
    }

    console.log(`⚠️  Found ${problematicMerges.length} problematic merge rules\n`);

    // 2. Group by merge_to value
    const groupedByMergeTo = new Map<string, ProblematicMapping[]>();
    for (const row of problematicMerges) {
      if (!groupedByMergeTo.has(row.merge_to)) {
        groupedByMergeTo.set(row.merge_to, []);
      }
      groupedByMergeTo.get(row.merge_to)!.push(row);
    }

    // 3. Display grouped results
    console.log('📋 Problematic merge_to values:\n');
    for (const [mergeTo, mappings] of groupedByMergeTo.entries()) {
      console.log(`🔴 merge_to: "${mergeTo}" (used ${mappings.length} times)`);
      
      // Group by top_level to show which categories are affected
      const byCategory = new Map<string, ProblematicMapping[]>();
      for (const mapping of mappings) {
        if (!byCategory.has(mapping.top_level)) {
          byCategory.set(mapping.top_level, []);
        }
        byCategory.get(mapping.top_level)!.push(mapping);
      }

      for (const [category, items] of byCategory.entries()) {
        console.log(`   ${category}:`);
        for (const item of items) {
          console.log(`      - ${item.path}: "${item.product_type}"`);
        }
      }
      console.log('');
    }

    // 4. Generate suggested fixes
    console.log('💡 Suggested fixes:\n');
    const fixes: Array<{ id: number; path: string; product_type: string; current_merge_to: string; suggested_merge_to: string }> = [];

    for (const mapping of problematicMerges) {
      // Suggest using the first product_type in the path as the canonical merge target
      // For example, horse/boots with "HORSE: Horse Boots" → merge to "Horse Boots" (not "boots")
      
      // Find the first "include" action product_type for this path
      const canonicalType = await sql`
        SELECT product_type
        FROM collection_mapping
        WHERE top_level = ${mapping.top_level}
          AND COALESCE(parent_category, '') = COALESCE(${mapping.parent_category}, '')
          AND COALESCE(subcategory_handle, '') = COALESCE(${mapping.subcategory_handle}, '')
          AND action = 'include'
        ORDER BY id
        LIMIT 1
      `;

      const suggestedMergeTo = canonicalType.length > 0 
        ? canonicalType[0].product_type 
        : mapping.product_type; // Fallback to self if no include found

      fixes.push({
        id: mapping.id,
        path: mapping.path,
        product_type: mapping.product_type,
        current_merge_to: mapping.merge_to,
        suggested_merge_to: suggestedMergeTo,
      });

      console.log(`   ${mapping.path}:`);
      console.log(`      Product Type: "${mapping.product_type}"`);
      console.log(`      Current merge_to: "${mapping.merge_to}" ❌`);
      console.log(`      Suggested merge_to: "${suggestedMergeTo}" ✅`);
      console.log('');
    }

    // 5. Export to CSV for review
    const outputPath = path.join(process.cwd(), 'exports', 'mapping-audit-issues.csv');
    const csvLines = [
      'id,path,product_type,current_merge_to,suggested_merge_to',
      ...fixes.map(f => `${f.id},"${f.path}","${f.product_type}","${f.current_merge_to}","${f.suggested_merge_to}"`)
    ];
    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
    console.log(`📄 Exported audit report to: ${outputPath}\n`);

    // 6. Summary statistics
    console.log('📊 Summary:');
    console.log(`   - Total problematic merges: ${problematicMerges.length}`);
    console.log(`   - Unique merge_to values: ${groupedByMergeTo.size}`);
    console.log(`   - Categories affected: ${new Set(problematicMerges.map(m => m.top_level)).size}`);
    console.log('');

    console.log('📝 Next steps:');
    console.log('   1. Review the audit report: exports/mapping-audit-issues.csv');
    console.log('   2. Run: npm run mapping:fix (to apply suggested fixes)');
    console.log('   3. Test category pages to verify fixes');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    throw error;
  }
}

// Run the audit
auditMappingIssues()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
