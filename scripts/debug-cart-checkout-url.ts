#!/usr/bin/env tsx
/**
 * Debug what checkoutUrl Shopify is actually returning
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { GraphQLClient } from 'graphql-request';

const SHOPIFY_STORE = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.error('Missing Shopify credentials');
  process.exit(1);
}

const client = new GraphQLClient(`https://${SHOPIFY_STORE}/api/2023-10/graphql.json`, {
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
  },
});

async function debugCart() {
  console.log('🔍 Creating a test cart and checking the checkoutUrl...\n');

  // Create a cart with a product
  const createMutation = `
    mutation createCart {
      cartCreate(input: {
        lines: [
          {
            quantity: 1
            merchandiseId: "gid://shopify/ProductVariant/40013602553937"
          }
        ]
      }) {
        cart {
          id
          checkoutUrl
          lines(first: 5) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response: any = await client.request(createMutation);

    if (response.cartCreate.userErrors.length > 0) {
      console.error('❌ Errors creating cart:');
      response.cartCreate.userErrors.forEach((error: any) => {
        console.error(`   ${error.field}: ${error.message}`);
      });
      return;
    }

    const cart = response.cartCreate.cart;

    console.log('✅ Cart created successfully!\n');
    console.log(`Cart ID: ${cart.id}`);
    console.log(`Number of items: ${cart.lines.edges.length}`);
    console.log(`\n🔗 CHECKOUT URL:\n`);
    console.log(`   ${cart.checkoutUrl}\n`);

    // Analyze the URL
    const url = new URL(cart.checkoutUrl);
    console.log(`📊 URL Analysis:\n`);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.host}`);
    console.log(`   Pathname: ${url.pathname}`);
    console.log(`   Search params: ${url.search}`);

    // Check if it's the old format
    if (url.pathname.includes('/cart/c/')) {
      console.log(`\n⚠️  WARNING: This is an OLD cart permalink format!`);
      console.log(`   Expected: /checkouts/... or /cart/...`);
      console.log(`   Got: ${url.pathname}`);
      console.log(`\n   This format is from the deprecated Checkout API.`);
      console.log(`   The Storefront API should return proper checkout URLs.`);
    } else if (url.pathname.includes('/checkouts/')) {
      console.log(`\n✅ CORRECT: This is a proper Shopify checkout URL!`);
    } else {
      console.log(`\n❓ Unknown format: ${url.pathname}`);
    }

  } catch (error: any) {
    console.error('❌ GraphQL Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
  }

  console.log('\n');
}

debugCart().catch(console.error);
