/**
 * Add gmc_feed_uploads table for tracking feed uploads
 * 
 * Usage: tsx scripts/add-gmc-feed-log-table.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { sql } from '@/lib/db/client';

async function addGmcFeedLogTable() {
  console.log('[Migration] Creating gmc_feed_uploads table...');
  
  try {
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
    
    console.log('[Migration] Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_gmc_feed_uploads_created ON gmc_feed_uploads(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gmc_feed_uploads_source ON gmc_feed_uploads(source)`;
    
    console.log('[Migration] ✅ Table created successfully');
    
    // Show existing uploads if any
    const count = await sql`SELECT COUNT(*) as count FROM gmc_feed_uploads`;
    const countRow = Array.isArray(count) ? (count[0] as Record<string, unknown>) : null;
    console.log(`[Migration] Existing upload logs: ${countRow?.count ?? 0}`);
    
  } catch (error) {
    console.error('[Migration] ❌ Failed:', error);
    throw error;
  }
}

if (require.main === module) {
  addGmcFeedLogTable()
    .then(() => {
      console.log('\n✅ Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { addGmcFeedLogTable };
