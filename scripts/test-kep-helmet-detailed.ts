/**
 * Detailed test for KEP helmet product
 * Check various possible handles and search methods
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

async function testKepHelmet() {
  console.log('🔍 Detailed KEP Helmet Search\n');

  // Try different possible handles
  const possibleHandles = [
    'helmet-kep-smart-nova-polish-blue',
    'helmet-kep-smart-nova-polish-blue-52cm',
    'kep-smart-nova-polish-blue',
    'helmet-kep-smart-nova-polish-blue-1',
  ];

  console.log('Test 1: Trying different handle variations...\n');
  
  for (const handle of possibleHandles) {
    try {
      const query = `
        query GetProduct($handle: String!) {
          product(handle: $handle) {
            id
            handle
            title
            productType
            vendor
            availableForSale
            status
          }
        }
      `;

      const result = await shopifyFetch<{ product: any }>({
        query,
        variables: { handle },
        cache: 'no-store',
      });

      if (result.product) {
        console.log(`✅ FOUND with handle: "${handle}"`);
        console.log(`   Title: ${result.product.title}`);
        console.log(`   Product Type: ${result.product.productType}`);
        console.log(`   Vendor: ${result.product.vendor}`);
        console.log(`   Available: ${result.product.availableForSale}`);
        console.log(`   Status: ${result.product.status || 'N/A'}\n`);
        return; // Found it!
      }
    } catch (error) {
      // Continue to next handle
    }
  }
  
  console.log('❌ Not found with any handle variation\n');

  // Test 2: Search by title
  console.log('Test 2: Searching by title "KEP Smart Nova"...\n');
  try {
    const query = `
      query SearchByTitle($query: String!) {
        products(first: 10, query: $query) {
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

    const result = await shopifyFetch<{ products: { edges: any[] } }>({
      query,
      variables: { query: 'title:*KEP*' },
      cache: 'no-store',
    });

    console.log(`Found ${result.products.edges.length} products with "KEP" in title:`);
    result.products.edges.forEach((edge, i) => {
      console.log(`   ${i + 1}. ${edge.node.title}`);
      console.log(`      Handle: ${edge.node.handle}`);
      console.log(`      Type: ${edge.node.productType}`);
      console.log(`      Vendor: ${edge.node.vendor}\n`);
    });
  } catch (error) {
    console.error('Error searching by title:', error);
  }

  // Test 3: Search by vendor "Helmet Brims"
  console.log('\nTest 3: Searching by vendor "Helmet Brims"...\n');
  try {
    const query = `
      query SearchByVendor($query: String!) {
        products(first: 20, query: $query) {
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

    const result = await shopifyFetch<{ products: { edges: any[] } }>({
      query,
      variables: { query: 'vendor:"Helmet Brims"' },
      cache: 'no-store',
    });

    console.log(`Found ${result.products.edges.length} products from "Helmet Brims" vendor:`);
    result.products.edges.forEach((edge, i) => {
      console.log(`   ${i + 1}. ${edge.node.title}`);
      console.log(`      Handle: ${edge.node.handle}`);
      console.log(`      Type: ${edge.node.productType}\n`);
    });
  } catch (error) {
    console.error('Error searching by vendor:', error);
  }

  // Test 4: Check if it's in Admin API but not Storefront API
  console.log('\nTest 4: Checking product visibility in Storefront API...\n');
  console.log('Note: If product is not found, it might be:');
  console.log('  - Set to "Draft" status in Shopify');
  console.log('  - Not published to the "Online Store" sales channel');
  console.log('  - Not published to the Storefront API sales channel');
  console.log('  - Has a different handle than expected\n');
}

testKepHelmet().catch(console.error);
