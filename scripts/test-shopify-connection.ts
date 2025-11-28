/**
 * Test Shopify API Connection
 * 
 * Run with: npx tsx scripts/test-shopify-connection.ts
 */

import { config } from 'dotenv';
import { GraphQLClient } from 'graphql-request';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure .env.local has:');
  console.error('  - SHOPIFY_STORE_DOMAIN');
  console.error('  - SHOPIFY_STOREFRONT_ACCESS_TOKEN');
  process.exit(1);
}

const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`;

const client = new GraphQLClient(endpoint, {
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
});

// Test 1: Fetch shop info
const SHOP_QUERY = `
  query {
    shop {
      name
      description
      primaryDomain {
        url
      }
    }
  }
`;

// Test 2: Fetch collections
const COLLECTIONS_QUERY = `
  query {
    collections(first: 5) {
      edges {
        node {
          id
          handle
          title
          description
        }
      }
    }
  }
`;

// Test 3: Fetch products
const PRODUCTS_QUERY = `
  query {
    products(first: 5) {
      edges {
        node {
          id
          handle
          title
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
