import { sql } from '@/lib/db/client';

type ChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: ChangeFrequency;
  priority: number;
}

export interface BuiltSitemapArtifacts {
  files: Array<{ path: string; body: string }>;
  counts: {
    static: number;
    categories: number;
    news: number;
    products: number;
    productFiles: number;
  };
}

const PRODUCTS_PER_FILE = Number(process.env.SITEMAP_PRODUCTS_PER_FILE || 5000);

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/+$/, '');
}

function nowIso(): string {
  return new Date().toISOString();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrlset(entries: SitemapUrlEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

function renderIndex(paths: string[]): string {
  const timestamp = nowIso();
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (p) => `  <sitemap>
    <loc>${escapeXml(`${siteUrl()}/${p}`)}</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;
}

function asIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value == null) return nowIso();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? nowIso() : parsed.toISOString();
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function buildStaticSitemaps(): Promise<BuiltSitemapArtifacts> {
  const base = siteUrl();

  const staticEntries: SitemapUrlEntry[] = [
    { loc: `${base}`, lastmod: nowIso(), changefreq: 'daily', priority: 1.0 },
    { loc: `${base}/about`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.5 },
    { loc: `${base}/contact`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.5 },
    { loc: `${base}/sizing`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.5 },
    { loc: `${base}/faq`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.5 },
    { loc: `${base}/privacy-policy`, lastmod: nowIso(), changefreq: 'yearly', priority: 0.3 },
    { loc: `${base}/terms-of-service`, lastmod: nowIso(), changefreq: 'yearly', priority: 0.3 },
    { loc: `${base}/returns-refunds`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.4 },
    { loc: `${base}/shipping-delivery`, lastmod: nowIso(), changefreq: 'monthly', priority: 0.4 },
    { loc: `${base}/on-sale`, lastmod: nowIso(), changefreq: 'daily', priority: 0.9 },
    { loc: `${base}/brands`, lastmod: nowIso(), changefreq: 'weekly', priority: 0.7 },
  ];

  const categoryRows = (await sql`
    SELECT url_path, updated_at
    FROM collection_content
    WHERE status = 'published'
    ORDER BY url_path
  `) as Array<{ url_path: string; updated_at: unknown }>;

  const categoryEntries: SitemapUrlEntry[] = categoryRows.map((r) => ({
    loc: `${base}${String(r.url_path).startsWith('/') ? r.url_path : `/${r.url_path}`}`,
    lastmod: asIsoDate(r.updated_at),
    changefreq: 'weekly',
    priority: 0.8,
  }));

  const newsRows = (await sql`
    SELECT slug, published_at, updated_at
    FROM public.article
    WHERE status IN ('published', 'publish')
    ORDER BY published_at DESC NULLS LAST, created_at DESC
  `) as Array<{ slug: string; published_at: unknown; updated_at: unknown }>;

  const newsEntries: SitemapUrlEntry[] = newsRows.map((r) => ({
    loc: `${base}/news/${r.slug}`,
    lastmod: asIsoDate(r.updated_at || r.published_at),
    changefreq: 'monthly',
    priority: 0.5,
  }));

  const productRows = (await sql`
    SELECT pca.canonical_path, COALESCE(p.updated_at, pca.updated_at, pca.created_at) AS updated_at
    FROM product_category_assignments pca
    LEFT JOIN products p
      ON p.id = pca.product_id
    WHERE pca.canonical_path IS NOT NULL
      AND pca.canonical_path <> ''
      AND pca.canonical_path NOT LIKE '/products/%'
    ORDER BY pca.canonical_path
  `) as Array<{ canonical_path: string; updated_at: unknown }>;

  const productEntries: SitemapUrlEntry[] = productRows.map((r) => ({
    loc: `${base}${String(r.canonical_path).startsWith('/') ? r.canonical_path : `/${r.canonical_path}`}`,
    lastmod: asIsoDate(r.updated_at),
    changefreq: 'weekly',
    priority: 0.6,
  }));

  const productChunks = chunk(productEntries, PRODUCTS_PER_FILE);

  const files: Array<{ path: string; body: string }> = [
    { path: 'sitemap/static.xml', body: renderUrlset(staticEntries) },
    { path: 'sitemap/categories.xml', body: renderUrlset(categoryEntries) },
    // Keep legacy child path alive for old Search Console submissions.
    { path: 'sitemap/collections.xml', body: renderUrlset(categoryEntries) },
    { path: 'sitemap/news.xml', body: renderUrlset(newsEntries) },
  ];

  const productChildPaths: string[] = [];
  productChunks.forEach((entries, idx) => {
    const rel = `sitemap/products-${idx}.xml`;
    productChildPaths.push(rel);
    files.push({ path: rel, body: renderUrlset(entries) });
  });

  const indexChildren = ['sitemap/static.xml', 'sitemap/categories.xml', ...productChildPaths, 'sitemap/news.xml'];
  files.push({ path: 'sitemap.xml', body: renderIndex(indexChildren) });

  return {
    files,
    counts: {
      static: staticEntries.length,
      categories: categoryEntries.length,
      news: newsEntries.length,
      products: productEntries.length,
      productFiles: productChildPaths.length,
    },
  };
}
