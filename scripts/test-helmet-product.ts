/**
 * Test Script: Check if helmet product exists in Shopify
 * Tests the "Helmet Kep Smart Nova Polish Blue" product
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

interface ProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
        productType: string;
        vendor: string;
        availableForSale: boolean;
        tags: string[];
      };
    }>;
  };
}

async function testHelmetProduct() {
  console.log('🔍 Testing helmet product fetch from Shopify...\n');

  // Test 1: Fetch by handle
  console.log('Test 1: Fetching by handle "helmet-kep-smart-nova-polish-blue"');
  try {
    const handleQuery = `
      query GetProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          handle
          title
          productType
          vendor
          availableForSale
          tags
        }
      }
    `;

    const handleResult = await shopifyFetch<{ product: any }>({
      query: handleQuery,
      variables: { handle: 'helmet-kep-smart-nova-polish-blue' },
      cache: 'no-store',
    });

    if (handleResult.product) {
      console.log('✅ Product found by handle!');
      console.log('   Title:', handleResult.product.title);
      console.log('   Product Type:', handleResult.product.productType);
      console.log('   Vendor:', handleResult.product.vendor);
      console.log('   Available:', handleResult.product.availableForSale);
      console.log('   Tags:', handleResult.product.tags.slice(0, 5).join(', '));
    } else {
      console.log('❌ Product NOT found by handle');
    }
  } catch (error) {
    console.error('❌ Error fetching by handle:', error);
  }

  console.log('\n---\n');

  // Test 2: Search by product type "RIDER: Helmets"
  console.log('Test 2: Searching by product_type:"RIDER: Helmets"');
  try {
    const typeQuery = `
      query SearchByProductType($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              handle
              title
              productType
              vendor
              availableForSale
            }
          }
        }
      }
    `;

    const typeResult = await shopifyFetch<ProductsResponse>({
      query: typeQuery,
      variables: { 
        query: 'product_type:"RIDER: Helmets"',
        first: 10
      },
      cache: 'no-store',
    });

    const products = typeResult.products.edges;
    console.log(`✅ Found ${products.length} products with product_type "RIDER: Helmets"`);
    
    if (products.length > 0) {
      console.log('\nFirst 5 products:');
      products.slice(0, 5).forEach((edge, i) => {
        console.log(`   ${i + 1}. ${edge.node.title}`);
        console.log(`      Handle: ${edge.node.handle}`);
        console.log(`      Vendor: ${edge.node.vendor}`);
      });

      // Check if our specific helmet is in the results
      const ourHelmet = products.find(p => 
        p.node.handle === 'helmet-kep-smart-nova-polish-blue'
      );
      
      if (ourHelmet) {
        console.log('\n✅ Our helmet IS in the product_type:"RIDER: Helmets" query results!');
      } else {
        console.log('\n⚠️  Our helmet is NOT in the product_type:"RIDER: Helmets" query results');
      }
    } else {
      console.log('❌ No products found with this product type');
    }
  } catch (error) {
    console.error('❌ Error searching by product type:', error);
  }

  console.log('\n---\n');

  // Test 3: Search by product type "Helmets" (without RIDER: prefix)
  console.log('Test 3: Searching by product_type:"Helmets"');
  try {
    const typeQuery = `
      query SearchByProductType($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              handle
              title
              productType
              vendor
            }
          }
        }
      }
    `;

    const typeResult = await shopifyFetch<ProductsResponse>({
      query: typeQuery,
      variables: { 
        query: 'product_type:"Helmets"',
        first: 10
      },
      cache: 'no-store',
    });

    const products = typeResult.products.edges;
    console.log(`✅ Found ${products.length} products with product_type "Helmets"`);
    
    if (products.length > 0) {
      console.log('\nFirst 5 products:');
      products.slice(0, 5).forEach((edge, i) => {
        console.log(`   ${i + 1}. ${edge.node.title} (${edge.node.productType})`);
      });
    }
  } catch (error) {
    console.error('❌ Error searching by product type:', error);
  }

  console.log('\n---\n');

  // Test 4: Check what product types are being queried for /rider/helmets
  console.log('Test 4: Checking what product types getProductTypesForCollection returns');
  try {
    const { getProductTypesForCollection } = await import('../lib/mapping/collection-mapping');
    const productTypes = getProductTypesForCollection('rider', 'helmets');
    
    console.log(`✅ Product types for /rider/helmets:`);
    console.log(`   Total: ${productTypes.length} types`);
    console.log(`   Types:`, productTypes.join(', '));
    
    if (productTypes.includes('RIDER: Helmets')) {
      console.log('\n✅ "RIDER: Helmets" IS included in the query');
    } else {
      console.log('\n❌ "RIDER: Helmets" is NOT included in the query');
    }
  } catch (error) {
    console.error('❌ Error checking product types:', error);
  }

  console.log('\n---\n');
  console.log('🏁 Test complete!\n');
}

// Run the test
testHelmetProduct().catch(console.error);
