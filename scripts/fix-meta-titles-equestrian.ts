#!/usr/bin/env tsx

/**
 * Fix Meta Titles - Equestrian Pages
 * 
 * Generates unique, SEO-optimized meta titles that:
 * - Differ from H1 titles
 * - Include subcategories for parent pages
 * - Use semantic keywords and modifiers
 * - Follow E-E-A-T and NLP best practices
 * - Target 60-70 characters (before brand)
 * 
 * Usage:
 *   npm run fix-meta-titles-equestrian -- --dry-run
 *   npm run fix-meta-titles-equestrian
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');
const BRAND_SUFFIX = ' | The Equestrian';

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

// ============================================================================
// CATEGORY-SPECIFIC MODIFIERS AND DESCRIPTORS
// ============================================================================

const CATEGORY_MODIFIERS: Record<string, any> = {
  // SADDLES
  saddles: {
    parent: 'Dressage, Jumping & All-Purpose Saddles',
    leaf: {
      jumping: 'Close Contact Jumping Saddles for Competition',
      dressage: 'Deep Seat Dressage Saddles & Monoflaps',
      'all-purpose': 'Versatile All-Purpose & General Saddles',
      endurance: 'Lightweight Endurance & Trail Saddles',
      western: 'Western Saddles & Ranch Equipment',
      treeless: 'Flexible Treeless Saddles'
    }
  },
  
  // RUGS
  rugs: {
    parent: 'Turnout, Stable & Summer Horse Rugs',
    leaf: {
      summer: 'Lightweight Summer Sheets & Fly Protection',
      winter: 'Heavyweight Winter Turnout Rugs',
      stable: 'Indoor Stable Rugs & Under Rugs',
      turnout: 'Waterproof Turnout Rugs for All Seasons',
      cooler: 'Fleece Coolers & Sweat Sheets',
      combo: 'Combo Neck Rugs & Hoods'
    }
  },
  
  // BOOTS (Horse)
  boots: {
    parent: 'Brushing, Tendon & Travel Boots',
    leaf: {
      jumping: 'Tendon Boots & Strike Protection',
      brushing: 'Brushing Boots for Training & Schooling',
      travel: 'Protective Travel Boots & Bandages',
      bell: 'Bell Boots & Overreach Protection',
      fetlock: 'Fetlock Boots & Hind Protection'
    }
  },
  
  // BRIDLES
  bridles: {
    parent: 'Snaffle, Double & Show Bridles',
    leaf: {
      snaffle: 'Leather Snaffle Bridles & Cavessons',
      double: 'Double Bridles & Weymouth Sets',
      show: 'Competition Show Bridles',
      bitless: 'Bitless Bridles & Hackamores'
    }
  },
  
  // BITS
  bits: {
    parent: 'Snaffle, Pelham & Double Bits',
    leaf: {
      snaffle: 'Gentle Snaffle Bits & Mouthpieces',
      pelham: 'Pelham Bits & Curb Chains',
      double: 'Double Bridle Bits & Bradoons',
      western: 'Western Curb Bits & Shanks'
    }
  },
  
  // HALTERS & LEADS
  halters: {
    parent: 'Headcollars, Show Halters & Lead Ropes',
    leaf: {
      leather: 'Leather Headcollars & Show Halters',
      rope: 'Rope Halters & Training Headcollars',
      leads: 'Lead Ropes & Snap Hooks'
    }
  },
  
  // SADDLE PADS
  pads: {
    parent: 'Saddle Pads, Numnahs & Gel Pads',
    leaf: {
      dressage: 'Dressage Saddle Pads & Square Numnahs',
      jumping: 'Jump Saddle Pads & Close Contact',
      gel: 'Gel Pads & Shock Absorbing Inserts',
      numnah: 'Cotton & Quilted Numnahs',
      wither: 'Wither Relief & Pressure Pads'
    }
  },
  
  // GROOMING
  grooming: {
    parent: 'Brushes, Shampoos & Grooming Kits',
    leaf: {
      brushes: 'Quality Grooming Brushes & Body Brushes',
      shampoo: 'Horse Shampoo & Coat Conditioners',
      'hoof-care': 'Hoof Pick & Hoof Care Products',
      'show-prep': 'Show Preparation & Finishing Products'
    }
  },
  
  // SUPPLEMENTS
  supplements: {
    parent: 'Joint, Calming & Vitamin Supplements',
    leaf: {
      joint: 'Joint Support & Mobility Supplements',
      calming: 'Calming Supplements & Magnesium',
      vitamin: 'Vitamin & Mineral Supplements',
      digestive: 'Digestive Health & Gut Support'
    }
  },
  
  // STABLE & YARD
  stable: {
    parent: 'Feed Buckets, Hay Nets & Stable Supplies',
    leaf: {
      'fly-control': 'Fly Masks, Sprays & Veils',
      feeding: 'Feed Buckets & Water Containers',
      'hay-nets': 'Slow Feed Hay Nets & Bags'
    }
  },
  
  // TRAINING
  training: {
    parent: 'Lunge Lines, Whips & Training Aids',
    leaf: {
      lunge: 'Lunge Lines & Roller Equipment',
      whips: 'Schooling Whips & Lunge Whips',
      'ground-work': 'Ground Work & Natural Horsemanship'
    }
  },
  
  // BREECHES & JODHPURS
  breeches: {
    parent: 'Ladies, Mens & Kids Riding Breeches',
    leaf: {
      ladies: 'Ladies Riding Breeches & Competition Pants',
      mens: 'Mens Breeches & Full Seat Jodhpurs',
      kids: 'Kids Breeches & Junior Riding Pants',
      competition: 'Show Breeches & Competition Jodhpurs'
    }
  },
  
  jodhpurs: {
    parent: 'Kids & Ladies Jodhpurs',
    leaf: {
      kids: 'Kids Jodhpurs & Pony Club Pants',
      ladies: 'Ladies Jodhpurs & Riding Tights'
    }
  },
  
  // HELMETS
  helmets: {
    parent: 'Safety Certified Riding Helmets',
    leaf: {
      show: 'Show Helmets & Skull Caps',
      schooling: 'Schooling Helmets with Ventilation',
      kids: 'Kids Safety Helmets & Adjustable Fit'
    }
  },
  
  // JACKETS
  jackets: {
    parent: 'Show Jackets, Softshells & Rain Jackets',
    leaf: {
      show: 'Competition Show Jackets & Tailcoats',
      softshell: 'Softshell Jackets for Training',
      rain: 'Waterproof Rain Jackets',
      quilted: 'Quilted Gilets & Vests'
    }
  },
  
  // BOOTS (Rider)
  footwear: {
    parent: 'Jodhpur Boots, Long Boots & Riding Shoes',
    leaf: {
      jodhpur: 'Jodhpur Boots & Paddock Boots',
      long: 'Long Riding Boots & Dress Boots',
      yard: 'Yard Boots & Muck Boots'
    }
  },
  
  // TOPS
  tops: {
    parent: 'Polo Shirts, Base Layers & Riding Tops',
    leaf: {
      polo: 'Riding Polo Shirts & Technical Tops',
      competition: 'Competition Shirts & Show Tops',
      'base-layer': 'Base Layers & Thermal Tops'
    }
  },
  
  // GLOVES
  gloves: {
    parent: 'Riding Gloves for All Seasons',
    leaf: {
      summer: 'Summer Riding Gloves & Grip',
      winter: 'Winter Riding Gloves & Thermal',
      competition: 'Show Gloves & Competition'
    }
  }
};

// ============================================================================
// TITLE GENERATION FUNCTIONS
// ============================================================================

/**
 * Build title for parent pages (with child categories)
 */
function buildParentTitle(row: CsvRow, children: CsvRow[]): string {
  const urlPath = row.url_path.toLowerCase();
  const h1Lower = row.h1_title.toLowerCase();
  
  // Check if we have a predefined parent title
  for (const [key, config] of Object.entries(CATEGORY_MODIFIERS)) {
    if (urlPath.includes(key) && config.parent) {
      return config.parent;
    }
  }
  
  // Fallback: Use top 3 children
  if (children.length > 0) {
    const topChildren = children
      .slice(0, 3)
      .map(c => c.breadcrumb_label || c.h1_title)
      .join(', ');
    
    // Add parent category at end
    const parentCategory = row.h1_title;
    return `${topChildren} & More ${parentCategory}`;
  }
  
  // Ultimate fallback
  return `Quality ${row.h1_title} for All Disciplines`;
}

/**
 * Build title for leaf pages (no children)
 */
function buildLeafTitle(row: CsvRow): string {
  const urlPath = row.url_path.toLowerCase();
  const h1Lower = row.h1_title.toLowerCase();
  
  // Check category-specific modifiers
  for (const [categoryKey, config] of Object.entries(CATEGORY_MODIFIERS)) {
    if (urlPath.includes(categoryKey) && config.leaf) {
      // Find matching leaf pattern
      for (const [leafKey, leafTitle] of Object.entries(config.leaf)) {
        if (urlPath.includes(leafKey.toLowerCase()) || h1Lower.includes(leafKey.toLowerCase())) {
          return leafTitle as string;
        }
      }
    }
  }
  
  // Fallback patterns based on keywords (avoid duplication)
  if (h1Lower.includes('ladies') || h1Lower.includes('womens')) {
    // Don't add "Ladies" if already in title
    if (h1Lower.startsWith('ladies') || h1Lower.startsWith('womens')) {
      return `${row.h1_title} for Riding & Competition`;
    }
    return `Ladies ${row.h1_title} for Riding & Competition`;
  }
  if (h1Lower.includes('mens') || h1Lower.includes('men')) {
    // Don't add "Mens" if already in title
    if (h1Lower.startsWith('mens') || h1Lower.startsWith('men')) {
      return `${row.h1_title} for All Disciplines`;
    }
    return `Mens ${row.h1_title} for All Disciplines`;
  }
  if (h1Lower.includes('kids') || h1Lower.includes('children') || h1Lower.includes('junior')) {
    // Don't add "Kids" if already in title
    if (h1Lower.startsWith('kids') || h1Lower.startsWith('children') || h1Lower.startsWith('junior')) {
      return `${row.h1_title} & Junior Equipment`;
    }
    return `Kids ${row.h1_title} & Junior Equipment`;
  }
  if (h1Lower.includes('show') || h1Lower.includes('competition')) {
    return `${row.h1_title} for Competition & Events`;
  }
  
  // Generic descriptive fallback
  return `${row.h1_title} for Horses & Riders`;
}

/**
 * Generate SEO-optimized title
 */
function generateSEOTitle(row: CsvRow, allRows: CsvRow[]): string {
  // Skip pet pages
  if (row.url_path.startsWith('/pet')) {
    return row.meta_title;
  }
  
  // Get child categories
  const children = allRows.filter(r => r.parent_url === row.url_path);
  
  let titleBase: string;
  
  if (children.length > 0) {
    // Parent page - include subcategories
    titleBase = buildParentTitle(row, children);
  } else {
    // Leaf page - use descriptive modifiers
    titleBase = buildLeafTitle(row);
  }
  
  // Ensure it fits (target 60-70 chars before brand)
  const maxLength = 70;
  if (titleBase.length > maxLength) {
    // Truncate intelligently at word boundary
    titleBase = titleBase.substring(0, maxLength).split(' ').slice(0, -1).join(' ');
  }
  
  // Add brand suffix
  return titleBase + BRAND_SUFFIX;
}

/**
 * Validate title quality
 */
function validateTitle(title: string, h1: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const titleWithoutBrand = title.replace(BRAND_SUFFIX, '');
  
  // Check length
  if (titleWithoutBrand.length < 30) {
    issues.push('Too short (< 30 chars)');
  }
  if (titleWithoutBrand.length > 70) {
    issues.push('Too long (> 70 chars)');
  }
  
  // Check if identical to H1
  if (title === h1 || title === h1 + BRAND_SUFFIX) {
    issues.push('Identical to H1');
  }
  
  // Check for generic phrases
  if (title.includes('Premium Quality') || title.includes('Buy Online')) {
    issues.push('Contains generic phrase');
  }
  
  // Check for redundant prefixes
  if (title.match(/^[A-Z]+:/)) {
    issues.push('Has redundant prefix (e.g., "SADDLES:")');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, allRows: CsvRow[], dryRun: boolean): Promise<boolean> {
  // Skip pet pages
  if (row.url_path.startsWith('/pet')) {
    return false;
  }
  
  const oldTitle = row.meta_title;
  const newTitle = generateSEOTitle(row, allRows);
  
  // Check if change is needed
  if (oldTitle === newTitle) {
    return false;
  }
  
  // Validate old title
  const oldValidation = validateTitle(oldTitle, row.h1_title);
  
  // Skip if old title is already good
  if (oldValidation.valid && oldTitle.length >= 50 && oldTitle.length <= 80) {
    return false;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${row.url_path}`);
  console.log(`   H1: ${row.h1_title}`);
  console.log(`   OLD: ${oldTitle} (${oldTitle.length} chars)`);
  if (oldValidation.issues.length > 0) {
    console.log(`   Issues: ${oldValidation.issues.join(', ')}`);
  }
  console.log(`   NEW: ${newTitle} (${newTitle.length} chars)`);
  
  if (!dryRun) {
    row.meta_title = newTitle;
  }
  
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n📝 FIX META TITLES - EQUESTRIAN PAGES\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-meta-titles-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
  
  // Load CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  // Process pages
  let processed = 0;
  let changed = 0;
  
  for (const row of rows) {
    if (!row.url_path.startsWith('/pet')) {
      processed++;
      const wasChanged = await processPage(row, rows, dryRun);
      if (wasChanged) changed++;
    }
  }
  
  // Save if not dry run
  if (!dryRun && changed > 0) {
    const output = stringify(rows, { header: true });
    fs.writeFileSync(CSV_PATH, output);
    console.log(`\n✅ Saved changes to ${CSV_PATH}`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`Pages processed: ${processed}`);
  console.log(`Meta titles changed: ${changed}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
