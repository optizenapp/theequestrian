import { MetadataRoute } from 'next';
import { shopifyFetch } from '@/lib/shopify/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';

const GET_ALL_BLOG_POSTS = `
  query GetAllBlogPosts($first: Int!, $after: String) {
    articles(first: $first, after: $after) {
      edges {
        node {
          handle
          publishedAt
          blog {
            handle
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface Article {
  handle: string;
  publishedAt: string;
  blog: {
    handle: string;
  };
}

/**
 * News/Blog Sitemap
 * 
 * Contains all blog posts and news articles
 */
export async function GET() {
  const articles: Article[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const data: {
      articles: {
        edges: Array<{ node: Article }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    } = await shopifyFetch({
      query: GET_ALL_BLOG_POSTS,
      variables: { first: 250, after: cursor },
    });

    articles.push(...data.articles.edges.map(({ node }) => node));
    hasNextPage = data.articles.pageInfo.hasNextPage;
    cursor = data.articles.pageInfo.endCursor;
  }

  const sitemap: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/news/${article.handle}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap
  .map(
    (item) => {
      const lastMod = item.lastModified instanceof Date 
        ? item.lastModified.toISOString() 
        : item.lastModified 
          ? new Date(item.lastModified).toISOString() 
          : new Date().toISOString();
      
      return `  <url>
    <loc>${item.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    }
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
