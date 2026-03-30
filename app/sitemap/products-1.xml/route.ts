import { getCachedProductsSitemap } from '@/lib/sitemap/products';

/**
 * Products Sitemap - Batch 1
 * Contains products 2,000-3,999
 */
export const maxDuration = 120;

export async function GET() {
  const xml = await getCachedProductsSitemap(1);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
