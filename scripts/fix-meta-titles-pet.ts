#!/usr/bin/env tsx

/**
 * Fix Meta Titles - Pet Pages
 * 
 * Generates unique, SEO-optimized meta titles for pet pages that:
 * - Differ from H1 titles
 * - Include subcategories for parent pages
 * - Use pet-specific semantic keywords
 * - Target 60-70 characters (before brand)
 * 
 * Usage:
 *   npm run fix-meta-titles-pet -- --dry-run
 *   npm run fix-meta-titles-pet
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
// PET-SPECIFIC MODIFIERS AND DESCRIPTORS
// ============================================================================

const PET_MODIFIERS: Record<string, any> = {
  // DOG PRODUCTS
  dog: {
    parent: 'Dog Food, Toys, Treats & Care Supplies',
    leaf: {
      'collars-and-leads': 'Dog Collars, Leads & Walking Harnesses',
      toys: 'Interactive Dog Toys & Chew Toys',
      treats: 'Natural Dog Treats & Training Rewards',
      grooming: 'Dog Grooming Supplies & Coat Care',
      food: 'Premium Dog Food & Nutrition',
      accessories: 'Dog Accessories & Care Essentials',
      bedding: 'Comfortable Dog Beds & Sleeping',
      supplements: 'Dog Health Supplements & Vitamins',
      walking: 'Dog Walking Gear & Exercise Equipment',
      'coats-and-rugs': 'Dog Coats, Jackets & Weather Protection',
      kennels: 'Dog Kennels, Carriers & Travel Crates',
      'skin-care': 'Dog Skin Care & Grooming Products',
      veterinary: 'Dog Flea, Tick & Worm Treatments'
    }
  },
  
  // CAT PRODUCTS
  cat: {
    parent: 'Cat Food, Toys, Litter & Care Products',
    leaf: {
      toys: 'Interactive Cat Toys & Climbing Gyms',
      food: 'Premium Cat Food & Treats',
      litter: 'Clumping & Natural Cat Litter Options',
      accessories: 'Cat Accessories & Care Essentials',
      'skin-care': 'Cat Grooming & Skin Care Products'
    }
  },
  
  // BIRD PRODUCTS
  bird: {
    parent: 'Bird Food, Toys, Cages & Care Supplies',
    leaf: {
      toys: 'Interactive Bird Toys & Enrichment',
      cages: 'Bird Cages, Aviaries & Furniture',
      food: 'Nutritious Bird Food & Seed Mixes',
      care: 'Bird Health Care & Grooming Products'
    }
  },
  
  // SMALL ANIMALS
  'small-animal': {
    parent: 'Small Animal Food, Bedding & Supplies',
    leaf: {}
  },
  
  // POULTRY
  poultry: {
    parent: 'Poultry Food, Feeders & Care Products',
    leaf: {}
  },
  
  // PET SUPPLEMENTS
  supplements: {
    parent: 'Pet Supplements for Health & Wellness',
    leaf: {
      probiotics: 'Pet Probiotics & Digestive Health'
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
  
  // Check if we have a predefined parent title
  for (const [key, config] of Object.entries(PET_MODIFIERS)) {
    if (urlPath.includes(key) && config.parent) {
      return config.parent;
    }
  }
  
  // Fallback: Use top 3-4 children
  if (children.length > 0) {
    const topChildren = children
      .slice(0, 4)
      .map(c => c.breadcrumb_label || c.h1_title)
      .join(', ');
    
    return `${topChildren} & More`;
  }
  
  // Ultimate fallback
  return `Quality ${row.h1_title} Products & Supplies`;
}

/**
 * Build title for leaf pages (no children)
 */
function buildLeafTitle(row: CsvRow): string {
  const urlPath = row.url_path.toLowerCase();
  const h1Lower = row.h1_title.toLowerCase();
  
  // Check pet-specific modifiers
  for (const [petKey, config] of Object.entries(PET_MODIFIERS)) {
    if (urlPath.includes(petKey) && config.leaf) {
      // Find matching leaf pattern
      for (const [leafKey, leafTitle] of Object.entries(config.leaf)) {
        if (urlPath.includes(leafKey)) {
          return leafTitle as string;
        }
      }
    }
  }
  
  // Fallback patterns based on pet type
  if (urlPath.includes('/dog')) {
    if (h1Lower.includes('collar')) return 'Dog Collars & Leads for Training';
    if (h1Lower.includes('toy')) return 'Engaging Dog Toys & Play Equipment';
    if (h1Lower.includes('treat')) return 'Healthy Dog Treats & Rewards';
    if (h1Lower.includes('food')) return 'Nutritious Dog Food & Meals';
    if (h1Lower.includes('bed')) return 'Comfortable Dog Beds & Cushions';
    if (h1Lower.includes('groom')) return 'Dog Grooming Tools & Products';
    return `Quality ${row.h1_title} for Dogs`;
  }
  
  if (urlPath.includes('/cat')) {
    if (h1Lower.includes('toy')) return 'Cat Toys & Interactive Play';
    if (h1Lower.includes('food')) return 'Premium Cat Food & Nutrition';
    if (h1Lower.includes('litter')) return 'Cat Litter & Odor Control';
    return `Quality ${row.h1_title} for Cats`;
  }
  
  if (urlPath.includes('/bird')) {
    if (h1Lower.includes('toy')) return 'Bird Toys & Mental Enrichment';
    if (h1Lower.includes('cage')) return 'Spacious Bird Cages & Aviaries';
    if (h1Lower.includes('food')) return 'Nutritious Bird Food & Treats';
    return `Quality ${row.h1_title} for Birds`;
  }
  
  // Generic pet fallback
  return `${row.h1_title} Products & Supplies`;
}

/**
 * Generate SEO-optimized title
 */
function generateSEOTitle(row: CsvRow, allRows: CsvRow[]): string {
  // Only process pet pages
  if (!row.url_path.startsWith('/pet')) {
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
  
  return {
    valid: issues.length === 0,
    issues
  };
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, allRows: CsvRow[], dryRun: boolean): Promise<boolean> {
  // Only process pet pages
  if (!row.url_path.startsWith('/pet')) {
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
  console.log(`🐾 ${row.url_path}`);
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
  
  console.log('\n🐾 FIX META TITLES - PET PAGES\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-meta-titles-pet-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
  
  // Load CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  // Filter to only pet pages
  const petPages = rows.filter(r => r.url_path.startsWith('/pet'));
  console.log(`📊 Found ${petPages.length} pet pages\n`);
  
  // Process pages
  let processed = 0;
  let changed = 0;
  
  for (const row of petPages) {
    processed++;
    const wasChanged = await processPage(row, rows, dryRun);
    if (wasChanged) changed++;
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
  console.log(`Pet pages processed: ${processed}`);
  console.log(`Meta titles changed: ${changed}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
