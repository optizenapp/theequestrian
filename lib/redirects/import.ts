import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { sql } from '@vercel/postgres';

const REDIRECTS_DIR = path.join(process.cwd(), 'redirects');

interface RedirectRow {
  from: string;
  to: string;
}

const normalizePath = (value: string) => {
  if (!value) return '/';
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return `/${trimmed}`;
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1);
  return trimmed;
};

const readCsv = (filename: string) => {
  const filePath = path.join(REDIRECTS_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RedirectRow[];
  return records
    .filter((row) => row.from && row.to)
    .map((row) => ({
      from: normalizePath(row.from),
      to: normalizePath(row.to),
    }));
};

export async function importCsvRedirects() {
  const collections = readCsv('collections.csv');
  const blogs = readCsv('blogs.csv');
  const pages = readCsv('pages.csv');
  const all = [...collections, ...blogs, ...pages];

  let imported = 0;
  for (const redirect of all) {
    await sql`
      INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
      VALUES (${redirect.from}, ${redirect.to}, ${'301'}, ${'csv'}, ${'active'}, NOW())
      ON CONFLICT (from_path) DO UPDATE
      SET to_path = EXCLUDED.to_path,
          redirect_type = EXCLUDED.redirect_type,
          source = EXCLUDED.source,
          status = 'active',
          updated_at = NOW()
      WHERE manual_redirects.source = 'csv' OR manual_redirects.source IS NULL
    `;
    imported += 1;
  }

  return { imported, total: all.length };
}
