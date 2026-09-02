#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@/lib/db/vercel-postgres';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.split('=').slice(1).join('=') : undefined;
}

async function main() {
  if (process.argv.includes('--floral-prod')) {
    process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
    process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  }

  const handle = getArg('--handle');
  const logId = getArg('--log-id');

  const result = logId
    ? await sql.query(
        `SELECT id, page_identifier, applied, after_content, after_scores, enrichment_reasoning, created_at
         FROM enrichment_log WHERE id = $1`,
        [logId]
      )
    : await sql.query(
        `SELECT id, page_identifier, applied, after_content, after_scores, enrichment_reasoning, created_at
         FROM enrichment_log
         WHERE page_identifier = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [handle]
      );

  const row = result.rows[0];
  if (!row) {
    console.error('No enrichment log found');
    process.exit(1);
  }

  console.log(JSON.stringify(row, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
