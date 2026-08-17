#!/usr/bin/env tsx
/**
 * Import brand sizing from official URLs into brand_content.sizing_html.
 *
 * Dry-run by default: fetches pages, downloads chart images locally, writes a
 * preview CSV under exports/. Never writes Neon unless --apply is passed.
 *
 * Usage:
 *   npx tsx scripts/import-brand-sizing.ts
 *   npx tsx scripts/import-brand-sizing.ts --csv data/brand-sizing-sources.csv
 *   npx tsx scripts/import-brand-sizing.ts --floral-prod --apply
 *
 * Seed CSV columns: brand_handle, official_sizing_url, notes (optional)
 */

import { config } from 'dotenv';
import { resolve, join, extname, basename } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import * as cheerio from 'cheerio';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const FLORAL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}

function isSizingish(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('size') ||
    t.includes('sizing') ||
    t.includes('measurement') ||
    t.includes('cm') ||
    t.includes('inch') ||
    t.includes('fit guide') ||
    t.includes('how to measure')
  );
}

async function downloadImage(
  imageUrl: string,
  handle: string,
  pageUrl: string
): Promise<string | null> {
  try {
    const absolute = new URL(imageUrl, pageUrl).toString();
    const res = await fetch(absolute, {
      headers: { 'User-Agent': 'TheEquestrianSizingImport/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return null;
    const ct = res.headers.get('content-type') || '';
    let ext = extname(new URL(absolute).pathname).toLowerCase();
    if (!ext || ext.length > 5) {
      if (ct.includes('png')) ext = '.png';
      else if (ct.includes('webp')) ext = '.webp';
      else if (ct.includes('gif')) ext = '.gif';
      else ext = '.jpg';
    }
    const hash = createHash('sha1').update(absolute).digest('hex').slice(0, 10);
    const base = basename(new URL(absolute).pathname, ext)
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const filename = `${base || 'chart'}-${hash}${ext}`;
    const dir = join(process.cwd(), 'public', 'sizing', handle);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buf);
    return `/sizing/${handle}/${filename}`;
  } catch {
    return null;
  }
}

async function extractSizingHtml(
  pageUrl: string,
  handle: string
): Promise<{ html: string; imageCount: number; tableCount: number; error?: string }> {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'TheEquestrianSizingImport/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) {
    return {
      html: '',
      imageCount: 0,
      tableCount: 0,
      error: `HTTP ${res.status}`,
    };
  }
  const raw = await res.text();
  const $ = cheerio.load(raw);

  $('script, style, noscript, nav, footer, header, iframe').remove();

  const parts: string[] = [];
  let imageCount = 0;
  let tableCount = 0;

  $('table').each((_, el) => {
    const text = $(el).text();
    if (!isSizingish(text) && tableCount > 0) return;
    if (!isSizingish(text) && $('table').length > 3) return;
    tableCount += 1;
    parts.push(`<div class="sizing-table">${$.html(el)}</div>`);
  });

  const imgCandidates: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = ($(el).attr('alt') || '') + ' ' + ($(el).attr('title') || '');
    const nearby = $(el).parent().text() + alt;
    if (!src) return;
    if (isSizingish(nearby) || isSizingish(src) || imgCandidates.length < 2) {
      imgCandidates.push(src);
    }
  });

  const uniqueImgs = [...new Set(imgCandidates)].slice(0, 12);
  for (const src of uniqueImgs) {
    const local = await downloadImage(src, handle, pageUrl);
    if (!local) continue;
    imageCount += 1;
    parts.push(
      `<figure class="sizing-chart-image"><img src="${local}" alt="${handle} size chart" loading="lazy" /></figure>`
    );
  }

  if (parts.length === 0) {
    const main = $('main').text() || $('body').text();
    const snippet = main.replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (snippet && isSizingish(snippet)) {
      parts.push(`<p>${snippet}</p>`);
    }
  }

  const html = sanitizeHtml(
    [
      `<p class="text-sm text-gray-600">Imported from <a href="${pageUrl}" rel="noopener noreferrer" target="_blank">official sizing page</a>. Verify measurements before publishing.</p>`,
      ...parts,
    ].join('\n')
  );

  return { html, imageCount, tableCount };
}

async function main(): Promise<void> {
  if (hasFlag('--floral-prod')) {
    process.env.CUSTOM_DATABASE_URL = FLORAL;
    process.env.POSTGRES_URL = FLORAL;
    console.log('[floral-prod] Using production database\n');
  }

  const apply = hasFlag('--apply');
  const csvPath =
    argValue('--csv') || resolve(process.cwd(), 'data/brand-sizing-sources.csv');

  const csvText = await readFile(csvPath, 'utf8');
  const rows = parseCsv(csvText).filter((r) => r.brand_handle);

  console.log(`Loaded ${rows.length} rows from ${csvPath}`);
  console.log(apply ? 'Mode: APPLY (writes Neon)' : 'Mode: dry-run (preview only)\n');

  const { sql } = await import('@/lib/db/client');
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_html TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_source_url TEXT`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS sizing_updated_at TIMESTAMPTZ`;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const previewPath = resolve(process.cwd(), `exports/brand-sizing-preview-${stamp}.csv`);
  const previewLines = [
    'brand_handle,official_sizing_url,status,image_count,table_count,html_chars,notes,error',
  ];

  let applied = 0;
  let skipped = 0;

  for (const row of rows) {
    const handle = row.brand_handle.trim().toLowerCase();
    const url = (row.official_sizing_url || '').trim();
    const notes = row.notes || '';

    if (!url) {
      skipped += 1;
      previewLines.push(
        [handle, '', 'skipped_no_url', '0', '0', '0', csvEscape(notes), ''].join(',')
      );
      console.log(`- ${handle}: skipped (no URL)`);
      continue;
    }

    try {
      const extracted = await extractSizingHtml(url, handle);
      if (extracted.error) {
        previewLines.push(
          [
            handle,
            csvEscape(url),
            'fetch_error',
            '0',
            '0',
            '0',
            csvEscape(notes),
            csvEscape(extracted.error),
          ].join(',')
        );
        console.log(`- ${handle}: fetch error ${extracted.error}`);
        continue;
      }

      const htmlChars = extracted.html.length;
      previewLines.push(
        [
          handle,
          csvEscape(url),
          apply ? 'applied' : 'preview',
          String(extracted.imageCount),
          String(extracted.tableCount),
          String(htmlChars),
          csvEscape(notes),
          '',
        ].join(',')
      );

      const snippetPath = resolve(
        process.cwd(),
        `exports/brand-sizing-html-${handle}-${stamp}.html`
      );
      await writeFile(snippetPath, extracted.html, 'utf8');
      console.log(
        `- ${handle}: tables=${extracted.tableCount} images=${extracted.imageCount} html=${htmlChars} → ${snippetPath}`
      );

      if (apply) {
        const result = await sql`
          UPDATE brand_content
          SET
            sizing_html = ${extracted.html},
            sizing_source_url = ${url},
            sizing_updated_at = NOW(),
            updated_at = NOW()
          WHERE handle = ${handle}
          RETURNING handle
        `;
        const updated = Array.isArray(result) ? result.length : 0;
        if (updated === 0) {
          console.log(`  ! no brand_content row for ${handle} — create the brand hub first`);
        } else {
          applied += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      previewLines.push(
        [
          handle,
          csvEscape(url),
          'error',
          '0',
          '0',
          '0',
          csvEscape(notes),
          csvEscape(msg),
        ].join(',')
      );
      console.log(`- ${handle}: error ${msg}`);
    }
  }

  await mkdir(resolve(process.cwd(), 'exports'), { recursive: true });
  await writeFile(previewPath, previewLines.join('\n') + '\n', 'utf8');
  console.log(`\nPreview CSV: ${previewPath}`);
  if (apply) {
    console.log(`Applied sizing to ${applied} brand_content row(s). Skipped ${skipped}.`);
    const { invalidateBrandContentCache } = await import('@/lib/content/brand-content');
    invalidateBrandContentCache();
  } else {
    console.log(`Dry run complete. Skipped ${skipped} without URL. Pass --apply to write Neon.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
