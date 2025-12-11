/**
 * Shopify Admin API Client
 * Uses native fetch for proper Next.js caching support
 * Admin API is typically not cached as it's used for mutations
 */

interface ShopifyAdminFetchOptions {
  query: string;
  variables?: Record<string, any>;
}

export async function shopifyAdminFetch<T>({
  query,
  variables = {},
}: ShopifyAdminFetchOptions): Promise<T> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain) {
    throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
  }
  if (!accessToken) {
    throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN environment variable is not set. Please add it to .env.local');
  }

  // Admin API endpoint (different from Storefront API)
  const endpoint = `https://${storeDomain}/admin/api/2025-01/graphql.json`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: 'no-store', // Admin API should never be cached
    });

    if (!response.ok) {
      throw new Error(`Shopify Admin API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors) {
      console.error('Shopify Admin GraphQL Errors:', json.errors);
      throw new Error(`GraphQL Error: ${json.errors[0]?.message || 'Unknown error'}`);
    }

    return json.data as T;
  } catch (error) {
    console.error('Shopify Admin API Error:', error);
    throw error;
  }
}



