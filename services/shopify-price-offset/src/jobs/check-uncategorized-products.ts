import { getAllProducts } from '../shopify/client.js';
import { getPrimaryCategoryPath } from '../../../../lib/shopify/products';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface MappingRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
  action: 'include' | 'exclude' | 'merge';
  merge_to?: string;
  notes?: string;
}

/**
 * Load the mapping CSV to check for excluded product types
 */
function loadMappingCSV(): MappingRow[] {
  const mappingPath = path.join(process.cwd(), '..', '..', 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    console.warn(`Mapping file not found: ${mappingPath}`);
    return [];
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  return records;
}

/**
 * Check if a product type is excluded in the mapping
 */
function isExcludedProductType(productType: string, mapping: MappingRow[]): boolean {
  if (!productType) return false;
  
  const normalizedType = productType.toLowerCase().trim();
  
  for (const row of mapping) {
    if (row.product_type && 
        row.product_type.toLowerCase().trim() === normalizedType && 
        row.action === 'exclude') {
      return true;
    }
  }
  
  return false;
}

/**
 * Check which products are uncategorized and why
 */
async function run() {
  console.log('\n🔍 Checking for uncategorized products\n');

  // Load mapping CSV
  const mapping = loadMappingCSV();
  console.log(`[Check] Loaded ${mapping.length} mapping rows\n`);

  // Fetch all products
  const products = await getAllProducts();
  console.log(`[Check] Found ${products.length} products\n`);

  const uncategorized: Array<{
    id: string;
    title: string;
    handle: string;
    productType: string;
    vendor: string;
    reason: 'missing' | 'unmapped' | 'excluded';
    shopifyAdminUrl: string;
  }> = [];

  let categorized = 0;

  for (const product of products) {
    const productType = product.productType || '';
    const categoryPath = getPrimaryCategoryPath(productType);

    if (!categoryPath) {
      // Product is uncategorized - determine why
      let reason: 'missing' | 'unmapped' | 'excluded';
      
      if (!productType || productType.trim() === '') {
        reason = 'missing';
      } else if (isExcludedProductType(productType, mapping)) {
        reason = 'excluded';
      } else {
        reason = 'unmapped';
      }

      uncategorized.push({
        id: product.id,
        title: product.title,
        handle: product.handle,
        productType: productType || '(empty)',
        vendor: product.vendor,
        reason,
        shopifyAdminUrl: `https://theequestrian.myshopify.com/admin/products/${product.id.replace('gid://shopify/Product/', '')}`,
      });
    } else {
      categorized++;
    }
  }

  // Print summary
  console.log('\n📊 Summary:\n');
  console.log(`Total products: ${products.length}`);
  console.log(`Categorized: ${categorized} (${((categorized / products.length) * 100).toFixed(1)}%)`);
  console.log(`Uncategorized: ${uncategorized.length} (${((uncategorized.length / products.length) * 100).toFixed(1)}%)\n`);

  // Group by reason
  const byReason = {
    missing: uncategorized.filter(p => p.reason === 'missing'),
    unmapped: uncategorized.filter(p => p.reason === 'unmapped'),
    excluded: uncategorized.filter(p => p.reason === 'excluded'),
  };

  console.log('Breakdown by reason:');
  console.log(`  Missing productType: ${byReason.missing.length}`);
  console.log(`  Unmapped productType: ${byReason.unmapped.length}`);
  console.log(`  Excluded productType: ${byReason.excluded.length}\n`);

  if (uncategorized.length > 0) {
    // Show examples from each category
    console.log('❌ Examples of uncategorized products:\n');
    
    if (byReason.missing.length > 0) {
      console.log('Missing productType:');
      byReason.missing.slice(0, 3).forEach(p => {
        console.log(`  - ${p.title} (${p.handle}) | Vendor: ${p.vendor}`);
      });
      if (byReason.missing.length > 3) {
        console.log(`  ... and ${byReason.missing.length - 3} more\n`);
      } else {
        console.log('');
      }
    }

    if (byReason.unmapped.length > 0) {
      console.log('Unmapped productType:');
      const unmappedTypes = new Set(byReason.unmapped.map(p => p.productType));
      Array.from(unmappedTypes).slice(0, 5).forEach(type => {
        const count = byReason.unmapped.filter(p => p.productType === type).length;
        console.log(`  - "${type}" (${count} products)`);
      });
      if (unmappedTypes.size > 5) {
        console.log(`  ... and ${unmappedTypes.size - 5} more types\n`);
      } else {
        console.log('');
      }
    }

    if (byReason.excluded.length > 0) {
      console.log('Excluded productType:');
      const excludedTypes = new Set(byReason.excluded.map(p => p.productType));
      Array.from(excludedTypes).slice(0, 5).forEach(type => {
        const count = byReason.excluded.filter(p => p.productType === type).length;
        console.log(`  - "${type}" (${count} products)`);
      });
      if (excludedTypes.size > 5) {
        console.log(`  ... and ${excludedTypes.size - 5} more types\n`);
      } else {
        console.log('');
      }
    }

    // Export to CSV
    const csvRows = [
      'Product ID,Title,Handle,Product Type,Vendor,Reason,Shopify Admin URL',
      ...uncategorized.map(p => 
        `${p.id},"${p.title.replace(/"/g, '""')}",${p.handle},"${p.productType.replace(/"/g, '""')}",${p.vendor},${p.reason},${p.shopifyAdminUrl}`
      )
    ];

    const outputPath = path.join(process.cwd(), 'outputs', 'uncategorized-products.csv');
    
    // Ensure outputs directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, csvRows.join('\n'));
    console.log(`✅ Exported to: ${outputPath}`);
    console.log('   Use this CSV to review and categorize products\n');

    // Also create a summary by product type
    const typesSummary = new Map<string, { count: number; reason: string; examples: string[] }>();
    
    for (const p of uncategorized) {
      if (!typesSummary.has(p.productType)) {
        typesSummary.set(p.productType, { count: 0, reason: p.reason, examples: [] });
      }
      const summary = typesSummary.get(p.productType)!;
      summary.count++;
      if (summary.examples.length < 3) {
        summary.examples.push(p.title);
      }
    }

    // Export summary
    const summaryRows = [
      'Product Type,Count,Reason,Example Products',
      ...Array.from(typesSummary.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([type, data]) => 
          `"${type.replace(/"/g, '""')}",${data.count},${data.reason},"${data.examples.join('; ').replace(/"/g, '""')}"`
        )
    ];

    const summaryPath = path.join(process.cwd(), 'outputs', 'uncategorized-products-summary.csv');
    fs.writeFileSync(summaryPath, summaryRows.join('\n'));
    console.log(`✅ Summary by type: ${summaryPath}\n`);

  } else {
    console.log('✅ All products are properly categorized!\n');
  }
}

run().catch(error => {
  console.error('[Check] Failed:', error);
  process.exit(1);
});
