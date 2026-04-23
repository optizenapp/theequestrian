#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { Client } from 'pg';

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  return cs;
}

async function main() {
  const client = new Client({ connectionString: resolveConnectionString() });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS manual_redirects (
        id SERIAL PRIMARY KEY,
        from_path TEXT UNIQUE NOT NULL,
        to_path TEXT NOT NULL,
        redirect_type TEXT NOT NULL DEFAULT '301',
        source TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'active',
        conflict_target TEXT,
        last_checked TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{
      product_id: string;
      product_handle: string;
      canonical_path: string;
    }>(`
      SELECT product_id, product_handle, canonical_path
      FROM product_category_assignments
      WHERE category_path = '/accessories/collectibles'
      ORDER BY product_handle
    `);

    for (const row of rows) {
      const newCanonical = `/accessories/toys/${row.product_handle}`;
      await client.query(
        `
          UPDATE product_category_assignments
          SET canonical_path = $1,
              category_path = '/accessories/toys',
              top_level = 'accessories',
              parent_category = 'toys',
              subcategory_handle = NULL,
              updated_at = NOW()
          WHERE product_id = $2
        `,
        [newCanonical, row.product_id]
      );

      await client.query(
        `
          INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
          VALUES ($1, $2, '301', 'taxonomy-migration', 'active', NOW())
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'taxonomy-migration',
              status = 'active',
              updated_at = NOW()
        `,
        [row.canonical_path, newCanonical]
      );
    }

    await client.query(
      `
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES ('/accessories/collectibles', '/accessories/toys', '301', 'taxonomy-migration', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'taxonomy-migration',
            status = 'active',
            updated_at = NOW()
      `
    );

    await client.query('COMMIT');
    console.log(`Migrated ${rows.length} product allocations to /accessories/toys`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
