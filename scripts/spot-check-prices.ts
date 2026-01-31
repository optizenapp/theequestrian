#!/usr/bin/env tsx
/**
 * Spot Check Price Offsets
 * 
 * Randomly samples products and verifies:
 * 1. Current Shopify price = Vendor price + Shipping offset
 * 2. Prices are being maintained correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

interface Product {
  id: string;
  title: string;
  vendor: string;
  tags: string[];
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice: string | null;
        metafields: {
          edges: Array<{
            node: {
              namespace: string;
              key: string;
              value: string;
            };
          }>;
        };
      };
    }>;
  };
}

// Shipping offset rates by vendor
const SHIPPING_RATES: { [key: string]: number } = {
  'QJ Riding Wear': 8,
  'Living Horse Tails Jewellery By Monika': 8,
  'Shire Saddleworld': 15,
  'Kentucky Horsewear': 12,
  'WeatherBeeta': 10,
  'Horseware': 10,
  'Ascot Saddlery': 0, // No offset
};

async function getProductsByVendor(vendor: string, count: number = 5): Promise<Product[]> {
  const query = `
    query getProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            vendor
            tags
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                  metafields(first: 10, namespace: "custom") {
                    edges {
                      node {
                        namespace
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyAdminFetch<any>({
    query,
    variables: { 
      query: `vendor:"${vendor}"`,
      first: count 
    }
  });

  return result.products.edges.map((e: any) => e.node);
}

function getShippingOffset(vendor: string, tags: string[]): number {
  // Check if vendor has a rate
  if (SHIPPING_RATES[vendor] !== undefined) {
    return SHIPPING_RATES[vendor];
  }
  
  // Default rate for unknown vendors
  return 8;
}

function getVendorPrice(variant: any): number | null {
  const vendorPriceMeta = variant.metafields.edges.find(
    (e: any) => e.node.key === 'vendor_price'
  );
  
  if (vendorPriceMeta) {
    return parseFloat(vendorPriceMeta.node.value);
  }
  
  return null;
}

(async () => {
  console.log('🔍 Spot Checking Price Offsets...\n');
  
  // Check products from vendors that have price offsets
  const vendorsToCheck = ['QJ Riding Wear', 'Living Horse Tails Jewellery By Monika', 'Shire Saddleworld'];
  const allProducts: Product[] = [];
  
  for (const vendor of vendorsToCheck) {
    console.log(`📦 Fetching products from: ${vendor}`);
    const products = await getProductsByVendor(vendor, 3);
    allProducts.push(...products);
  }
  
  console.log(`\n📊 Checking ${allProducts.length} products from ${vendorsToCheck.length} vendors:\n`);
  
  const products = allProducts;
  
  let correct = 0;
  let incorrect = 0;
  let noVendorPrice = 0;
  
  for (const product of products) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 ${product.title}`);
    console.log(`   Vendor: ${product.vendor}`);
    console.log(`   Product ID: ${product.id}`);
    
    const shippingOffset = getShippingOffset(product.vendor, product.tags);
    console.log(`   Shipping Offset: $${shippingOffset}`);
    
    // Check first variant
    const variant = product.variants.edges[0]?.node;
    if (!variant) {
      console.log('   ⚠️  No variants found');
      continue;
    }
    
    const currentPrice = parseFloat(variant.price);
    const vendorPrice = getVendorPrice(variant);
    
    console.log(`\n   Variant: ${variant.title}`);
    console.log(`   Current Price: $${currentPrice}`);
    
    if (vendorPrice === null) {
      console.log(`   ⚠️  No vendor_price metafield found`);
      noVendorPrice++;
      continue;
    }
    
    console.log(`   Vendor Price: $${vendorPrice}`);
    
    const expectedPrice = vendorPrice + shippingOffset;
    console.log(`   Expected Price: $${expectedPrice} (${vendorPrice} + ${shippingOffset})`);
    
    const difference = Math.abs(currentPrice - expectedPrice);
    
    if (difference < 0.01) {
      console.log(`   ✅ CORRECT - Price matches expected`);
      correct++;
    } else {
      console.log(`   ❌ INCORRECT - Difference: $${difference.toFixed(2)}`);
      incorrect++;
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Correct: ${correct}`);
  console.log(`❌ Incorrect: ${incorrect}`);
  console.log(`⚠️  No vendor price: ${noVendorPrice}`);
  console.log(`📊 Total checked: ${products.length}`);
  
  if (incorrect > 0) {
    console.log(`\n⚠️  WARNING: ${incorrect} products have incorrect prices!`);
  } else if (correct > 0) {
    console.log(`\n✅ All checked products have correct price offsets!`);
  }
  
  console.log('\n✅ Done!');
})();
