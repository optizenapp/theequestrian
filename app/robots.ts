import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.theequestrian.com.au';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products/', // Allow so Google can follow 301 redirects to new nested URLs
        ],
        disallow: [
          // ========================================
          // 1. LEGACY SHOPIFY STRUCTURE
          // ========================================
          // Block the entire /collections/ folder.
          // Your new structure is /horse/, /rider/, etc.
          '/collections/',

          // ========================================
          // 2. MULTI-TAG "+" COMBINATIONS ONLY
          // ========================================
          // Block: /anything+anything (e.g. /collections/footwear/top-boots+black)
          // This does NOT block single tags like /collections/footwear/black
          // because those have link juice worth preserving via redirects.
          '/*+*',
          '/*%2B*', // URL-encoded version of +

          // ========================================
          // 3. RSS / ATOM FEEDS
          // ========================================
          '/*.atom',
          '/*.rss',
          '/*.json', // Shopify JSON API endpoints

          // ========================================
          // 4. SHOPIFY APP JUNK
          // ========================================
          '/*globo*',
          '/*secomapp*',
          '/*toolbox*',

          // ========================================
          // 5. FACETED NAVIGATION / QUERY PARAMS
          // ========================================
          '/*?q=*',
          '/*?sort_by=*',
          '/*?filter*',
          '/*?variant=*',
          '/*?page=*',

          // ========================================
          // 6. TECHNICAL / NON-CONTENT PATHS
          // ========================================
          '/api/',
          '/_next/',
          '/preview',
          '/cart',
          '/checkout',
          '/account',
          '/search',
          '/404',
          '/500',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
