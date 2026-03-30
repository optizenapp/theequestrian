import { MetadataRoute } from 'next';
import { sql } from '@/lib/db/client';

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

function emptyUrlsetResponse() {
  const body =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

/**
 * Category sitemap — URLs from Postgres `collection_content` (published rows only).
 */
export async function GET() {
  let rows: Array<{ url_path: string; updated_at: unknown }> = [];
  try {
    const result = await sql`
      SELECT url_path, updated_at
      FROM collection_content
      WHERE status = 'published'
      ORDER BY url_path
    `;
    rows = (Array.isArray(result) ? result : []) as Array<{ url_path: string; updated_at: unknown }>;
  } catch (e) {
    console.error('[sitemap/categories] DB read failed:', e);
    return emptyUrlsetResponse();
  }

  if (rows.length === 0) {
    console.warn('[sitemap/categories] No published rows in collection_content');
    return emptyUrlsetResponse();
  }

  const sitemap: MetadataRoute.Sitemap = rows.map((row) => {
    const path = String(row.url_path || '').trim();
    const url = path.startsWith('/') ? `${SITE_URL}${path}` : `${SITE_URL}/${path}`;
    const upd = row.updated_at;
    const lastModified =
      upd instanceof Date ? upd : upd != null ? new Date(String(upd)) : new Date();

    return {
      url,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

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

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

export const maxDuration = 30;
