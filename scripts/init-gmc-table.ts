#!/usr/bin/env tsx
import { sql } from '../lib/db/client.js';

async function initGmcTable() {
  try {
    console.log('[GMC] Creating gmc_integration table...');
    
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
    
    console.log('[GMC] ✅ gmc_integration table created successfully');
  } catch (error) {
    console.error('[GMC] ❌ Failed to create table:', error);
    throw error;
  }
}

initGmcTable()
  .then(() => {
    console.log('[GMC] Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[GMC] Error:', error);
    process.exit(1);
  });
