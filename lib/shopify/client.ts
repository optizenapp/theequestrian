/**
 * Shopify Storefront API Client
 * Uses native fetch for proper Next.js caching support
 */

interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, any>;
  cache?: RequestCache;
  tags?: string[]; // For Next.js cache tagging
}

export async function shopifyFetch<T>({
  query,
  variables = {},
  cache = 'force-cache',
  tags = [],
}: ShopifyFetchOptions): Promise<T> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!storeDomain) {
    throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
  }
  if (!accessToken) {
    throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable is not set');
  }

  const endpoint = `https://${storeDomain}/api/2024-10/graphql.json`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache, // This now actually works with Next.js caching!
      next: {
        revalidate: cache === 'force-cache' ? 900 : undefined, // 15 minutes
        tags: tags.length > 0 ? tags : undefined,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error('Shopify GraphQL Errors:', json.errors);
      throw new Error(`GraphQL Error: ${json.errors[0]?.message || 'Unknown error'}`);
    }

    return json.data as T;
  } catch (error) {
    console.error('Shopify API Error:', error);
    throw error;
  }
}
