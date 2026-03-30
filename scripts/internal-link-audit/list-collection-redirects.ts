/**
 * List collection redirect rows from redirects/collections.csv for cross-checking SF output.
 *
 *   npx tsx scripts/internal-link-audit/list-collection-redirects.ts
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.join(process.cwd(), 'redirects', 'collections.csv');

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('Missing', csvPath);
    process.exit(1);
  }
  const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ from?: string; to?: string }>;
  const rows = records.filter((r) => r.from && r.to);
  console.log(`Collection redirects: ${rows.length}`);
  console.log('Sample (first 15):');
  for (const r of rows.slice(0, 15)) {
    const from = r.from!.startsWith('/') ? r.from : `/${r.from}`;
    const to = r.to!.startsWith('/') ? r.to : `/${r.to}`;
    console.log(`  ${from} → ${to}`);
  }
}

main();
