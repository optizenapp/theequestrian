#!/usr/bin/env tsx

/**
 * Script 10: Add Care Instructions
 * 
 * Adds care and maintenance sections
 * - Provides washing/cleaning instructions
 * - Includes storage recommendations
 * - Adds longevity tips
 * 
 * Usage:
 *   npm run add-care-instructions -- --dry-run  (preview changes)
 *   npm run add-care-instructions -- --yes      (apply changes)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');

interface CsvRow {
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  parent_url: string;
  category_level: string;
  status: string;
  default_sort: string;
  faq_json: string;
  related_categories_json: string;
}

// Care instruction templates
const CARE_INSTRUCTIONS: Record<string, string> = {
  'breeches': `<h3>Care & Maintenance</h3>
<p><strong>Washing:</strong> Machine wash cold water on gentle cycle, inside out to protect grip material. Avoid hot water which can damage elasticity and silicone grip. Use mild detergent without fabric softeners.</p>
<p><strong>Drying:</strong> Hang dry or tumble dry on low heat. High heat damages elastic fibers and grip material. Air drying extends garment life significantly.</p>
<p><strong>Storage:</strong> Fold or hang in a cool, dry place. Avoid direct sunlight which can fade colors. Keep away from sharp objects that might snag fabric.</p>
<p><strong>Longevity Tips:</strong> With proper care, quality breeches last 2-3 years of regular use. Rotate between multiple pairs to reduce wear. Repair small tears promptly to prevent further damage.</p>`,

  'helmets': `<h3>Care & Maintenance</h3>
<p><strong>Cleaning:</strong> Wipe exterior with damp cloth and mild soap. Remove and wash liner according to manufacturer instructions (usually hand wash or gentle machine wash). Allow to air dry completely before reassembling.</p>
<p><strong>Storage:</strong> Store in a cool, dry place away from direct sunlight and extreme temperatures. Use a helmet bag to protect from dust and scratches. Never store in car during Australian summer heat.</p>
<p><strong>Replacement:</strong> Replace helmet after any impact, even if no visible damage. Replace every 5 years regardless of use due to material degradation. Check manufacturer warranty and replacement programs.</p>
<p><strong>Inspection:</strong> Regularly check retention system, buckles, and padding for wear. Ensure dial systems function smoothly. Replace if any components show damage.</p>`,

  'rugs': `<h3>Care & Maintenance</h3>
<p><strong>Cleaning:</strong> Brush off dried mud before washing. Machine wash on gentle cycle or hand wash for delicate rugs. Use rug-specific detergent to maintain waterproofing. Rinse thoroughly to remove all soap.</p>
<p><strong>Drying:</strong> Hang over fence or rug rack to air dry completely. Ensure both sides dry to prevent mildew. Never store damp rugs, especially important in humid Australian climates.</p>
<p><strong>Waterproofing:</strong> Reapply waterproofing spray annually or as needed. Test by sprinkling water - if it beads up, waterproofing is intact. If it soaks in, time to retreat.</p>
<p><strong>Storage:</strong> Clean and dry thoroughly before storing. Store in breathable rug bags in cool, dry place. Check stored rugs periodically for mold or pest damage.</p>
<p><strong>Repairs:</strong> Fix small tears immediately to prevent enlargement. Replace broken buckles and straps promptly. Professional rug repairs available for major damage.</p>`,

  'saddles': `<h3>Care & Maintenance</h3>
<p><strong>Leather Saddles:</strong> Clean with saddle soap after each use to remove sweat and dirt. Condition monthly with quality leather conditioner. Deep clean and condition quarterly. Never use harsh chemicals or excessive water.</p>
<p><strong>Synthetic Saddles:</strong> Wipe down with damp cloth after use. Use mild soap for deeper cleaning. No conditioning required. Much lower maintenance than leather but check for wear on high-friction areas.</p>
<p><strong>Storage:</strong> Store on saddle rack in cool, dry place. Cover to protect from dust. Avoid extreme temperatures and humidity. Use saddle covers for transport.</p>
<p><strong>Inspection:</strong> Regularly check stitching, billets, and girth straps for wear. Check tree for damage (cracks, twists). Professional saddle inspection recommended annually.</p>
<p><strong>Longevity:</strong> Quality leather saddles last 20+ years with proper care. Synthetic saddles typically 5-10 years. Investment in proper care pays off in saddle lifespan.</p>`,

  'boots-rider': `<h3>Care & Maintenance</h3>
<p><strong>Leather Boots:</strong> Clean with saddle soap after each use. Condition regularly with leather conditioner. Polish for show appearance. Use boot trees to maintain shape. Resole when needed - quality boots can be resoled multiple times.</p>
<p><strong>Synthetic Boots:</strong> Wipe clean with damp cloth. Use mild soap for stubborn dirt. Much easier maintenance than leather. Check stitching and zippers regularly for wear.</p>
<p><strong>Storage:</strong> Store upright using boot shapers or trees. Keep in cool, dry place. Avoid direct sunlight which can dry and crack leather. Use boot bags for transport and protection.</p>
<p><strong>Break-in:</strong> Leather boots require 2-3 weeks break-in. Wear with thick socks initially. Use leather conditioner and boot stretchers to speed process. Synthetic boots need no break-in.</p>`,

  'supplements': `<h3>Storage & Handling</h3>
<p><strong>Storage Conditions:</strong> Store in cool, dry place away from direct sunlight. Australian summer heat can degrade supplements quickly. Consider refrigeration for products with live probiotics or as recommended on label.</p>
<p><strong>Container Care:</strong> Keep containers tightly sealed to prevent moisture and pest contamination. Transfer to airtight containers if original packaging is damaged. Label with purchase date.</p>
<p><strong>Shelf Life:</strong> Use within 3-6 months of opening for best freshness and efficacy. Check expiration dates before purchasing. Buy quantities appropriate for your feeding rate.</p>
<p><strong>Feeding:</strong> Mix thoroughly into feed. Some supplements work best with fat source (oil) for absorption. Follow manufacturer dosing instructions based on horse weight. Be consistent with timing and dosage.</p>`,

  'grooming': `<h3>Tool Care & Maintenance</h3>
<p><strong>Cleaning:</strong> Remove hair from brushes after each use. Wash brushes weekly with mild soap and warm water. Rinse thoroughly and allow to air dry completely before storing.</p>
<p><strong>Brush Care:</strong> Natural bristle brushes last longer with proper care but require more maintenance. Synthetic brushes are more durable and easier to clean. Replace brushes when bristles become worn or loose.</p>
<p><strong>Storage:</strong> Store in dry grooming box or bag to protect from dust and moisture. Keep hoof picks clean and dry to prevent rust. Organize tools for easy access and to monitor condition.</p>
<p><strong>Replacement:</strong> Replace worn curry combs when rubber becomes hard or cracked. Replace body brushes when bristles are significantly worn. Sharp or damaged tools can hurt your horse.</p>`,
};

function getCategoryType(urlPath: string): string {
  if (urlPath.includes('breech') || urlPath.includes('tight')) return 'breeches';
  if (urlPath.includes('helmet')) return 'helmets';
  if (urlPath.includes('boot') && (urlPath.includes('rider') || urlPath.includes('clothing'))) return 'boots-rider';
  if (urlPath.includes('rug')) return 'rugs';
  if (urlPath.includes('saddle')) return 'saddles';
  if (urlPath.includes('supplement')) return 'supplements';
  if (urlPath.includes('grooming')) return 'grooming';
  
  return '';
}

function addCareInstructions(description: string, categoryType: string): string {
  const care = CARE_INSTRUCTIONS[categoryType];
  if (!care) {
    return description;
  }
  
  // Check if care instructions already exist
  if (description.includes('Care & Maintenance') || description.includes('Storage & Handling')) {
    return description;
  }
  
  // Add before Australian context or at the end
  if (description.includes('<h3>Australian')) {
    return description.replace(
      '<h3>Australian',
      `${care}\n<h3>Australian`
    );
  } else if (description.includes('<h3>Shop by Category</h3>')) {
    return description.replace(
      '<h3>Shop by Category</h3>',
      `${care}\n<h3>Shop by Category</h3>`
    );
  } else {
    // Add at the end
    return description + '\n' + care;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run add-care-instructions -- --dry-run  (preview changes)');
    console.log('  npm run add-care-instructions -- --yes      (apply changes)');
    process.exit(1);
  }
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  console.log(`📊 Processing ${rows.length} rows...\n`);
  
  let changedCount = 0;
  const changes: Array<{ url: string; categoryType: string }> = [];
  
  // Process each row - only add to level 1 and 2 categories
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path);
    const level = parseInt(row.category_level);
    
    // Only add care instructions to level 1 and 2 categories
    if (categoryType && level <= 2) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addCareInstructions(oldLongDesc, categoryType);
      
      if (oldLongDesc !== newLongDesc) {
        changedCount++;
        changes.push({
          url: row.url_path,
          categoryType,
        });
        
        if (!dryRun) {
          row.long_description = newLongDesc;
        }
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview:\n`);
  changes.forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Care instructions: ${change.categoryType}`);
    console.log('');
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  // Show breakdown by category type
  const byType: Record<string, number> = {};
  changes.forEach(c => {
    byType[c.categoryType] = (byType[c.categoryType] || 0) + 1;
  });
  
  console.log('\n   Changes by category type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-care-instructions-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);
    
    // Write updated CSV
    const output = stringify(rows, {
      header: true,
      columns: [
        'url_path',
        'h1_title',
        'meta_title',
        'meta_description',
        'short_description',
        'long_description',
        'breadcrumb_label',
        'parent_url',
        'category_level',
        'status',
        'default_sort',
        'faq_json',
        'related_categories_json',
      ],
    });
    
    fs.writeFileSync(CSV_PATH, output, 'utf-8');
    console.log(`✅ Changes applied to ${path.basename(CSV_PATH)}`);
  }
}

main();
