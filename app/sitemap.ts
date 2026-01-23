import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';

/**
 * Sitemap Index
 * 
 * This is the main sitemap that points to all sub-sitemaps.
 * With ~10,000 products, we split into multiple sitemaps for better performance.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/sitemap/static.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/collections.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/products-0.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/products-1.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/products-2.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/products-3.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/products-4.xml`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/sitemap/news.xml`,
      lastModified: new Date(),
    },
  ];
}
