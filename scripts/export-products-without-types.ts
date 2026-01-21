/**
 * Export products that need product types assigned
 * Creates a CSV you can edit and re-import to Shopify
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

interface Product {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
}

async function exportProductsWithoutTypes() {
  console.log('📦 Exporting products without proper product types...\n');

  const problemTypes = [
    '(No Product Type)',
    'Default',
    'Veterinary',
    'Clothing', // Too generic
    'Accessories', // Too generic
  ];

  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            handle
            title
            productType
            vendor
            tags
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const result: any = await shopifyFetch<any>({
      query,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });

    allProducts.push(...result.products.edges.map((e: any) => e.node));
    hasNextPage = result.products.pageInfo.hasNextPage;
    cursor = result.products.pageInfo.endCursor;

    console.log(`  Fetched ${allProducts.length} products...`);
  }

  console.log(`\n✅ Total products: ${allProducts.length}`);

  // Filter products with problem types
  const productsNeedingTypes = allProducts.filter(p => 
    !p.productType || 
    p.productType.trim() === '' ||
    problemTypes.includes(p.productType)
  );

  console.log(`⚠️  Products needing product types: ${productsNeedingTypes.length}\n`);

  // Group by current type
  const grouped = new Map<string, Product[]>();
  productsNeedingTypes.forEach(p => {
    const type = p.productType || '(No Product Type)';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(p);
  });

  console.log('Breakdown by current type:');
  for (const [type, products] of grouped.entries()) {
    console.log(`  ${type}: ${products.length} products`);
  }

  // Generate CSV
  const csvRows = [
    'Product ID,Handle,Title,Current Product Type,Vendor,Tags,Suggested Product Type,Notes'
  ];

  for (const product of productsNeedingTypes) {
    const tags = product.tags.join('; ');
    const suggestedType = suggestProductType(product);
    
    csvRows.push([
      product.id.replace('gid://shopify/Product/', ''),
      product.handle,
      `"${product.title.replace(/"/g, '""')}"`,
      `"${product.productType || ''}"`,
      `"${product.vendor}"`,
      `"${tags}"`,
      `"${suggestedType}"`,
      '""'
    ].join(','));
  }

  const csvContent = csvRows.join('\n');
  const outputPath = path.join(process.cwd(), 'exports', 'products-needing-types.csv');
  
  fs.writeFileSync(outputPath, csvContent);
  
  console.log(`\n✅ Exported to: ${outputPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`  1. Open the CSV in Excel/Google Sheets`);
  console.log(`  2. Fill in the "Suggested Product Type" column`);
  console.log(`  3. Use Shopify's bulk editor or import to update product types`);
  console.log(`  4. Re-run this script to verify all products have types\n`);
}

function suggestProductType(product: Product): string {
  const title = product.title.toLowerCase();
  const tags = product.tags.map(t => t.toLowerCase());
  const vendor = product.vendor.toLowerCase();

  // Helmets
  if (title.includes('helmet') || tags.some(t => t.includes('helmet'))) {
    return 'Helmets';
  }

  // Horse Boots
  if (title.includes('boot') && (title.includes('horse') || title.includes('bell') || title.includes('tendon'))) {
    return 'Horse Boots';
  }

  // Saddle Pads
  if (title.includes('saddle pad') || title.includes('saddle cloth') || title.includes('numnah')) {
    return 'Saddle Cloths';
  }

  // Rugs
  if (title.includes('rug') || title.includes('blanket')) {
    return 'RUGS: Winter Rugs';
  }

  // Bits
  if (title.includes('bit') && !title.includes('rabbit')) {
    return 'Bits';
  }

  // Bridles
  if (title.includes('bridle')) {
    return 'Bridles';
  }

  // Dog products
  if (title.includes('dog') || vendor.includes('dog')) {
    if (title.includes('treat')) return 'Dog Treats';
    if (title.includes('toy')) return 'Dog Toys';
    if (title.includes('collar') || title.includes('lead') || title.includes('leash')) return 'Dog Collars & Leads';
    if (title.includes('bed')) return 'Dog Beds';
    return 'Dog Accessories';
  }

  // Cat products
  if (title.includes('cat') || vendor.includes('cat')) {
    if (title.includes('food') || title.includes('treat')) return 'Cat Food & Treats';
    if (title.includes('toy')) return 'Cat Gyms & Toys';
    return 'Cat Accessories';
  }

  // Clothing
  if (title.includes('breech') || title.includes('jodhpur')) {
    return 'Clothing - Breeches & Jodhpurs';
  }
  if (title.includes('jacket') || title.includes('coat')) {
    return 'Clothing - Jackets';
  }
  if (title.includes('shirt') || title.includes('top') || title.includes('polo')) {
    return 'Clothing - Shirts & Tops';
  }

  return 'NEEDS MANUAL REVIEW';
}

exportProductsWithoutTypes().catch(console.error);
