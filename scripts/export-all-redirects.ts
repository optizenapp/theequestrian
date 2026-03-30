/**
 * Unified redirect export: repo CSVs + Neon manual_redirects → single CSV.
 *
 * Usage: npx tsx scripts/export-all-redirects.ts
 *    or: npm run export:redirects
 *
 * Output: exports/all-redirects-YYYY-MM-DDTHH-mm-ss.csv
 *
 * Does not include: Shopify Admin URL redirects, dynamic PDP canonical redirects,
 * empty-category redirects, or implicit /blogs / /pages targets (only documented as rows).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@/lib/db/client';

const REDIRECTS_DIR = path.join(process.cwd(), 'redirects');
const EXPORTS_DIR = path.join(process.cwd(), 'exports');

interface CsvRedirectRow {
  from: string;
  to: string;
}

export interface ExportRedirectRow {
  from_path: string;
  to_path: string;
  redirect_type: string;
  origin: string;
  source: string;
  status: string;
  notes: string;
}

function normalizePath(p: string): string {
  let s = (p || '').trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function parseRedirectFile(filename: string, origin: string): ExportRedirectRow[] {
  const filePath = path.join(REDIRECTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[export-redirects] Missing ${filename}, skipping`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRedirectRow[];

  const out: ExportRedirectRow[] = [];
  for (const row of records) {
    if (!row.from || !row.to) continue;
    out.push({
      from_path: normalizePath(row.from),
      to_path: normalizePath(row.to),
      redirect_type: '301',
      origin,
      source: '',
      status: '',
      notes: '',
    });
  }
  return out;
}

async function fetchManualRedirects(): Promise<ExportRedirectRow[]> {
  try {
    const rows = await sql`
      SELECT from_path, to_path, redirect_type, source, status
      FROM manual_redirects
      WHERE status IN ('active', 'override')
      ORDER BY from_path ASC
    `;
    const list = Array.isArray(rows) ? rows : [];
    return list.map((r: Record<string, unknown>) => ({
      from_path: normalizePath(String(r.from_path ?? '')),
      to_path: normalizePath(String(r.to_path ?? '')),
      redirect_type: String(r.redirect_type ?? '301'),
      origin: 'manual_redirects',
      source: String(r.source ?? ''),
      status: String(r.status ?? ''),
      notes: '',
    }));
  } catch (e) {
    console.warn('[export-redirects] Could not load manual_redirects (table missing or DB error):', e);
    return [];
  }
}

function documentedRules(): ExportRedirectRow[] {
  return [
    {
      from_path: '/blogs/{path}',
      to_path: '/{path}',
      redirect_type: '301',
      origin: 'documented_rule',
      source: '',
      status: '',
      notes:
        'Middleware fallback when URL is not listed in blogs_csv: strip /blogs prefix (see middleware.ts)',
    },
    {
      from_path: '/pages/{path}',
      to_path: '/{path}',
      redirect_type: '301',
      origin: 'documented_rule',
      source: '',
      status: '',
      notes:
        'Middleware fallback when URL is not listed in pages_csv: strip /pages prefix (see middleware.ts)',
    },
    {
      from_path: '/cart/c/{cartId}',
      to_path: '/cart',
      redirect_type: '301',
      origin: 'documented_rule',
      source: '',
      status: '',
      notes: 'Legacy Shopify cart share permalinks (middleware.ts)',
    },
  ];
}

async function main() {
  const collections = parseRedirectFile('collections.csv', 'collections_csv');
  const blogs = parseRedirectFile('blogs.csv', 'blogs_csv');
  const pages = parseRedirectFile('pages.csv', 'pages_csv');
  const manual = await fetchManualRedirects();
  const rules = documentedRules();

  const all = [...collections, ...blogs, ...pages, ...manual, ...rules];

  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(EXPORTS_DIR, `all-redirects-${stamp}.csv`);

  const csv = stringify(all, {
    header: true,
    columns: ['from_path', 'to_path', 'redirect_type', 'origin', 'source', 'status', 'notes'],
  });
  fs.writeFileSync(outPath, csv, 'utf-8');

  console.log(`[export-redirects] Wrote ${all.length} rows (${collections.length} collections, ${blogs.length} blogs, ${pages.length} pages, ${manual.length} manual, ${rules.length} documented rules)`);
  console.log(`[export-redirects] ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
