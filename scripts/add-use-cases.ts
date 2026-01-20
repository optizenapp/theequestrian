#!/usr/bin/env tsx

/**
 * Script 9: Add Use Cases
 * 
 * Adds "Perfect For" or "When to Use" sections
 * - Lists specific use cases and scenarios
 * - Provides discipline-specific recommendations
 * - Includes seasonal guidance
 * 
 * Usage:
 *   npm run add-use-cases -- --dry-run  (preview changes)
 *   npm run add-use-cases -- --yes      (apply changes)
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

// Use case templates
const USE_CASES: Record<string, string> = {
  'breeches': `<h3>Perfect For</h3>
<ul>
<li><strong>Dressage:</strong> Full-seat breeches provide maximum grip for precise seat aids and long training sessions. Look for styles with minimal external seams for a clean look under tall boots.</li>
<li><strong>Jumping:</strong> Knee-patch breeches offer freedom of movement in jumping position. Reinforced inner legs withstand stirrup leather friction during courses.</li>
<li><strong>Trail Riding:</strong> Comfortable, durable breeches with UPF protection for long hours outdoors. Moisture-wicking fabrics keep you cool on Australian trails.</li>
<li><strong>Competition:</strong> Tailored styles in traditional colors (white, beige, navy) meet dress code requirements. Premium fabrics maintain appearance through long competition days.</li>
</ul>`,

  'helmets': `<h3>Perfect For</h3>
<ul>
<li><strong>Competition:</strong> Traditional velvet or suede finishes for dressage and showing. Modern designs with superior ventilation for jumping and eventing.</li>
<li><strong>Training:</strong> Durable helmets with excellent ventilation for daily riding in Australian conditions. Easy-clean liners for frequent use.</li>
<li><strong>Trail Riding:</strong> Lightweight designs with maximum airflow for long rides. Visors provide sun protection on bright days.</li>
<li><strong>Beginners:</strong> Affordable options meeting all safety standards. Dial-adjust systems make fitting easier for growing riders.</li>
</ul>`,

  'rugs': `<h3>When to Use</h3>
<ul>
<li><strong>Summer (0-100g):</strong> Lightweight sheets protect from flies and sun. Mesh rugs provide maximum airflow for hot Australian summers. Essential October-April in most regions.</li>
<li><strong>Autumn/Spring (100-200g):</strong> Medium-weight rugs for cool mornings and evenings. Ideal for clipped horses or those in lighter work during transitional seasons.</li>
<li><strong>Winter (200-400g):</strong> Heavy rugs for southern regions and clipped horses. Layering systems allow adjustment as temperatures change throughout the day.</li>
<li><strong>Stable vs Turnout:</strong> Waterproof turnout rugs for paddock use in all weather. Stable rugs for indoor warmth without waterproofing. Most horses need both types.</li>
</ul>`,

  'saddles': `<h3>Perfect For</h3>
<ul>
<li><strong>Dressage:</strong> Deep-seated dressage saddles support correct position and effective aids. Straight flaps accommodate longer stirrup length for classical seat.</li>
<li><strong>Jumping:</strong> Forward-cut jumping saddles with knee rolls support shorter stirrups and jumping position. Close contact designs enhance feel and communication.</li>
<li><strong>All-Purpose Riding:</strong> Versatile all-purpose saddles suitable for flatwork, jumping, and trail riding. Ideal for riders participating in multiple disciplines.</li>
<li><strong>Endurance & Trail:</strong> Comfortable designs for long hours in the saddle. Lightweight construction reduces horse fatigue on extended rides.</li>
</ul>`,

  'boots-rider': `<h3>Perfect For</h3>
<ul>
<li><strong>Competition:</strong> Tall leather boots (field or dress) provide traditional appearance required in many disciplines. Polished finish for formal presentation.</li>
<li><strong>Daily Riding:</strong> Paddock boots with half chaps offer versatility and comfort for everyday training. Easy on/off for quick barn visits.</li>
<li><strong>Beginners:</strong> Affordable paddock boots allow riders to start without major investment. Synthetic options require no break-in period.</li>
<li><strong>Multiple Horses:</strong> Quick-change paddock boots convenient when riding several horses. Less formal but practical for busy training schedules.</li>
</ul>`,

  'grooming': `<h3>Perfect For</h3>
<ul>
<li><strong>Daily Care:</strong> Essential grooming tools for routine maintenance. Curry comb, body brush, and hoof pick form the core of daily grooming.</li>
<li><strong>Show Preparation:</strong> Specialized tools for competition turnout. Finishing brushes, mane combs, and coat polish create show-ring ready appearance.</li>
<li><strong>Fly Season:</strong> Grooming combined with fly spray application essential October-April in Australia. Face grooming tools for sensitive areas.</li>
<li><strong>Shedding Season:</strong> Shedding blades and rubber curry combs efficiently remove loose hair during seasonal coat changes. Extra grooming needed spring and autumn.</li>
</ul>`,

  'supplements': `<h3>When to Use</h3>
<ul>
<li><strong>Joint Support:</strong> Older horses, those in hard work, or with arthritis benefit from glucosamine and chondroitin supplements. Start before problems develop for best results.</li>
<li><strong>Digestive Health:</strong> Horses with sensitive stomachs, those on high-grain diets, or prone to ulcers. Probiotics support healthy gut function.</li>
<li><strong>Competition:</strong> Calming supplements for anxious horses. Electrolytes for horses in hard work, especially during Australian summers. Check competition rules before use.</li>
<li><strong>Limited Pasture:</strong> Vitamin and mineral supplements for horses with restricted grazing. Essential in drought conditions or for horses on hay-only diets.</li>
</ul>`,
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

function addUseCases(description: string, categoryType: string): string {
  const useCases = USE_CASES[categoryType];
  if (!useCases) {
    return description;
  }
  
  // Check if use cases already exist
  if (description.includes('Perfect For') || description.includes('When to Use')) {
    return description;
  }
  
  // Add after buying guide or before Australian context
  if (description.includes('<h3>Australian')) {
    return description.replace(
      '<h3>Australian',
      `${useCases}\n<h3>Australian`
    );
  } else if (description.includes('<h3>Shop by Category</h3>')) {
    return description.replace(
      '<h3>Shop by Category</h3>',
      `${useCases}\n<h3>Shop by Category</h3>`
    );
  } else {
    // Add at the end
    return description + '\n' + useCases;
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run add-use-cases -- --dry-run  (preview changes)');
    console.log('  npm run add-use-cases -- --yes      (apply changes)');
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
    
    // Only add use cases to level 1 and 2 categories
    if (categoryType && level <= 2) {
      const oldLongDesc = row.long_description;
      const newLongDesc = addUseCases(oldLongDesc, categoryType);
      
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
    console.log(`   Use cases: ${change.categoryType}`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-use-cases-${timestamp}.csv`);
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
