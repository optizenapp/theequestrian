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
          '/collections/', // Allow so Google can follow 301 redirects from old collection URLs
        ],
        disallow: [
          // ========================================
          // 1. TECHNICAL & SECURITY
          // ========================================
          '/api/', // Block all API endpoints (except explicit allows above)
          '/_next/',
          '/preview',
          '/admin',

          // ========================================
          // 2. SHOPIFY / CHECKOUT
          // ========================================
          '/account',
          '/cart',
          '/checkout',
          '/orders',
          '/404',
          '/500',

          // ========================================
          // 3. LEGACY SHOPIFY STRUCTURE (DUPLICATE CONTENT)
          // ========================================
          '/pages/', // Block Shopify /pages/ if migrated to root paths
          '/blogs/*/tagged/*', // Block blog tag archives (duplicate content)

          // ========================================
          // 4. MULTI-TAG "+" COMBINATIONS
          // ========================================
          // Blocks: /collections/footwear/top-boots+black
          // Does NOT block single tags (those have link juice → handled by redirects)
          '/*+*',
          '/*%2B*', // URL-encoded version of +

          // ========================================
          // 5. RSS / ATOM / JSON FEEDS
          // ========================================
          '/*.atom',
          '/*.rss',
          '/*.json', // Shopify JSON API endpoints

          // ========================================
          // 6. SHOPIFY APP JUNK
          // ========================================
          '/*globo*',
          '/*secomapp*',
          '/*toolbox*',

          // ========================================
          // 7. SEARCH & INTERNAL QUERIES
          // ========================================
          '/search',
          '/*?q=*',

          // ========================================
          // 8. FACETED NAVIGATION (CRUCIAL)
          // ========================================
          // Based on: /horse?size=1+Litre&price=193-860
          // Each filter param blocked individually so combinations are caught
          '/*?*size=*',
          '/*?*price=*',
          '/*?*color=*',
          '/*?*colour=*',
          '/*?*brand=*',
          '/*?*sort=*',
          '/*?*sort_by=*',
          '/*?*limit=*',
          '/*?*variant=*',
          '/*?*page=*',
          '/*?filter*',

          // ========================================
          // 9. TRACKING & ANALYTICS PARAMS
          // ========================================
          '/*?*utm_*', // UTM campaign params (utm_source, utm_medium, etc.)
          '/*?*ref=*', // Referral tracking
          '/*?*fbclid=*', // Facebook click ID
          '/*?*gclid=*', // Google click ID
          '/*?*mc_*', // Mailchimp params
          '/*?*_ga=*', // Google Analytics client ID
          '/*?*_ke=*', // Klaviyo tracking

          // ========================================
          // 10. SHOPIFY INTERNAL PARAMS
          // ========================================
          '/*?*_pos=*', // Shopify POS params
          '/*?*_psq=*', // Shopify search query
          '/*?*_ss=*', // Shopify session
          '/*?*_v=*', // Shopify version
          '/*?*discount=*', // Discount codes

          // ========================================
          // 11. PRINT & SHARE VARIATIONS
          // ========================================
          '/*/print',
          '/*?print=*',
          '/*?share=*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
