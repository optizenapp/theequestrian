#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function initSeoEnrichmentTables() {
  try {
    console.log('Initializing SEO enrichment tables...');

    const schemaPath = path.join(process.cwd(), 'lib/db/schema/seo-enrichment.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await sql.query(schema);

    const tableResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'enrichment_queue',
          'enrichment_log',
          'serp_cache',
          'page_metrics_history',
          'internal_link_graph'
        )
      ORDER BY table_name
    `;

    console.log('Tables ready:');
    for (const row of tableResult.rows) {
      console.log(` - ${row.table_name}`);
    }

    console.log('SEO enrichment schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize SEO enrichment schema:', error);
    process.exit(1);
  }
}

initSeoEnrichmentTables();

