/**
 * Neon Database Client
 * Provides connection and query utilities for the product database
 * Uses existing Neon database (same as reviews)
 */

import { neon } from '@neondatabase/serverless';

// Use POSTGRES_URL or DATABASE_URL (same connection as reviews)
// In production, these are set as environment variables by Vercel
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing database connection string. Set POSTGRES_URL or DATABASE_URL');
}
const sql = neon(connectionString);

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('[DB] Connection successful:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    return false;
  }
}

/**
 * Initialize database schema
 * Run this once to set up tables and indexes
 */
export async function initializeSchema(): Promise<void> {
  try {
    console.log('[DB] Initializing schema...');
    
    // Create products table
    console.log('[DB] Creating products table...');
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        vendor TEXT,
        product_type TEXT,
        tags TEXT[] DEFAULT '{}',
        image_url TEXT,
        image_alt TEXT,
        available_for_sale BOOLEAN DEFAULT true,
        shopify_created_at TIMESTAMP,
        synced_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        search_vector tsvector
      )
    `;
    
    // Create indexes
    console.log('[DB] Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_handle ON products(handle)',
      'CREATE INDEX IF NOT EXISTS idx_vendor ON products(vendor)',
      'CREATE INDEX IF NOT EXISTS idx_product_type ON products(product_type)',
      'CREATE INDEX IF NOT EXISTS idx_tags ON products USING GIN(tags)',
      'CREATE INDEX IF NOT EXISTS idx_available ON products(available_for_sale)',
      'CREATE INDEX IF NOT EXISTS idx_created_at ON products(shopify_created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_search ON products USING GIN(search_vector)',
    ];
    
    for (const index of indexes) {
      await sql.unsafe(index);
    }
    
    // Create facet_cache table
    console.log('[DB] Creating facet_cache table...');
    await sql`
      CREATE TABLE IF NOT EXISTS facet_cache (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        filters JSONB DEFAULT '{}',
        facets JSONB NOT NULL,
        product_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category, filters)
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_facet_category ON facet_cache(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_facet_filters ON facet_cache USING GIN(filters)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_facet_updated ON facet_cache(updated_at DESC)`;
    
    // Create sync_log table
    console.log('[DB] Creating sync_log table...');
    await sql`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        sync_type TEXT NOT NULL,
        products_synced INTEGER DEFAULT 0,
        products_failed INTEGER DEFAULT 0,
        duration_ms INTEGER,
        error_message TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_sync_started ON sync_log(started_at DESC)`;
    
    console.log('[DB] ✅ Schema initialized successfully');
  } catch (error) {
    console.error('[DB] ❌ Schema initialization failed:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const productCount = await sql`SELECT COUNT(*) as count FROM products`;
    const lastSync = await sql`
      SELECT completed_at, products_synced 
      FROM sync_log 
      WHERE completed_at IS NOT NULL 
      ORDER BY completed_at DESC 
      LIMIT 1
    `;
    
    return {
      totalProducts: parseInt(productCount[0].count),
      lastSync: lastSync[0] || null,
    };
  } catch (error) {
    console.error('[DB] Error getting stats:', error);
    return null;
  }
}

/**
 * Clear all products (use with caution!)
 */
export async function clearProducts(): Promise<void> {
  try {
    console.log('[DB] Clearing all products...');
    await sql`TRUNCATE TABLE products CASCADE`;
    console.log('[DB] ✅ Products cleared');
  } catch (error) {
    console.error('[DB] ❌ Failed to clear products:', error);
    throw error;
  }
}

export { sql };
