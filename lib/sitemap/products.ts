import { MetadataRoute } from 'next';
import { shopifyFetch } from '@/lib/shopify/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';

const GET_PRODUCTS_BATCH = `
  query GetProductsBatch($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          handle
          updatedAt
          metafield(namespace: "custom", key: "primary_collection") {
            value
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

interface Product {
  handle: string;
  updatedAt: string;
  metafield: {
    value: string;
  } | null;
}

/**
 * Generate products sitemap for a specific batch
 * 
 * @param batchNumber - Batch number (0-4)
 * @param productsPerBatch - Number of products per batch (default: 2000)
 */
export async function generateProductsSitemap(
  batchNumber: number,
  productsPerBatch: number = 2000
): Promise<string> {
  // Fetch all products (we need to paginate through to get to the right batch)
  const products: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let fetchedCount = 0;
  const startIndex = batchNumber * productsPerBatch;
  const endIndex = startIndex + productsPerBatch;

  while (hasNextPage && fetchedCount < endIndex) {
    const data: {
      products: {
        edges: Array<{ node: Product }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    } = await shopifyFetch({
      query: GET_PRODUCTS_BATCH,
      variables: { first: 250, after: cursor },
    });

    const batchProducts = data.products.edges.map(({ node }) => node);
    
    // Only keep products in our batch range
    batchProducts.forEach((product, index) => {
      const globalIndex = fetchedCount + index;
      if (globalIndex >= startIndex && globalIndex < endIndex) {
        products.push(product);
      }
    });

    fetchedCount += batchProducts.length;
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;

    // Stop if we've collected enough for this batch
    if (products.length >= productsPerBatch) {
      break;
    }
  }

  // If no products in this batch, return empty sitemap
  if (products.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  }

  const sitemap: MetadataRoute.Sitemap = products.map((product) => {
    const primaryCollection = product.metafield?.value;
    const url = primaryCollection
      ? `${SITE_URL}/${primaryCollection}/${product.handle}`
      : `${SITE_URL}/products/${product.handle}`;

    return {
      url,
      lastModified: new Date(product.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    };
  });

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

  return xml;
}
