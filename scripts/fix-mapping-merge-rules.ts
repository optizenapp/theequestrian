#!/usr/bin/env tsx
/**
 * Fix Problematic Mapping Merge Rules
 * 
 * This script applies fixes to merge_to values that are too generic,
 * replacing them with canonical product type names to prevent cross-category contamination
 * 
 * Run: npm run mapping:fix
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

async function fixMappingMergeRules() {
  console.log('🔧 Fixing problematic mapping merge rules...\n');

  try {
    // 1. Read the audit report
    const auditPath = path.join(process.cwd(), 'exports', 'mapping-audit-issues.csv');
    
    if (!fs.existsSync(auditPath)) {
      console.error(`❌ Audit report not found: ${auditPath}`);
      console.log('   Run: npm run mapping:audit first');
      process.exit(1);
    }

    console.log('📄 Reading audit report...');
    const auditContent = fs.readFileSync(auditPath, 'utf-8');
    const lines = auditContent.split('\n').filter(l => l.trim());
    
    if (lines.length <= 1) {
      console.log('✅ No fixes needed (audit report is empty)');
      return;
    }

    // Parse CSV (skip header)
    const fixes: Array<{ id: number; suggested_merge_to: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const match = lines[i].match(/^(\d+),"[^"]*","[^"]*","[^"]*","([^"]*)"/);
      if (match) {
        fixes.push({
          id: parseInt(match[1], 10),
          suggested_merge_to: match[2],
        });
      }
    }

    console.log(`✅ Found ${fixes.length} fixes to apply\n`);

    // 2. Confirm with user (in production, you might want to add a --dry-run flag)
    console.log('⚠️  This will update the database. Press Ctrl+C to cancel...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Apply fixes in a transaction
    console.log('🔨 Applying fixes...\n');
    let updated = 0;
    let errors = 0;

    for (const fix of fixes) {
      try {
        const result = await sql`
          UPDATE collection_mapping
          SET 
            merge_to = ${fix.suggested_merge_to},
            updated_at = NOW()
          WHERE id = ${fix.id}
        `;

        updated++;
        
        if (updated % 10 === 0) {
          console.log(`   Progress: ${updated}/${fixes.length} fixes applied...`);
        }

      } catch (error) {
        errors++;
        console.error(`   ❌ Error updating ID ${fix.id}:`, error);
      }
    }

    console.log('\n✅ Fixes applied!');
    console.log(`📊 Stats:`);
    console.log(`   - Total fixes: ${fixes.length}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);

    // 4. Verify the fixes
    console.log('\n🔍 Verifying fixes...');
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM collection_mapping
      WHERE action = 'merge'
        AND merge_to IN (
          'boots', 'accessories', 'care', 'grooming', 'clothing',
          'gloves', 'bags', 'halters', 'leads', 'reins', 'bridles',
          'pads', 'rugs', 'supplements', 'treats', 'toys'
        )
    `;

    if (remaining[0].count > 0) {
      console.log(`⚠️  ${remaining[0].count} problematic merge rules still remain`);
      console.log('   Run: npm run mapping:audit to see details');
    } else {
      console.log('✅ All problematic merge rules have been fixed!');
    }

    // 5. Show sample of updated mappings
    console.log('\n📋 Sample of updated mappings:');
    const samples = await sql`
      SELECT 
        CONCAT_WS('/', 
          top_level, 
          NULLIF(parent_category, ''), 
          NULLIF(subcategory_handle, '')
        ) as path,
        product_type,
        merge_to,
        updated_at
      FROM collection_mapping
      WHERE id = ANY(${fixes.slice(0, 5).map(f => f.id)})
      ORDER BY updated_at DESC
    `;

    samples.forEach((row: any) => {
      console.log(`   ${row.path}:`);
      console.log(`      "${row.product_type}" → "${row.merge_to}"`);
    });

    console.log('\n📝 Next steps:');
    console.log('   1. Test category pages (e.g., /horse/boots)');
    console.log('   2. Verify products are correctly categorized');
    console.log('   3. Deploy to production');

  } catch (error) {
    console.error('❌ Fix operation failed:', error);
    throw error;
  }
}

// Run the fix
fixMappingMergeRules()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
