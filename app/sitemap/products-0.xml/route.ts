import { generateProductsSitemap } from '@/lib/sitemap/products';

/**
 * Products Sitemap - Batch 0
 * Contains products 0-1,999
 */
export async function GET() {
  const xml = await generateProductsSitemap(0);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
