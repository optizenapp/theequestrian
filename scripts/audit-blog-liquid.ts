/**
 * Lists Neon `article` rows whose HTML still looks like Liquid/theme output or legacy shop URLs.
 * Run: npx tsx scripts/audit-blog-liquid.ts
 */
import 'dotenv/config';
import { sql } from '@/lib/db/client';

const SPLIT_BLOCK_REGEX = /={3}\s*split content\s*={3}([\s\S]*?)={3}\s*split content\s*={3}/gi;

function hasLiquidSignal(html: string): boolean {
  if (!html) return false;
  return (
    /\{%/.test(html) ||
    /\{\{-?/.test(html) ||
    /liquid error/i.test(html) ||
    /font_url/i.test(html)
  );
}

function legacyShopHrefSamples(html: string, maxSamples: number): string[] {
  const samples: string[] = [];
  const seen = new Set<string>();
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const h = m[1];
    if (
      /\/products\//i.test(h) ||
      /\/collections\//i.test(h) ||
      /myshopify\.com/i.test(h) ||
      /theequestrian\.com\.au\/(products|collections)\//i.test(h)
    ) {
      const clip = h.length > 140 ? `${h.slice(0, 137)}...` : h;
      if (!seen.has(clip)) {
        seen.add(clip);
        samples.push(clip);
        if (samples.length >= maxSamples) break;
      }
    }
  }
  return samples;
}

function extractSplitHandles(html: string): string[] {
  if (!html) return [];
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = SPLIT_BLOCK_REGEX.exec(html))) {
    const inside = m[1] || '';
    inside
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((h) => found.push(h));
  }
  return [...new Set(found)];
}

async function main() {
  const rows = await sql`
    SELECT slug, title, content, status
    FROM article
    WHERE status IN ('published', 'publish', 'draft')
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 500
  `;
  const list = Array.isArray(rows) ? rows : [];

  const liquidRows: { slug: string; title: string }[] = [];
  const linkReport: Array<{ slug: string; title: string; samples: string[] }> = [];
  const splitRows: Array<{ slug: string; title: string; handles: string[] }> = [];

  for (const raw of list) {
    const row = raw as { slug: unknown; title: unknown; content: unknown };
    const slug = String(row.slug ?? '');
    const title = String(row.title ?? '');
    const content = String(row.content ?? '');
    if (hasLiquidSignal(content)) {
      liquidRows.push({ slug, title });
    }
    const samples = legacyShopHrefSamples(content, 6);
    if (samples.length > 0) {
      linkReport.push({ slug, title, samples });
    }
    const handles = extractSplitHandles(content);
    if (handles.length > 0) {
      splitRows.push({ slug, title, handles });
    }
  }

  console.log('=== Articles with Liquid / theme leakage ===\n');
  console.log(
    liquidRows.length
      ? liquidRows.map((r) => `${r.slug}\t${r.title}`).join('\n')
      : '(none detected)'
  );
  console.log(
    '\n=== Articles with /products/, /collections/, or myshopify links in HTML ===\n'
  );
  console.log(
    '(Runtime rewriter fixes many on render; use this to prioritise content cleanup.)\n'
  );
  for (const row of linkReport) {
    console.log(`${row.slug}\t${row.title}`);
    for (const s of row.samples) {
      console.log(`  ${s}`);
    }
    console.log('');
  }

  console.log('\n=== Articles with legacy "=== split content ===" markers ===\n');
  console.log(
    '(These markers are now parsed at runtime, but should be migrated into headless_related_handles.)\n'
  );
  if (splitRows.length === 0) {
    console.log('(none detected)');
    return;
  }
  for (const row of splitRows) {
    console.log(`${row.slug}\t${row.title}`);
    console.log(`  handles: ${row.handles.join(', ')}`);
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
