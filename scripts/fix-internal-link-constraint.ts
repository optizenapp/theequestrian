#!/usr/bin/env tsx
/**
 * Fix internal_link_graph constraint issue
 * Drops the CHECK constraint that limits link_type to specific values
 */

import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ No database URL found in environment');
    console.error('   Set POSTGRES_URL or DATABASE_URL');
    process.exit(1);
  }

  console.log('🔧 Fixing internal_link_graph constraint...');
  
  const sql = neon(databaseUrl);

  try {
    // Drop the constraint
    await sql`
      ALTER TABLE internal_link_graph 
      DROP CONSTRAINT IF EXISTS internal_link_graph_link_type_check;
    `;
    
    console.log('✅ Successfully dropped link_type CHECK constraint');
    console.log('   Internal linking will now accept any link_type value');
    
    // Check current failed items
    const failedItems = await sql`
      SELECT COUNT(*) as count 
      FROM enrichment_queue 
      WHERE status = 'failed';
    `;
    
    if (failedItems[0]?.count > 0) {
      console.log(`\n📋 Found ${failedItems[0].count} failed items in queue`);
      console.log('   Run this to retry them:');
      console.log('   npm run seo:enrichment:worker -- --command=retry-failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
