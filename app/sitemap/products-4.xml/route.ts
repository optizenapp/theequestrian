import { getCachedProductsSitemap } from '@/lib/sitemap/products';

/**
 * Products Sitemap - Batch 4
 * Contains products 8,000-9,999
 */
export const maxDuration = 60;

export async function GET() {
  const xml = await getCachedProductsSitemap(4);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
