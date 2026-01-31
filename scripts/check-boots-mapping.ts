#!/usr/bin/env tsx
/**
 * Check horse/boots mapping rules
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Missing POSTGRES_URL or DATABASE_URL');
  process.exit(1);
}
const sql = neon(connectionString);

(async () => {
  console.log('🔍 Checking horse/boots mapping rules...\n');
  
  const horseBootsRules = await sql`
    SELECT 
      id,
      CONCAT_WS('/', top_level, COALESCE(parent_category, ''), COALESCE(subcategory_handle, '')) as path,
      product_type,
      action,
      merge_to
    FROM collection_mapping
    WHERE top_level = 'horse' 
      AND parent_category = 'boots'
    ORDER BY action, id
  `;
  
  console.log(`Found ${horseBootsRules.length} rules for horse/boots:\n`);
  
  const byAction = {
    include: horseBootsRules.filter((r: any) => r.action === 'include'),
    merge: horseBootsRules.filter((r: any) => r.action === 'merge'),
    exclude: horseBootsRules.filter((r: any) => r.action === 'exclude'),
  };
  
  console.log(`📊 Include rules (${byAction.include.length}):`);
  byAction.include.forEach((r: any) => {
    console.log(`   ${r.path}: "${r.product_type}"`);
  });
  
  console.log(`\n📊 Merge rules (${byAction.merge.length}):`);
  byAction.merge.forEach((r: any) => {
    console.log(`   ${r.path}: "${r.product_type}" → "${r.merge_to}"`);
  });
  
  if (byAction.exclude.length > 0) {
    console.log(`\n📊 Exclude rules (${byAction.exclude.length}):`);
    byAction.exclude.forEach((r: any) => {
      console.log(`   ${r.path}: "${r.product_type}"`);
    });
  }
  
  // Check what product types will be included in the query
  const allTypes = new Set<string>();
  byAction.include.forEach((r: any) => allTypes.add(r.product_type));
  byAction.merge.forEach((r: any) => {
    allTypes.add(r.product_type);
    if (r.merge_to) allTypes.add(r.merge_to);
  });
  
  console.log(`\n🔍 Resulting product types in query (${allTypes.size}):`);
  Array.from(allTypes).sort().forEach(type => {
    console.log(`   - "${type}"`);
  });
  
  console.log('\n✅ Done!');
})();
