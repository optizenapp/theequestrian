#!/usr/bin/env tsx
/**
 * Check if collection content is in Postgres
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
  console.log('🔍 Checking collection content in Postgres...\n');
  
  // Check total count
  const countResult = await sql`
    SELECT COUNT(*) as total FROM collection_content
  `;
  console.log(`📊 Total rows in collection_content: ${countResult[0].total}`);
  
  // Check a specific page
  const horseBootsResult = await sql`
    SELECT 
      url_path,
      h1_title,
      meta_title,
      LEFT(meta_description, 100) as meta_desc_preview,
      LEFT(short_description, 100) as short_desc_preview,
      status,
      generated_by,
      updated_at
    FROM collection_content
    WHERE url_path = '/horse/boots'
  `;
  
  if (horseBootsResult.length > 0) {
    console.log('\n✅ Found /horse/boots in Postgres:');
    console.log(JSON.stringify(horseBootsResult[0], null, 2));
  } else {
    console.log('\n❌ /horse/boots NOT found in Postgres');
  }
  
  // Check sample of other pages
  const sampleResult = await sql`
    SELECT url_path, h1_title, status, generated_by
    FROM collection_content
    ORDER BY url_path
    LIMIT 10
  `;
  
  console.log('\n📋 Sample of 10 pages:');
  sampleResult.forEach((row: any) => {
    console.log(`   ${row.url_path} - "${row.h1_title}" (${row.status}, by: ${row.generated_by})`);
  });
  
  console.log('\n✅ Done!');
})();
