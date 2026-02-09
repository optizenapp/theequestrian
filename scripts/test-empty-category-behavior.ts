/**
 * Test Script: Empty Category Behavior
 * 
 * This script tests the dynamic category filtering and empty redirect logic
 * by checking product counts for newly created categories.
 */

import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductsByTypes } from '@/lib/shopify/products';
import { getProductCountForCategory } from '@/lib/utils/product-counts';

interface TestResult {
  category: string;
  path: string;
  productTypes: string[];
  productCount: number;
  hasProducts: boolean;
  shouldRedirect: boolean;
  shouldShowInNav: boolean;
}

const NEW_CATEGORIES = [
  { category: 'horse', subcategory: 'tack', subsubcategory: 'freejump-stirrups' },
  { category: 'horse', subcategory: 'supplements', subsubcategory: 'calming' },
  { category: 'clothing', subcategory: 'activewear', subsubcategory: 'base-layers' },
  { category: 'pet', subcategory: 'food', subsubcategory: undefined },
  { category: 'accessories', subcategory: 'homeware', subsubcategory: undefined },
];

async function testCategory(
  category: string,
  subcategory?: string,
  subsubcategory?: string
): Promise<TestResult> {
  const path = [category, subcategory, subsubcategory].filter(Boolean).join('/');
  
  console.log(`\n🔍 Testing: /${path}`);
  
  // Get product types for this category
  const productTypes = await getProductTypesForCollection(category, subcategory, subsubcategory);
  console.log(`  Product types (${productTypes.length}):`, productTypes.slice(0, 3));
  
  // Get actual product count
  let productCount = 0;
  if (productTypes.length > 0) {
    const { totalCount } = await getProductsByTypes(productTypes, 1);
    productCount = totalCount;
  }
  console.log(`  Product count: ${productCount}`);
  
  // Get dynamic count check
  const { hasProducts } = await getProductCountForCategory(category, subcategory, subsubcategory);
  console.log(`  Has products (dynamic): ${hasProducts}`);
  
  const shouldRedirect = productCount === 0;
  const shouldShowInNav = hasProducts;
  
  console.log(`  Should redirect: ${shouldRedirect ? '✅ YES' : '❌ NO'}`);
  console.log(`  Should show in nav: ${shouldShowInNav ? '✅ YES' : '❌ NO'}`);
  
  return {
    category: path,
    path: `/${path}`,
    productTypes,
    productCount,
    hasProducts,
    shouldRedirect,
    shouldShowInNav,
  };
}

async function main() {
  console.log('🚀 Testing Empty Category Behavior\n');
  console.log('This script tests newly created categories to verify:');
  console.log('  1. Empty categories will redirect to parent');
  console.log('  2. Empty categories will NOT appear in navigation pills');
  console.log('  3. Categories with products will render normally\n');
  console.log('='.repeat(80));
  
  const results: TestResult[] = [];
  
  for (const cat of NEW_CATEGORIES) {
    try {
      const result = await testCategory(cat.category, cat.subcategory, cat.subsubcategory);
      results.push(result);
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  
  const emptyCategories = results.filter(r => r.shouldRedirect);
  const categoriesWithProducts = results.filter(r => !r.shouldRedirect);
  
  console.log(`Empty Categories (will redirect): ${emptyCategories.length}`);
  emptyCategories.forEach(r => {
    console.log(`  - ${r.path} (${r.productTypes.length} product types mapped, 0 products found)`);
  });
  
  console.log(`\nCategories with Products: ${categoriesWithProducts.length}`);
  categoriesWithProducts.forEach(r => {
    console.log(`  - ${r.path} (${r.productCount} products)`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test complete!\n');
  console.log('Next steps:');
  console.log('  1. Visit empty category URLs to verify redirects work');
  console.log('  2. Check parent category pages to verify pills are hidden');
  console.log('  3. Add products to empty categories and verify they appear');
  console.log('  4. Wait 15 minutes (ISR cache) or redeploy to see changes\n');
}

main().catch(console.error);
