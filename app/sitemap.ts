import { MetadataRoute } from 'next';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

const SITE_URL = getCanonicalSiteUrl();

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
      url: `${SITE_URL}/sitemap/categories.xml`,
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
