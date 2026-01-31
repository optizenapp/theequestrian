#!/usr/bin/env tsx
/**
 * Initialize Collection Content Table in Neon Database
 * 
 * This script:
 * 1. Creates the collection_content table
 * 2. Creates all indexes for fast queries
 * 3. Sets up triggers for auto-updating timestamps
 * 4. Adds sample data for testing
 * 
 * Run: npx tsx scripts/init-collection-content-table.ts
 */

import { sql } from '@/lib/db/client';
import * as fs from 'fs';
import * as path from 'path';

async function initCollectionContentTable() {
  console.log('🚀 Initializing collection_content table...\n');

  try {
    console.log('📄 Creating table...');
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS collection_content (
        id SERIAL PRIMARY KEY,
        url_path TEXT UNIQUE NOT NULL,
        breadcrumb_label TEXT,
        parent_url TEXT,
        category_level INTEGER NOT NULL DEFAULT 1,
        h1_title TEXT NOT NULL,
        meta_title TEXT,
        meta_description TEXT,
        short_description TEXT,
        long_description TEXT,
        faq_items JSONB DEFAULT '[]'::jsonb,
        related_categories JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'published',
        default_sort TEXT DEFAULT 'best-selling',
        generated_by TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT valid_category_level CHECK (category_level >= 1 AND category_level <= 3),
        CONSTRAINT valid_status CHECK (status IN ('published', 'draft', 'archived'))
      )
    `;

    console.log('📄 Creating indexes...');
    
    // Create indexes one by one
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_url_path ON collection_content(url_path)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_status ON collection_content(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_level ON collection_content(category_level)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_collection_updated ON collection_content(updated_at DESC)`;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_collection_search ON collection_content 
      USING GIN(to_tsvector('english', 
        COALESCE(h1_title, '') || ' ' || 
        COALESCE(meta_title, '') || ' ' || 
        COALESCE(short_description, '')
      ))
    `;

    console.log('📄 Creating trigger function...');
    
    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_collection_content_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    console.log('📄 Creating trigger...');
    
    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_collection_content_updated ON collection_content
    `;
    await sql`
      CREATE TRIGGER trigger_collection_content_updated
        BEFORE UPDATE ON collection_content
        FOR EACH ROW
        EXECUTE FUNCTION update_collection_content_timestamp()
    `;

    console.log('✅ Table created successfully!\n');

    // Verify table exists and show structure
    console.log('📊 Verifying table structure...');
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'collection_content'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 Table columns:');
    console.table(columns);

    // Show indexes
    console.log('\n🔍 Indexes:');
    const indexes = await sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'collection_content'
    `;
    console.table(indexes);

    // Count sample data
    const count = await sql`SELECT COUNT(*) as count FROM collection_content`;
    console.log(`\n✅ Table initialized with ${count[0].count} sample record(s)`);

    console.log('\n🎉 Collection content table is ready!');
    console.log('\nNext steps:');
    console.log('1. Run migration script to import CSV data: npx tsx scripts/migrate-csv-to-db.ts');
    console.log('2. Update lib/content/collections.ts to read from database');
    console.log('3. Create API endpoint for AI agent to update content');

  } catch (error) {
    console.error('❌ Error initializing table:', error);
    throw error;
  }
}

// Run the initialization
initCollectionContentTable()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
