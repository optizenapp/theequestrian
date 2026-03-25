/**
 * Normalise Screaming Frog CSV rows that list redirecting internal URLs.
 *
 * Usage:
 *   npx tsx scripts/internal-link-audit/normalize-sf-internal-redirects.ts path/to/export.csv
 *
 * Flexible column detection (case-insensitive):
 * - URL column: "address", "url", "uri"
 * - Inlinks: "inlinks", "no. of internal inlinks"
 *
 * Prints TSV: path\tinlink_count (aggregated) sorted by count desc.
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

function findColumn(header: string[], ...candidates: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function normalisePath(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  try {
    const u = s.startsWith('http') ? new URL(s) : new URL(s, 'https://example.com');
    let p = u.pathname || '/';
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p.toLowerCase();
  } catch {
    let p = s.startsWith('/') ? s : `/${s}`;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p.toLowerCase();
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx tsx scripts/internal-link-audit/normalize-sf-internal-redirects.ts <csv>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  const content = fs.readFileSync(abs, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];
  if (rows.length === 0) {
    console.log('No rows');
    return;
  }
  const header = Object.keys(rows[0]);
  const urlIdx = findColumn(header, 'address', 'url', 'uri', 'from');
  const inlinkIdx = findColumn(header, 'inlinks', 'no. of internal inlinks', 'internal inlinks');
  if (urlIdx < 0) {
    console.error('Could not find URL column. Headers:', header.join(', '));
    process.exit(1);
  }
  const urlKey = header[urlIdx];
  const inlinkKey = inlinkIdx >= 0 ? header[inlinkIdx] : null;

  const counts = new Map<string, number>();
  for (const row of rows) {
    const p = normalisePath(row[urlKey] || '');
    if (!p) continue;
    const n = inlinkKey ? parseInt(String(row[inlinkKey]).replace(/,/g, ''), 10) || 0 : 1;
    counts.set(p, (counts.get(p) ?? 0) + n);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('path\tinternal_inlink_count');
  for (const [p, c] of sorted) {
    console.log(`${p}\t${c}`);
  }
}

main();
