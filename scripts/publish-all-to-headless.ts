/**
 * Bulk Publish All Products to Headless Sales Channel
 * 
 * This script publishes all products to the Headless (Storefront API) channel
 * Run this to fix existing products, then set up Shopify Flow for new products
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyAdminFetch } from '../lib/shopify/admin-client';

interface Publication {
  id: string;
  name: string;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  status: string;
}

async function getHeadlessPublicationId(): Promise<string | null> {
  console.log('🔍 Finding Headless publication ID...\n');
  
  const query = `
    query GetPublications {
      publications(first: 10) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyAdminFetch<{ publications: { edges: Array<{ node: Publication }> } }>({
      query,
    });

    const publications = result.publications.edges.map(e => e.node);
    
    console.log('Available publications:');
    publications.forEach(pub => {
      console.log(`  - ${pub.name} (${pub.id})`);
    });

    // Look for Headless or Storefront API channel
    const headless = publications.find(p => 
      p.name.toLowerCase().includes('headless') || 
      p.name.toLowerCase().includes('storefront')
    );

    if (headless) {
      console.log(`\n✅ Found Headless channel: ${headless.name}`);
      return headless.id;
    }

    console.log('\n⚠️  Could not find Headless publication');
    console.log('Available publications:', publications.map(p => p.name).join(', '));
    return null;
  } catch (error) {
    console.error('Error fetching publications:', error);
    return null;
  }
}

async function getAllProducts(): Promise<Product[]> {
  console.log('\n📦 Fetching all products...\n');
  
  const allProducts: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              handle
              title
              status
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const result = await shopifyAdminFetch<{
        products: {
          edges: Array<{ node: Product }>;
          pageInfo: { hasNextPage: boolean; endCursor: string };
        };
      }>({
        query,
        variables: { first: 250, after: cursor },
      });

      const products = result.products.edges.map(e => e.node);
      allProducts.push(...products);
      
      hasNextPage = result.products.pageInfo.hasNextPage;
      cursor = result.products.pageInfo.endCursor;
      pageCount++;

      console.log(`  Fetched page ${pageCount}: ${products.length} products (total: ${allProducts.length})`);
      
      // Safety limit
      if (pageCount >= 50) {
        console.log('\n⚠️  Reached safety limit of 50 pages (12,500 products)');
        break;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      break;
    }
  }

  console.log(`\n✅ Total products fetched: ${allProducts.length}`);
  return allProducts;
}

async function publishProductsToHeadless(
  products: Product[], 
  publicationId: string
): Promise<void> {
  console.log(`\n📤 Publishing ${products.length} products to Headless...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const promises = batch.map(async (product) => {
      // Skip draft products
      if (product.status === 'DRAFT') {
        skippedCount++;
        return;
      }

      const mutation = `
        mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            publishable {
              ... on Product {
                id
                title
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
        const result = await shopifyAdminFetch<{
          publishablePublish: {
            publishable: { id: string; title: string } | null;
            userErrors: Array<{ field: string[]; message: string }>;
          };
        }>({
          query: mutation,
          variables: {
            id: product.id,
            input: [{ publicationId }],
          },
        });

        if (result.publishablePublish.userErrors.length > 0) {
          console.error(`  ❌ Error publishing "${product.title}":`, 
            result.publishablePublish.userErrors[0].message
          );
          errorCount++;
        } else {
          successCount++;
          if (successCount % 50 === 0) {
            console.log(`  ✅ Published ${successCount} products...`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error publishing "${product.title}":`, error);
        errorCount++;
      }
    });

    await Promise.all(promises);

    // Rate limit protection: wait 500ms between batches
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 Publishing Summary:');
  console.log(`  ✅ Successfully published: ${successCount}`);
  console.log(`  ⏭️  Skipped (draft): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

async function main() {
  console.log('🚀 Bulk Publish Products to Headless Channel\n');
  console.log('='.repeat(50));

  // Step 1: Get Headless publication ID
  const publicationId = await getHeadlessPublicationId();
  
  if (!publicationId) {
    console.error('\n❌ Cannot proceed without Headless publication ID');
    console.error('Make sure you have a Headless or Storefront API sales channel enabled');
    process.exit(1);
  }

  // Step 2: Get all products
  const products = await getAllProducts();

  if (products.length === 0) {
    console.log('\n⚠️  No products found');
    process.exit(0);
  }

  // Step 3: Confirm before proceeding
  console.log('\n' + '='.repeat(50));
  console.log(`\n⚠️  About to publish ${products.length} products to Headless`);
  console.log('This will make them available on your headless frontend');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 4: Publish products
  await publishProductsToHeadless(products, publicationId);

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Bulk publish complete!');
  console.log('\n💡 Next steps:');
  console.log('  1. Set up Shopify Flow to auto-publish new products');
  console.log('  2. Run this script periodically to catch any missed products');
  console.log('  3. Clear your Next.js cache: rm -rf .next');
  console.log('  4. Restart your dev server\n');
}

main().catch(console.error);
