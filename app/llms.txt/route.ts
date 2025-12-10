import { NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';
import { GET_ALL_COLLECTIONS, GET_RECENT_ARTICLES } from '@/lib/shopify/queries';

export const revalidate = 3600; // Revalidate every hour

interface Collection {
  handle: string;
  title: string;
}

interface Article {
  handle: string;
  title: string;
}

interface Product {
  handle: string;
  title: string;
}

export async function GET() {
  try {
    const siteUrl = 'https://theequestrian.com.au';

    // Fetch collections
    const collectionsResponse = await shopifyFetch<{
      collections: {
        edges: Array<{ node: Collection }>;
      };
    }>({
      query: GET_ALL_COLLECTIONS,
    });

    const collections = collectionsResponse.collections.edges.map(({ node }) => node);

    // Fetch recent articles
    const articlesResponse = await shopifyFetch<{
      blog: {
        articles: {
          edges: Array<{ node: Article }>;
        };
      } | null;
    }>({
      query: GET_RECENT_ARTICLES,
      variables: { blogHandle: 'news', first: 10 },
    });

    const articles = articlesResponse.blog?.articles.edges.map(({ node }) => node) || [];

    // Fetch products (lightweight query)
    const productsResponse = await shopifyFetch<{
      products: {
        edges: Array<{ node: Product }>;
      };
    }>({
      query: `
        query GetAllProductsLight {
          products(first: 250) {
            edges {
              node {
                handle
                title
              }
            }
          }
        }
      `,
    });

    const products = productsResponse.products.edges.map(({ node }) => node);

    // Generate llms.txt content
    let content = `# The Equestrian - ${siteUrl}\n\n`;
    content += `Australian-owned online saddlery and equestrian equipment store offering premium horse gear and rider equipment from world-leading brands.\n\n`;

    // Collections
    if (collections.length > 0) {
      content += `## Collections\n\n`;
      collections.forEach((collection) => {
        content += `- [${collection.title}](${siteUrl}/${collection.handle})\n`;
      });
      content += `\n`;
    }

    // Recent Articles
    if (articles.length > 0) {
      content += `## Recent Articles\n\n`;
      articles.forEach((article) => {
        content += `- [${article.title}](${siteUrl}/news/${article.handle})\n`;
      });
      content += `\n`;
    }

    // Products
    if (products.length > 0) {
      content += `## Products (${products.length} total)\n\n`;
      // Show first 50 products to keep file size reasonable
      products.slice(0, 50).forEach((product) => {
        content += `- [${product.title}](${siteUrl}/products/${product.handle})\n`;
      });
      if (products.length > 50) {
        content += `\n... and ${products.length - 50} more products\n`;
      }
      content += `\n`;
    }

    content += `## Contact\n\n`;
    content += `For more information, visit ${siteUrl}\n`;

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error generating llms.txt:', error);
    return new NextResponse('Error generating llms.txt', { status: 500 });
  }
}




