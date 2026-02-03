#!/usr/bin/env tsx
/**
 * Fix /horse/tack/bridles title mismatch
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
  console.log('🔧 Fixing /horse/tack/bridles title...\n');
  
  // Check current state
  const before = await sql`
    SELECT url_path, h1_title, breadcrumb_label, meta_title
    FROM collection_content
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  if (before.length === 0) {
    console.log('❌ Page not found in database');
    process.exit(1);
  }
  
  console.log('📋 Before:');
  console.log(JSON.stringify(before[0], null, 2));
  
  // Update
  await sql`
    UPDATE collection_content
    SET 
      h1_title = 'Bridles',
      breadcrumb_label = 'Bridles',
      meta_title = 'Bridles | The Equestrian',
      meta_description = 'Shop premium bridles from top equestrian brands. Quality leather bridles, anatomic designs, and bridle accessories. Free shipping Australia-wide.',
      updated_at = NOW()
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  // Check after
  const after = await sql`
    SELECT url_path, h1_title, breadcrumb_label, meta_title
    FROM collection_content
    WHERE url_path = '/horse/tack/bridles'
  `;
  
  console.log('\n✅ After:');
  console.log(JSON.stringify(after[0], null, 2));
  
  console.log('\n✅ Fixed /horse/tack/bridles!');
})();
