/**
 * Test Shopify Connection Script
 * 
 * Tests your Shopify Storefront API connection and fetches sample data
 * 
 * Usage: npm run test:shopify
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

const TEST_QUERY = `
  query TestConnection {
    shop {
      name
      primaryDomain {
        url
      }
    }
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
          }
        }
      }
    }
  }
`;

async function testConnection() {
  console.log('🔄 Testing Shopify connection...\n');

  try {
    const data = await shopifyFetch<{
      shop: {
        name: string;
        primaryDomain: {
          url: string;
        };
      };
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            availableForSale: boolean;
            priceRange: {
              minVariantPrice: {
                amount: string;
                currencyCode: string;
              };
            };
          };
        }>;
      };
    }>({
      query: TEST_QUERY,
    });

    console.log('✅ Connection successful!\n');
    console.log(`Shop: ${data.shop.name}`);
    console.log(`URL: ${data.shop.primaryDomain.url}\n`);
    console.log(`Sample Products (${data.products.edges.length}):`);
    
    data.products.edges.forEach(({ node }) => {
      console.log(`  - ${node.title}`);
      console.log(`    Handle: ${node.handle}`);
      console.log(`    Price: ${node.priceRange.minVariantPrice.amount} ${node.priceRange.minVariantPrice.currencyCode}`);
      console.log(`    Available: ${node.availableForSale ? 'Yes' : 'No'}\n`);
    });

    return data;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('✅ Test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testConnection };
