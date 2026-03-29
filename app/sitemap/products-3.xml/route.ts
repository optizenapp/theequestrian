import { getCachedProductsSitemap } from '@/lib/sitemap/products';

/**
 * Products Sitemap - Batch 3
 * Contains products 6,000-7,999
 */
export const maxDuration = 120;

export async function GET() {
  const xml = await getCachedProductsSitemap(3);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
