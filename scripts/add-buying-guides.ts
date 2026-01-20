#!/usr/bin/env tsx

/**
 * Script 8: Add Buying Guides
 * 
 * Adds "How to Choose" sections to major categories
 * - Includes decision-making criteria
 * - Lists key features to consider
 * - Provides discipline-specific guidance
 * 
 * Usage:
 *   npm run add-buying-guides -- --dry-run  (preview changes)
 *   npm run add-buying-guides -- --yes      (apply changes)
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

// Buying guide templates
const BUYING_GUIDES: Record<string, string> = {
  'breeches': `<h3>How to Choose Riding Breeches</h3>
<p><strong>Consider Your Discipline:</strong> Dressage riders typically prefer full-seat breeches for maximum grip and stability. Jumping riders often choose knee-patch styles for freedom of movement. All-purpose riders can use either style based on personal preference.</p>
<p><strong>Fabric & Features:</strong> Look for four-way stretch for comfort and mobility. Moisture-wicking fabrics keep you cool and dry. UPF sun protection is valuable for outdoor riding in Australian conditions. Check for reinforced inner seams and quality stitching.</p>
<p><strong>Fit & Sizing:</strong> Breeches should fit snugly without restricting movement. High-waisted styles provide better coverage when mounted. European sizing is standard - check conversion charts for Australian equivalents. When between sizes, size up for comfort.</p>
<p><strong>Price Points:</strong> Entry-level breeches ($80-150) offer good value for casual riders. Mid-range ($150-300) provide better fabrics and durability. Premium brands ($300+) feature superior materials, advanced grip technology, and competition-ready styling.</p>`,

  'helmets': `<h3>How to Choose a Riding Helmet</h3>
<p><strong>Safety Standards:</strong> All helmets must meet AS/NZS 3838 Australian standards at minimum. Additional certifications (VG1, PAS015, ASTM) indicate enhanced protection. Never compromise on safety - this is your most important piece of equipment.</p>
<p><strong>Fit System:</strong> Dial-adjust systems offer precise fit customization. Traditional harness systems are equally safe when properly adjusted. The helmet should sit level on your head, covering your forehead, and feel snug without pressure points.</p>
<p><strong>Ventilation:</strong> Australian conditions demand good airflow. Look for multiple vents with mesh covering. More vents don't always mean better cooling - vent placement matters more than quantity.</p>
<p><strong>Style & Features:</strong> Choose between traditional (velvet or suede finish) and modern (matte or glossy) styles. Removable liners make cleaning easier. Visors are optional but popular. Premium helmets offer superior comfort and often weigh less.</p>`,

  'rugs': `<h3>How to Choose Horse Rugs</h3>
<p><strong>Climate Considerations:</strong> Northern Australia and Queensland typically need 0-200g fill year-round. Southern regions require 200-400g for winter. Consider your horse's breed, clip, age, and available shelter when selecting weight.</p>
<p><strong>Rug Types:</strong> Turnout rugs are waterproof for outdoor use. Stable rugs are for indoor warmth only. Summer sheets protect from flies and sun. Coolers wick moisture after work. Most horses need multiple rug types throughout the year.</p>
<p><strong>Durability & Features:</strong> Denier rating (600D-1200D+) indicates fabric strength. Higher denier lasts longer but weighs more. Look for leg arches, tail flaps, shoulder gussets, and cross surcingles for proper fit and security.</p>
<p><strong>Sizing:</strong> Measure from center chest to tail point. Most brands use cm sizing (120-210cm or 4'0"-7'0"). If between sizes, size up. Poor fit causes rubbing, slipping, and discomfort.</p>`,

  'saddles': `<h3>How to Choose a Saddle</h3>
<p><strong>Discipline-Specific Design:</strong> Dressage saddles have deep seats and straight flaps for a long leg position. Jumping saddles feature forward-cut flaps and knee rolls. All-purpose saddles offer versatility for general riding and light competition.</p>
<p><strong>Tree Width:</strong> The tree must fit your horse's back. Narrow, medium, and wide options available. Many modern saddles have adjustable trees or interchangeable gullets. Professional saddle fitting is highly recommended to ensure proper fit.</p>
<p><strong>Seat Size:</strong> Measured in inches (15"-18" for adults). You should have about 4 fingers width behind you and 2-3 fingers in front when seated. Seat size doesn't affect horse fit - choose based on your comfort.</p>
<p><strong>Materials:</strong> Leather saddles require regular maintenance but last decades with proper care. Synthetic saddles are low-maintenance, lighter, and more affordable but have shorter lifespans. Both can be excellent choices depending on your needs.</p>`,

  'boots-rider': `<h3>How to Choose Riding Boots</h3>
<p><strong>Boot Style:</strong> Tall boots (field or dress) are traditional for competition and formal riding. Paddock boots with half chaps offer versatility and easier fit for everyday riding. Jodhpur boots are ankle-height alternatives.</p>
<p><strong>Material Choice:</strong> Full-grain leather provides durability and classic appearance but requires 2-3 weeks break-in. Synthetic materials need no break-in, are easy to clean, and cost less but may not last as long.</p>
<p><strong>Fit Considerations:</strong> Measure foot length, calf circumference, and height from floor to back of knee. Most brands offer standard and slim calf widths. Boots should feel snug initially - leather stretches, synthetics don't.</p>
<p><strong>Sole Type:</strong> Rubber soles provide grip and durability. Ensure they're suitable for stirrups (not too thick). Some competition rules specify sole requirements - check your discipline's regulations.</p>`,

  'supplements': `<h3>How to Choose Horse Supplements</h3>
<p><strong>Identify the Need:</strong> Joint support for older horses or those in hard work. Digestive aids for sensitive stomachs. Vitamins for horses on limited pasture. Calming supplements for anxious horses. Consult your vet before starting any supplement program.</p>
<p><strong>Form & Palatability:</strong> Powders mix into feed easily. Pellets are convenient and less messy. Liquids offer precise dosing. Pastes are useful for short-term use. Choose a form your horse will accept - even the best supplement won't work if your horse won't eat it.</p>
<p><strong>Quality & Ingredients:</strong> Look for supplements with research-backed ingredients at effective doses. Check for Australian manufacturing standards. Avoid products with excessive fillers. Premium doesn't always mean better - focus on ingredient quality and concentration.</p>
<p><strong>Competition Considerations:</strong> Check FEI and EA prohibited substance lists if competing. Most supplements are competition-safe but rules vary by discipline and level. When in doubt, contact your governing body.</p>`,

  'grooming': `<h3>How to Choose Grooming Tools</h3>
<p><strong>Essential Tools:</strong> Start with basics - curry comb, body brush, dandy brush, mane comb, hoof pick. Complete kits (6-8 tools) offer good value for beginners. Add specialized tools as needed for your horse's coat type and your grooming routine.</p>
<p><strong>Brush Types:</strong> Rubber curry combs loosen dirt and shed hair. Body brushes with soft bristles remove fine dust. Dandy brushes with stiff bristles tackle dried mud. Natural bristles are gentler; synthetic bristles are more durable.</p>
<p><strong>Quality Considerations:</strong> Well-made brushes last years with proper care. Look for secure bristle attachment and comfortable handles. Premium brushes often feature ergonomic designs that reduce hand fatigue during long grooming sessions.</p>
<p><strong>Special Needs:</strong> Sensitive horses need softer brushes. Horses with thick coats benefit from metal curry combs. During Australian fly season, add fly spray and face grooming tools to your kit.</p>`,
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

function addBuyingGuide(description: string, categoryType: string): string {
  const guide = BUYING_GUIDES[categoryType];
  if (!guide) {
    return description;
  }
  
  // Check if buying guide already exists
  if (description.includes('How to Choose')) {
    return description;
  }
  
  // Add before Australian context or at the end
  if (description.includes('<h3>Australian')) {
    return description.replace(
      '<h3>Australian',
      `${guide}\n<h3>Australian`
    );
  } else if (description.includes('<h3>Shop by Category</h3>')) {
    return description.replace(
      '<h3>Shop by Category</h3>',
      `${guide}\n<h3>Shop by Category</h3>`
    );
  } else {
    // Add at the end
    return description + '\n' + guide;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run add-buying-guides -- --dry-run  (preview changes)');
    console.log('  npm run add-buying-guides -- --yes      (apply changes)');
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
  
  // Process each row - only add to level 1 and 2 categories for major types
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path);
    const level = parseInt(row.category_level);
    
    // Only add buying guides to level 1 and 2 categories
    if (categoryType && level <= 2) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addBuyingGuide(oldLongDesc, categoryType);
      
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
  console.log(`\n📝 Changes Preview (showing first 15):\n`);
  changes.slice(0, 15).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Guide: ${change.categoryType}`);
    console.log('');
  });
  
  if (changes.length > 15) {
    console.log(`... and ${changes.length - 15} more changes\n`);
  }
  
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-buying-guides-${timestamp}.csv`);
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
