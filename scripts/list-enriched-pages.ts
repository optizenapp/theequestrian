#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const result = await sql.query(`
    SELECT
      page_type,
      page_identifier,
      canonical_path,
      COUNT(*) AS enrichment_count,
      MAX(created_at) AS last_enriched_at,
      ROUND(AVG(COALESCE((after_scores->'korayCompliance'->>'score')::numeric, 0)), 1) AS avg_koray_score,
      ROUND(SUM(COALESCE(total_cost_usd, 0))::numeric, 4) AS total_cost_usd
    FROM enrichment_log
    WHERE applied = TRUE
    GROUP BY page_type, page_identifier, canonical_path
    ORDER BY last_enriched_at DESC
  `);

  const rows = result.rows;

  if (rows.length === 0) {
    console.log('No pages have been enriched yet (applied = TRUE).');
    return;
  }

  console.log(`\nTotal enriched pages: ${rows.length}\n`);
  console.log(
    'page_type'.padEnd(14) +
    'canonical_path'.padEnd(60) +
    'runs'.padEnd(6) +
    'koray'.padEnd(8) +
    'cost'.padEnd(10) +
    'last enriched'
  );
  console.log('-'.repeat(120));

  for (const row of rows) {
    const path = (row.canonical_path || row.page_identifier || '').slice(0, 58);
    console.log(
      String(row.page_type).padEnd(14) +
      path.padEnd(60) +
      String(row.enrichment_count).padEnd(6) +
      String(row.avg_koray_score ?? 'n/a').padEnd(8) +
      `$${row.total_cost_usd}`.padEnd(10) +
      String(row.last_enriched_at).slice(0, 19)
    );
  }

  // Summary by type
  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.page_type] = (acc[r.page_type] || 0) + 1;
    return acc;
  }, {});
  console.log('\nSummary by type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count} pages`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
