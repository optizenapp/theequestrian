/**
 * Test KEP helmet URL mapping
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import { getProductCanonicalUrl } from '../lib/shopify/products';

async function testKepHelmetUrl() {
  console.log('🔍 Testing KEP Helmet URL Mapping\n');

  // Fetch the product
  const query = `
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        productType
        vendor
        availableForSale
      }
    }
  `;

  try {
    const result = await shopifyFetch<{ product: any }>({
      query,
      variables: { handle: 'helmet-kep-smart-nova-polish-blue' },
      cache: 'no-store',
    });

    if (!result.product) {
      console.log('❌ Product not found in Storefront API');
      console.log('   Make sure it\'s published to Headless channel\n');
      return;
    }

    const product = result.product;
    console.log('✅ Product found in Storefront API!');
    console.log(`   Title: ${product.title}`);
    console.log(`   Handle: ${product.handle}`);
    console.log(`   Product Type: ${product.productType}`);
    console.log(`   Vendor: ${product.vendor}`);
    console.log(`   Available: ${product.availableForSale}\n`);

    // Get canonical URL
    const canonicalUrl = await getProductCanonicalUrl(product);
    console.log('📍 Canonical URL Mapping:');
    console.log(`   Product Type: "${product.productType}"`);
    console.log(`   Canonical URL: ${canonicalUrl}`);
    console.log(`   Full URL: https://theequestrian.vercel.app${canonicalUrl}\n`);

    // Check if product type is mapped
    const { getProductTypesForCollection } = await import('../lib/mapping/collection-mapping');
    const helmetTypes = getProductTypesForCollection('rider', 'helmets');
    
    console.log('🗺️  Mapping Check:');
    console.log(`   Product types for /rider/helmets: ${helmetTypes.length} types`);
    
    if (helmetTypes.includes(product.productType)) {
      console.log(`   ✅ "${product.productType}" IS mapped to /rider/helmets`);
    } else {
      console.log(`   ❌ "${product.productType}" is NOT mapped to /rider/helmets`);
      console.log(`   Available types:`, helmetTypes.join(', '));
    }

    // Check merge action
    console.log('\n🔄 Merge Action Check:');
    const fs = require('fs');
    const csvPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line: string) => 
      line.includes(product.productType) || line.includes('RIDER: Helmets')
    );
    
    if (lines.length > 0) {
      console.log('   Found in mapping CSV:');
      lines.forEach((line: string) => console.log(`   ${line}`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testKepHelmetUrl().catch(console.error);
