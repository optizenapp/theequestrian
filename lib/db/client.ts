/**
 * Neon Database Client
 * Provides connection and query utilities for the product database
 * Uses existing Neon database (same as reviews)
 */

import { neon } from '@neondatabase/serverless';

// Lazy connection - only initialize when sql is accessed
// This allows dotenv to load vars before database connection is created
let _sql: ReturnType<typeof neon> | null = null;

/** Reset the DB client (e.g. after quota/plan change). Next query will create a new connection. */
export function resetDbClient(): void {
  _sql = null;
}

function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing database connection string. Set POSTGRES_URL or DATABASE_URL');
    }
    _sql = neon(connectionString);
  }
  return _sql;
}

function isQuotaError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const msg = String((err as { message?: string }).message ?? '');
    return msg.includes('402') || msg.includes('data transfer quota') || msg.includes('exceeded');
  }
  return false;
}

// Export sql as a template tag function with lazy initialization
// Usage: sql`SELECT * FROM table`
// On 402 / quota errors, reset client so next request gets a fresh connection after plan upgrade.
function sqlTemplateTag(strings: TemplateStringsArray, ...values: any[]) {
  const result = getSql()(strings, ...values);
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return (result as Promise<unknown>).catch((err: unknown) => {
      if (isQuotaError(err)) resetDbClient();
      throw err;
    });
  }
  return result;
}

export const sql = sqlTemplateTag as ReturnType<typeof neon>;

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    const row = Array.isArray(result)
      ? (result[0] as Record<string, unknown> | undefined)
      : undefined;
    console.log(
      '[DB] Connection successful:',
      (row?.current_time as string | Date | undefined) ?? 'unknown'
    );
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

    // Create product_category_assignments table
    console.log('[DB] Creating product_category_assignments table...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_category_assignments (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        product_handle TEXT NOT NULL UNIQUE,
        canonical_path TEXT NOT NULL UNIQUE,
        category_path TEXT NOT NULL,
        top_level TEXT NOT NULL,
        parent_category TEXT,
        subcategory_handle TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_pca_category_path ON product_category_assignments(category_path)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pca_top_level ON product_category_assignments(top_level)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pca_parent_category ON product_category_assignments(parent_category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pca_subcategory ON product_category_assignments(subcategory_handle)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pca_product_handle ON product_category_assignments(product_handle)`;

    // Create product_content_overrides table
    console.log('[DB] Creating product_content_overrides table...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_content_overrides (
        id SERIAL PRIMARY KEY,
        product_id TEXT,
        product_handle TEXT NOT NULL UNIQUE,
        title_override TEXT,
        meta_title TEXT,
        meta_description TEXT,
        top_description_html TEXT,
        bottom_description_html TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_pco_product_id ON product_content_overrides(product_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pco_product_handle ON product_content_overrides(product_handle)`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_title BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_meta_title BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_meta_description BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_top_description BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_bottom_description BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS description_html TEXT`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS bullet_points JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS slug_override TEXT`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_description BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_bullets BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE product_content_overrides ADD COLUMN IF NOT EXISTS use_headless_slug BOOLEAN DEFAULT false`;

    // Create static_pages table
    console.log('[DB] Creating static_pages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS static_pages (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        meta_title TEXT,
        meta_description TEXT,
        intro_html TEXT,
        body_html TEXT,
        bottom_html TEXT,
        status TEXT DEFAULT 'published',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_static_pages_status ON static_pages(status)`;

    // Create brand_content table
    console.log('[DB] Creating brand_content table...');
    await sql`
      CREATE TABLE IF NOT EXISTS brand_content (
        id SERIAL PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        h1_title TEXT,
        meta_title TEXT,
        meta_description TEXT,
        short_description TEXT,
        long_description TEXT,
        breadcrumb_label TEXT,
        faq_json TEXT,
        status TEXT DEFAULT 'published',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_status ON brand_content(status)`;

    // Create home_sections table
    console.log('[DB] Creating home_sections table...');
    await sql`
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        eyebrow TEXT,
        title_html TEXT,
        subtitle_html TEXT,
        body_html TEXT,
        cta_text TEXT,
        cta_link TEXT,
        secondary_cta_text TEXT,
        secondary_cta_link TEXT,
        image_url TEXT,
        image_alt TEXT,
        image_link TEXT,
        most_wanted_items_json JSONB,
        product_handles TEXT,
        faqs_json JSONB,
        seen_in_json JSONB,
        items_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_home_sections_enabled ON home_sections(enabled)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_home_sections_sort_order ON home_sections(sort_order)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_home_sections_type ON home_sections(type)`;

    // Create gmc_integration table
    console.log('[DB] Creating gmc_integration table...');
    await sql`
      CREATE TABLE IF NOT EXISTS gmc_integration (
        id INTEGER PRIMARY KEY DEFAULT 1,
        merchant_id TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        scope TEXT,
        feed_id TEXT,
        feed_name TEXT,
        feed_fetch_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_gmc_integration_singleton ON gmc_integration(id)`;

    // Create gmc_feed_uploads table
    console.log('[DB] Creating gmc_feed_uploads table...');
    await sql`
      CREATE TABLE IF NOT EXISTS gmc_feed_uploads (
        id SERIAL PRIMARY KEY,
        item_count INTEGER NOT NULL,
        file_size_bytes BIGINT,
        s3_url TEXT NOT NULL,
        s3_bucket TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        source TEXT DEFAULT 'cron',
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_gmc_feed_uploads_created ON gmc_feed_uploads(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gmc_feed_uploads_source ON gmc_feed_uploads(source)`;
    
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
    
    const countRow = Array.isArray(productCount)
      ? (productCount[0] as Record<string, unknown> | undefined)
      : undefined;
    const syncRow = Array.isArray(lastSync)
      ? (lastSync[0] as Record<string, unknown> | undefined)
      : undefined;
    
    return {
      totalProducts: countRow ? parseInt(countRow.count as string) : 0,
      lastSync: syncRow ? {
        completed_at: syncRow.completed_at as Date,
        products_synced: syncRow.products_synced as number,
      } : null,
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

