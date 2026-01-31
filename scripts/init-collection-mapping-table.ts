#!/usr/bin/env tsx
/**
 * Initialize Collection Mapping Table
 * 
 * This script:
 * 1. Creates the collection_mapping table
 * 2. Creates all indexes and triggers
 * 3. Verifies the table structure
 * 4. Logs success
 * 
 * Run: npm run mapping:init
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

async function initCollectionMappingTable() {
  console.log('🚀 Initializing collection_mapping table...\n');

  try {
    console.log('🔨 Creating table, indexes, and triggers...');
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS collection_mapping (
        id SERIAL PRIMARY KEY,
        top_level TEXT NOT NULL,
        parent_category TEXT,
        subcategory_handle TEXT,
        product_type TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('include', 'exclude', 'merge')),
        merge_to TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_mapping_entry UNIQUE (top_level, parent_category, subcategory_handle, product_type)
      )
    `;
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_mapping_path ON collection_mapping(top_level, parent_category, subcategory_handle)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mapping_product_type ON collection_mapping(product_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mapping_action ON collection_mapping(action)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mapping_merge_to ON collection_mapping(merge_to) WHERE merge_to IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mapping_updated ON collection_mapping(updated_at DESC)`;
    
    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_mapping_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_mapping_updated ON collection_mapping
    `;
    await sql`
      CREATE TRIGGER trigger_mapping_updated
        BEFORE UPDATE ON collection_mapping
        FOR EACH ROW
        EXECUTE FUNCTION update_mapping_timestamp()
    `;

    console.log('✅ Table created successfully\n');

    // Verify the table exists
    console.log('🔍 Verifying table structure...');
    const tableInfo = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'collection_mapping'
      ORDER BY ordinal_position
    `;

    console.log(`✅ Found ${tableInfo.length} columns:`);
    tableInfo.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check indexes
    console.log('\n🔍 Verifying indexes...');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'collection_mapping'
      ORDER BY indexname
    `;

    console.log(`✅ Found ${indexes.length} indexes:`);
    indexes.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
    });

    // Check triggers
    console.log('\n🔍 Verifying triggers...');
    const triggers = await sql`
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_table = 'collection_mapping'
    `;

    console.log(`✅ Found ${triggers.length} trigger(s):`);
    triggers.forEach((trg: any) => {
      console.log(`   - ${trg.trigger_name} (${trg.event_manipulation})`);
    });

    // Check current row count
    console.log('\n🔍 Checking current data...');
    const count = await sql`SELECT COUNT(*) as count FROM collection_mapping`;
    console.log(`📊 Current row count: ${count[0].count}`);

    console.log('\n✅ Collection mapping table initialized successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run mapping:migrate (to import CSV data)');
    console.log('   2. Run: npm run mapping:audit (to check for issues)');
    console.log('   3. Run: npm run mapping:fix (to apply fixes)');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Run the initialization
initCollectionMappingTable()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
