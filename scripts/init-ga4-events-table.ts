#!/usr/bin/env tsx
/**
 * Initialize GA4 events table
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
  console.log('🔧 Creating ga4_purchase_events table...\n');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ga4_purchase_events (
        id SERIAL PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL,
        order_number TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'AUD',
        items JSONB NOT NULL,
        sent_to_ga4 BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      )
    `;

    console.log('✅ Table created');

    await sql`CREATE INDEX IF NOT EXISTS idx_ga4_order_id ON ga4_purchase_events(order_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ga4_sent ON ga4_purchase_events(sent_to_ga4)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ga4_created ON ga4_purchase_events(created_at DESC)`;

    console.log('✅ Indexes created');
    console.log('\n✅ GA4 events table ready!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
