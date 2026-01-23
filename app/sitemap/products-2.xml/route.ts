import { generateProductsSitemap } from '@/lib/sitemap/products';

/**
 * Products Sitemap - Batch 2
 * Contains products 4,000-5,999
 */
export async function GET() {
  const xml = await generateProductsSitemap(2);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
