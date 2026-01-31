import { getAllProducts } from '../shopify/client.js';

/**
 * Check which products are missing the primaryCollection metafield
 * This metafield is required for proper breadcrumb generation
 */
async function run() {
  console.log('\n🔍 Checking products for primaryCollection metafield\n');

  const products = await getAllProducts();
  console.log(`[Check] Found ${products.length} products\n`);

  const missingPrimaryCollection: Array<{
    id: string;
    title: string;
    handle: string;
    vendor: string;
  }> = [];

  for (const product of products) {
    // Check if product has primaryCollection metafield
    // The metafield should be at product.metafields with namespace 'seo' and key 'primary_collection'
    const hasPrimaryCollection = product.metafields?.some(
      (mf: any) => mf.namespace === 'seo' && mf.key === 'primary_collection'
    );

    if (!hasPrimaryCollection) {
      missingPrimaryCollection.push({
        id: product.id,
        title: product.title,
        handle: product.handle,
        vendor: product.vendor,
      });
    }
  }

  console.log('\n📊 Results:\n');
  console.log(`Total products: ${products.length}`);
  console.log(`Missing primaryCollection: ${missingPrimaryCollection.length}`);
  console.log(`Percentage missing: ${((missingPrimaryCollection.length / products.length) * 100).toFixed(1)}%\n`);

  if (missingPrimaryCollection.length > 0) {
    console.log('❌ Products missing primaryCollection metafield:\n');
    
    // Group by vendor
    const byVendor = missingPrimaryCollection.reduce((acc, p) => {
      if (!acc[p.vendor]) acc[p.vendor] = [];
      acc[p.vendor].push(p);
      return acc;
    }, {} as Record<string, typeof missingPrimaryCollection>);

    for (const [vendor, prods] of Object.entries(byVendor)) {
      console.log(`\n${vendor} (${prods.length} products):`);
      prods.slice(0, 5).forEach(p => {
        console.log(`  - ${p.title} (${p.handle})`);
      });
      if (prods.length > 5) {
        console.log(`  ... and ${prods.length - 5} more`);
      }
    }

    // Export to CSV for bulk editing
    const csv = [
      'Product ID,Title,Handle,Vendor,URL',
      ...missingPrimaryCollection.map(p => 
        `${p.id},"${p.title.replace(/"/g, '""')}",${p.handle},${p.vendor},https://theequestrian.myshopify.com/admin/products/${p.id.replace('gid://shopify/Product/', '')}`
      )
    ].join('\n');

    const fs = await import('fs');
    const outputPath = 'outputs/products-missing-primary-collection.csv';
    fs.writeFileSync(outputPath, csv);
    console.log(`\n✅ Exported to: ${outputPath}`);
    console.log('   Use this CSV to bulk update primaryCollection metafields in Shopify\n');
  } else {
    console.log('✅ All products have primaryCollection metafield set!\n');
  }
}

run().catch(error => {
  console.error('[Check] Failed:', error);
  process.exit(1);
});
