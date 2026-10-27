/**
 * Read-only audit of variant option values that the filter normaliser excludes,
 * rewrites or ignores. Output is for supplier data correction; nothing is written
 * to Shopify or Neon.
 *
 * Run: npm run audit:filter-options
 * Output: exports/filter-option-audit-<timestamp>.csv
 */

import { writeFileSync } from 'node:fs';
import { sql } from '@/lib/db/client';
import { classifyOptionName } from '@/lib/filters/option-classify';
import { colourExclusionReason, colourLabel } from '@/lib/filters/colour-normalize';
import { looseSizeKey, sizeKey } from '@/lib/filters/size-normalize';

type Row = { option_name: string; option_value: string; products: number };
type Finding = Row & { issue: string; detail: string };

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const rows = (await sql`
    SELECT TRIM(option_name) AS option_name, TRIM(option_value) AS option_value,
           COUNT(DISTINCT product_id)::int AS products
    FROM variant_options
    GROUP BY 1, 2
  `) as unknown as Row[];

  const findings: Finding[] = [];
  const sizeGroups = new Map<string, Row[]>();
  const unclassified = new Map<string, number>();

  for (const row of rows) {
    const type = classifyOptionName(row.option_name);
    if (type === 'colour') {
      const reason = colourExclusionReason(row.option_value);
      if (reason) {
        findings.push({ ...row, issue: `excluded_from_colour:${reason}`, detail: '' });
      } else if (colourLabel(row.option_value) !== row.option_value) {
        findings.push({ ...row, issue: 'colour_display_rewritten', detail: colourLabel(row.option_value) });
      }
    } else if (type === 'size') {
      if (sizeKey(row.option_value) === null) {
        findings.push({ ...row, issue: 'excluded_from_size:looks_like_colour', detail: '' });
      } else {
        const key = looseSizeKey(row.option_value);
        sizeGroups.set(key, [...(sizeGroups.get(key) ?? []), row]);
      }
    } else if (type === null && row.option_name.toLowerCase() !== 'title') {
      unclassified.set(row.option_name, (unclassified.get(row.option_name) ?? 0) + row.products);
    }
  }

  for (const [key, group] of sizeGroups) {
    if (group.length < 2) continue;
    for (const row of group) findings.push({ ...row, issue: 'size_spelling_merged', detail: key });
  }
  for (const [name, products] of unclassified) {
    findings.push({ option_name: name, option_value: '', products, issue: 'option_name_not_in_colour_or_size', detail: '' });
  }

  findings.sort((a, b) => a.issue.localeCompare(b.issue) || b.products - a.products);
  const header = 'issue,option_name,option_value,products,detail';
  const lines = findings.map((f) =>
    [f.issue, f.option_name, f.option_value, f.products, f.detail].map(csvCell).join(',')
  );
  const file = `exports/filter-option-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  writeFileSync(file, [header, ...lines].join('\n'));

  const summary = new Map<string, number>();
  for (const f of findings) {
    const issue = f.issue.split(':')[0];
    summary.set(issue, (summary.get(issue) ?? 0) + 1);
  }
  console.log(`Wrote ${findings.length} findings to ${file}`);
  for (const [issue, count] of summary) console.log(`  ${issue}: ${count}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[audit-filter-option-values] failed:', error);
    process.exit(1);
  });
