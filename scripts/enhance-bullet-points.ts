#!/usr/bin/env tsx

/**
 * Script 5: Enhance Bullet Points
 * 
 * Replaces generic bullet points with category-specific features
 * - Adds technical specifications
 * - Includes sizing information
 * - Adds material details
 * 
 * Usage:
 *   npm run enhance-bullets -- --dry-run  (preview changes)
 *   npm run enhance-bullets -- --yes      (apply changes)
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

// Category-specific bullet points
const BULLET_TEMPLATES: Record<string, string[]> = {
  'breeches': [
    '<li><strong>Technical Fabrics:</strong> Four-way stretch with moisture-wicking properties. UPF 50+ sun protection for outdoor riding.</li>',
    '<li><strong>Grip Options:</strong> Full-seat silicone or knee-patch styles available for secure positioning in the saddle.</li>',
    '<li><strong>Sizing:</strong> European sizes 34-46 (AU 6-18). Detailed size charts available for each brand.</li>',
    '<li><strong>Care:</strong> Machine washable cold water. Hang dry to maintain elasticity and grip.</li>',
  ],
  'tights': [
    '<li><strong>Compression Fit:</strong> Supportive four-way stretch fabric that moves with you.</li>',
    '<li><strong>Grip Technology:</strong> Silicone full-seat or knee patches for stability.</li>',
    '<li><strong>Breathable:</strong> Moisture-wicking materials keep you cool and dry.</li>',
    '<li><strong>Versatile:</strong> Perfect for riding, training, or casual wear.</li>',
  ],
  'helmets': [
    '<li><strong>Safety Standards:</strong> Certified to AS/NZS 3838, VG1 or PAS015 standards.</li>',
    '<li><strong>Ventilation:</strong> Strategic air vents for cooling without compromising protection.</li>',
    '<li><strong>Fit Systems:</strong> Adjustable dial or harness systems for secure, custom fit.</li>',
    '<li><strong>Sizing:</strong> Measure head circumference above eyebrows. Size charts provided.</li>',
  ],
  'boots-rider': [
    '<li><strong>Materials:</strong> Full-grain leather or synthetic options for durability.</li>',
    '<li><strong>Fit:</strong> Standard and slim calf widths available. Height options for different leg lengths.</li>',
    '<li><strong>Soles:</strong> Non-slip rubber soles suitable for stirrups and stable work.</li>',
    '<li><strong>Break-in:</strong> Leather boots require 2-3 weeks break-in period. Synthetics ready immediately.</li>',
  ],
  'rugs': [
    '<li><strong>Fill Weights:</strong> 0g (no fill) to 400g for various climates and seasons.</li>',
    '<li><strong>Waterproofing:</strong> Rated in denier (600D-1200D+) and waterproof/breathability ratings.</li>',
    '<li><strong>Sizing:</strong> Measure from center chest to tail. Most brands use cm sizing (4\'0" to 7\'0").</li>',
    '<li><strong>Features:</strong> Leg arches, tail flaps, shoulder gussets, and cross surcingles for fit and security.</li>',
  ],
  'saddles': [
    '<li><strong>Disciplines:</strong> Dressage, jumping, all-purpose, and endurance styles available.</li>',
    '<li><strong>Tree Width:</strong> Narrow, medium, wide, and adjustable options to fit different horses.</li>',
    '<li><strong>Seat Sizes:</strong> Typically 15" to 18" for adults. Measure from pommel to cantle.</li>',
    '<li><strong>Materials:</strong> Leather or synthetic options. Leather requires regular conditioning.</li>',
  ],
  'gloves': [
    '<li><strong>Grip:</strong> Synthetic leather palms or silicone prints for secure rein control.</li>',
    '<li><strong>Breathability:</strong> Mesh panels or perforated materials for ventilation.</li>',
    '<li><strong>Weather Options:</strong> Lightweight summer gloves, insulated winter styles.</li>',
    '<li><strong>Sizing:</strong> Measure hand circumference at widest point. XS to XL available.</li>',
  ],
  'jackets': [
    '<li><strong>Competition Styles:</strong> Tailored show jackets in traditional colors (navy, black, grey).</li>',
    '<li><strong>Technical Features:</strong> Stretch panels, breathable linings, water-resistant finishes.</li>',
    '<li><strong>Fit:</strong> European sizing. Measure chest and arm length for best fit.</li>',
    '<li><strong>Care:</strong> Dry clean only for show jackets. Softshells machine washable.</li>',
  ],
  'grooming': [
    '<li><strong>Brush Types:</strong> Body brushes, dandy brushes, curry combs, mane combs.</li>',
    '<li><strong>Materials:</strong> Natural bristles, synthetic, rubber, and metal options.</li>',
    '<li><strong>Kits:</strong> Complete grooming kits include 6-8 essential tools in carry bag.</li>',
    '<li><strong>Maintenance:</strong> Wash brushes regularly. Replace worn bristles.</li>',
  ],
  'supplements': [
    '<li><strong>Types:</strong> Joint support, digestive health, vitamins, electrolytes, calming.</li>',
    '<li><strong>Forms:</strong> Powders, pellets, liquids, and paste options.</li>',
    '<li><strong>Dosage:</strong> Based on horse weight. Follow manufacturer guidelines.</li>',
    '<li><strong>Results:</strong> Most supplements require 4-6 weeks for visible effects.</li>',
  ],
};

function getCategoryKeywords(urlPath: string): string[] {
  const keywords: string[] = [];
  
  if (urlPath.includes('breech')) keywords.push('breeches');
  if (urlPath.includes('tight')) keywords.push('tights');
  if (urlPath.includes('helmet')) keywords.push('helmets');
  if (urlPath.includes('boot') && urlPath.includes('rider')) keywords.push('boots-rider');
  if (urlPath.includes('rug')) keywords.push('rugs');
  if (urlPath.includes('saddle')) keywords.push('saddles');
  if (urlPath.includes('glove')) keywords.push('gloves');
  if (urlPath.includes('jacket')) keywords.push('jackets');
  if (urlPath.includes('grooming')) keywords.push('grooming');
  if (urlPath.includes('supplement')) keywords.push('supplements');
  
  return keywords;
}

function enhanceBulletPoints(description: string, urlPath: string, h1Title: string): string {
  if (!description || !description.includes('<ul>')) {
    return description;
  }
  
  const keywords = getCategoryKeywords(urlPath);
  if (keywords.length === 0) {
    return description;
  }
  
  // Get relevant bullet points
  const bullets = BULLET_TEMPLATES[keywords[0]] || [];
  if (bullets.length === 0) {
    return description;
  }
  
  // Check if already has specific bullets
  if (description.includes('Four-way stretch') || 
      description.includes('Safety Standards:') ||
      description.includes('Fill Weights:')) {
    return description;
  }
  
  // Find and replace the <ul> section
  const ulMatch = description.match(/<ul>([\s\S]*?)<\/ul>/);
  if (!ulMatch) {
    return description;
  }
  
  const newBullets = bullets.join('\n');
  const newUl = `<ul>\n${newBullets}\n</ul>`;
  
  return description.replace(/<ul>[\s\S]*?<\/ul>/, newUl);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run enhance-bullets -- --dry-run  (preview changes)');
    console.log('  npm run enhance-bullets -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; category: string }> = [];
  
  // Process each row
  for (const row of rows) {
    const oldLongDesc = row.long_description;
    const newLongDesc = enhanceBulletPoints(oldLongDesc, row.url_path, row.h1_title);
    
    if (oldLongDesc !== newLongDesc) {
      changedCount++;
      const keywords = getCategoryKeywords(row.url_path);
      changes.push({
        url: row.url_path,
        category: keywords[0] || 'unknown',
      });
      
      if (!dryRun) {
        row.long_description = newLongDesc;
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 15):\n`);
  changes.slice(0, 15).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Category: ${change.category}`);
    console.log('');
  });
  
  if (changes.length > 15) {
    console.log(`... and ${changes.length - 15} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  // Show breakdown by category
  const byCategory: Record<string, number> = {};
  changes.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  });
  
  console.log('\n   Changes by category:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`     ${cat}: ${count}`);
  });
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-enhance-bullets-${timestamp}.csv`);
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
