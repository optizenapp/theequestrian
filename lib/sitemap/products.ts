import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db/client';
import { getProductCanonicalUrls } from '@/lib/shopify/products';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au'
).replace(/\/$/, '');

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type ProductRow = {
  id: string;
  handle: string;
  product_type: string | null;
  updated_at: Date | string | null;
};

/**
 * Product sitemap batch — Neon `products` + `getProductCanonicalUrls`.
 * Only lists category-style URLs; legacy `/products/{handle}` is omitted (fix allocations/mapping to include).
 */
export async function generateProductsSitemap(
  batchNumber: number,
  productsPerBatch: number = 2000
): Promise<string> {
  const offset = batchNumber * productsPerBatch;
  const limit = productsPerBatch;

  let rows: ProductRow[] = [];
  try {
    const result = await sql`
      SELECT id, handle, product_type, updated_at
      FROM products
      ORDER BY id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    rows = (Array.isArray(result) ? result : []) as ProductRow[];
  } catch (e) {
    console.error('[sitemap/products] DB read failed:', e);
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  }

  if (rows.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  }

  const forCanonical = rows.map((r) => ({
    id: String(r.id),
    handle: String(r.handle),
    productType: String(r.product_type || ''),
  }));

  const pathById = await getProductCanonicalUrls(forCanonical);

  const sitemap: MetadataRoute.Sitemap = [];
  let skippedLegacy = 0;

  for (const r of rows) {
    const id = String(r.id);
    const path = pathById.get(id);
    if (!path || path.startsWith('/products/')) {
      skippedLegacy += 1;
      continue;
    }
    const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const raw = r.updated_at;
    const lastModified =
      raw instanceof Date ? raw : raw != null ? new Date(String(raw)) : new Date();

    sitemap.push({
      url,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  if (skippedLegacy > 0) {
    console.warn(
      `[sitemap/products] batch ${batchNumber}: omitted ${skippedLegacy} product(s) still on legacy /products/ path`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap
  .map((item) => {
    const lastMod =
      item.lastModified instanceof Date
        ? item.lastModified.toISOString()
        : item.lastModified
          ? new Date(item.lastModified).toISOString()
          : new Date().toISOString();

    return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return xml;
}

const CACHED_BATCHES = [0, 1, 2, 3, 4].map((batch) =>
  unstable_cache(
    async () => generateProductsSitemap(batch),
    ['products-sitemap-neon-v2', String(batch)],
    { revalidate: 3600 }
  )
);

/** Cached 1h per batch — avoids regenerating URLs on every Googlebot hit. */
export async function getCachedProductsSitemap(batchNumber: number): Promise<string> {
  const runner = CACHED_BATCHES[batchNumber];
  if (!runner) {
    throw new Error(`Invalid product sitemap batch: ${batchNumber}`);
  }
  return runner();
}
