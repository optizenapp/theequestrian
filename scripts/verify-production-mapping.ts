#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(PROD_URL);

async function verifyMapping() {
  console.log('🔍 Checking horse/boots mapping in production...\n');

  // Get all product types for horse/boots
  const horseBootsMapping = await sql`
    SELECT product_type, action, merge_to
    FROM collection_mapping
    WHERE top_level = 'horse'
      AND parent_category = 'boots'
      AND action != 'exclude'
    ORDER BY product_type
  `;

  console.log(`✅ Found ${horseBootsMapping.length} product types for horse/boots:\n`);
  
  horseBootsMapping.slice(0, 20).forEach(row => {
    console.log(`   - ${row.product_type} (${row.action}${row.merge_to ? ` -> ${row.merge_to}` : ''})`);
  });
  
  if (horseBootsMapping.length > 20) {
    console.log(`   ... and ${horseBootsMapping.length - 20} more`);
  }

  // Check if any human footwear types are included
  const humanFootwear = horseBootsMapping.filter(row => 
    row.product_type.toLowerCase().includes('ariat') && 
    (row.product_type.toLowerCase().includes('duraterrain') || 
     row.product_type.toLowerCase().includes('ladies') ||
     row.product_type.toLowerCase().includes('mens'))
  );

  console.log('\n');
  if (humanFootwear.length > 0) {
    console.log('⚠️  WARNING: Found human footwear in horse/boots mapping:');
    humanFootwear.forEach(row => {
      console.log(`   - ${row.product_type}`);
    });
  } else {
    console.log('✅ No human footwear found in horse/boots mapping (correct!)');
  }
}

verifyMapping().catch(console.error);
