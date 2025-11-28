import { GraphQLClient } from 'graphql-request';

let shopifyClient: GraphQLClient | null = null;

function getShopifyClient(): GraphQLClient {
  if (!shopifyClient) {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!storeDomain) {
      throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
    }
    if (!accessToken) {
      throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable is not set');
    }

    const endpoint = `https://${storeDomain}/api/2024-10/graphql.json`;
    shopifyClient = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Storefront-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }
  return shopifyClient;
}

/**
 * Shopify Storefront API Client
 * Handles all GraphQL queries to Shopify
 */

interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, any>;
  cache?: RequestCache;
}

export async function shopifyFetch<T>({
  query,
  variables = {},
  cache = 'force-cache',
}: ShopifyFetchOptions): Promise<T> {
  const client = getShopifyClient();
  
  try {
    const data = await client.request<T>(query, variables);
    return data;
  } catch (error) {
    console.error('Shopify API Error:', error);
    throw error;
  }
}
