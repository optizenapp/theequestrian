import { GraphQLClient } from 'graphql-request';

let adminClient: GraphQLClient | null = null;

function getShopifyAdminClient(): GraphQLClient {
  if (!adminClient) {
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
    adminClient = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }
  return adminClient;
}

/**
 * Shopify Admin API Client
 * Handles GraphQL mutations for product updates
 */

interface ShopifyAdminFetchOptions {
  query: string;
  variables?: Record<string, any>;
}

export async function shopifyAdminFetch<T>({
  query,
  variables = {},
}: ShopifyAdminFetchOptions): Promise<T> {
  const client = getShopifyAdminClient();
  
  try {
    const data = await client.request<T>(query, variables);
    return data;
  } catch (error) {
    console.error('Shopify Admin API Error:', error);
    throw error;
  }
}

