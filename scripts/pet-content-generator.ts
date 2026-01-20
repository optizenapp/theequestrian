#!/usr/bin/env tsx

/**
 * Pet Content Generator
 * 
 * Specialized script for /pet pages with pet-appropriate content
 * - No "competing or riding" language
 * - Pet-specific features and benefits
 * - Proper product types from Shopify
 * 
 * Usage:
 *   npm run generate-pet-content -- --dry-run
 *   npm run generate-pet-content
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { getProductTypesForCollection } from '../lib/mapping/collection-mapping';

const CSV_PATH = path.join(process.cwd(), 'exports', 'collection-content.csv');

// ============================================================================
// INTERFACES
// ============================================================================

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

interface FAQItem {
  question: string;
  answer: string;
}

// ============================================================================
// PET-SPECIFIC CONTENT GENERATION
// ============================================================================

/**
 * Get actual product types from Shopify mapping
 */
function getActualProductTypes(urlPath: string): string[] {
  const parts = urlPath.split('/').filter(p => p);
  
  if (parts.length === 0) return [];
  
  const category = parts[0];
  const subcategory = parts[1] || undefined;
  const subsubcategory = parts[2] || undefined;
  
  try {
    const productTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
    console.log(`      📦 Product types: [${productTypes.slice(0, 3).join(', ')}${productTypes.length > 3 ? '...' : ''}]`);
    return productTypes;
  } catch (error) {
    return [];
  }
}

/**
 * Generate meta description for pet products
 */
function generateMetaDescription(row: CsvRow): string {
  const productTypes = getActualProductTypes(row.url_path);
  
  if (productTypes.length > 0) {
    const friendlyNames = productTypes.map(pt => {
      return pt.replace(/^(DOG|CAT|BIRD|PET):\s*/i, '').toLowerCase();
    });
    
    const uniqueNames = [...new Set(friendlyNames)].slice(0, 4);
    const productList = uniqueNames.join(', ');
    
    const desc = `Shop premium ${row.h1_title.toLowerCase()} including ${productList}. Free shipping Australia-wide. Expert pet advice available.`;
    
    if (desc.length < 150) {
      return desc + ' Find quality products for your pet.';
    }
    if (desc.length > 160) {
      return desc.substring(0, 157) + '...';
    }
    return desc;
  }
  
  // Fallback
  return `Shop premium ${row.h1_title.toLowerCase()} from trusted brands. Free shipping Australia-wide. Expert pet advice available.`;
}

/**
 * Generate short description for pet products
 */
function generateShortDescription(row: CsvRow): string {
  const petType = row.url_path.includes('/dog') ? 'dog' : 
                  row.url_path.includes('/cat') ? 'cat' :
                  row.url_path.includes('/bird') ? 'bird' : 'pet';
  
  const descriptions = {
    dog: 'Expertly selected for quality, durability, and performance. Whether you\'re training, walking, or caring for your dog, find exactly what you need at The Equestrian.',
    cat: 'Expertly selected for quality and your cat\'s happiness. From playtime to care essentials, find everything your cat needs at The Equestrian.',
    bird: 'Expertly selected for quality and your bird\'s wellbeing. From toys to nutrition, find everything your bird needs at The Equestrian.',
    pet: 'Expertly selected for quality and your pet\'s wellbeing. Find exactly what your pet needs at The Equestrian.'
  };
  
  return descriptions[petType] || descriptions.pet;
}

/**
 * Generate long description HTML for pet products
 */
function generateLongDescription(row: CsvRow, allRows: CsvRow[]): string {
  const petType = row.url_path.includes('/dog') ? 'dog' : 
                  row.url_path.includes('/cat') ? 'cat' :
                  row.url_path.includes('/bird') ? 'bird' : 'pet';
  
  let html = `<h2>Quality ${row.h1_title}</h2>\n`;
  
  // Opening paragraph
  const openingParagraphs = {
    dog: `<p>Discover our comprehensive collection of ${row.h1_title.toLowerCase()}, carefully curated to meet the needs of dog owners and their four-legged friends. From training essentials to everyday care, we stock only trusted brands known for quality, safety, and durability. All products in stock and ready to ship Australia-wide.</p>`,
    cat: `<p>Explore our carefully selected range of ${row.h1_title.toLowerCase()}, designed to keep your cat happy and healthy. We stock only trusted brands known for quality and feline-friendly design. All products in stock and ready to ship Australia-wide.</p>`,
    bird: `<p>Browse our specialized collection of ${row.h1_title.toLowerCase()}, chosen for quality and bird wellbeing. From enrichment to nutrition, we stock trusted brands. All products in stock and ready to ship Australia-wide.</p>`,
    pet: `<p>Discover our comprehensive pet collection, carefully curated for quality and pet wellbeing. We stock only trusted brands. All products in stock and ready to ship Australia-wide.</p>`
  };
  
  html += openingParagraphs[petType] || openingParagraphs.pet;
  
  // Features section
  html += `<h3>What Makes Great ${row.h1_title}?</h3>\n`;
  html += '<ul>\n';
  
  const features = getPetFeatures(row);
  features.forEach(feature => {
    html += `<li>${feature}</li>\n`;
  });
  html += '</ul>\n';
  
  // Internal links to child categories
  const childCategories = allRows.filter(r => r.parent_url === row.url_path);
  if (childCategories.length > 0) {
    html += '<h3>Shop by Category</h3>\n';
    html += '<p>Browse our specialized categories including ';
    
    const links = childCategories.slice(0, 5).map(child => {
      const label = child.breadcrumb_label || child.h1_title;
      return `<a href="${child.url_path}">${label.toLowerCase()}</a>`;
    });
    
    html += links.join(', ');
    html += '. Each category features products from trusted pet brands.</p>\n';
  }
  
  return html;
}

/**
 * Get pet-specific features based on category
 */
function getPetFeatures(row: CsvRow): string[] {
  const lowerTitle = row.h1_title.toLowerCase();
  const urlPath = row.url_path.toLowerCase();
  
  // DOG PRODUCTS
  if (urlPath.includes('/dog')) {
    if (lowerTitle.includes('collar') || lowerTitle.includes('lead') || lowerTitle.includes('harness')) {
      return [
        '<strong>Durable Construction:</strong> Built to withstand daily walks and outdoor adventures',
        '<strong>Comfortable Fit:</strong> Soft materials that won\'t irritate your dog\'s skin',
        '<strong>Safety Features:</strong> Secure buckles and reinforced stitching for peace of mind',
        '<strong>Easy to Clean:</strong> Materials that are simple to wash and maintain'
      ];
    }
    if (lowerTitle.includes('toy')) {
      return [
        '<strong>Engaging Design:</strong> Interactive features that keep your dog entertained and mentally stimulated',
        '<strong>Safe Materials:</strong> Non-toxic, pet-safe construction for worry-free play',
        '<strong>Durable Quality:</strong> Built to withstand enthusiastic chewing and play sessions',
        '<strong>Size Options:</strong> Appropriate choices for different breeds and play styles'
      ];
    }
    if (lowerTitle.includes('treat')) {
      return [
        '<strong>Natural Ingredients:</strong> Quality nutrition without artificial additives or fillers',
        '<strong>Tasty Flavors:</strong> Delicious options your dog will love as rewards or snacks',
        '<strong>Health Benefits:</strong> Supports dental health, digestion, and overall wellbeing',
        '<strong>Australian Made:</strong> Many locally sourced and produced options available'
      ];
    }
    if (lowerTitle.includes('groom')) {
      return [
        '<strong>Professional Quality:</strong> Tools and products trusted by groomers and pet owners',
        '<strong>Gentle Formulas:</strong> Safe for your dog\'s skin and coat',
        '<strong>Easy to Use:</strong> Designed for effective results at home',
        '<strong>Complete Care:</strong> Everything needed for a healthy, shiny coat'
      ];
    }
    if (lowerTitle.includes('food')) {
      return [
        '<strong>Nutritionally Balanced:</strong> Complete meals formulated for your dog\'s health',
        '<strong>Quality Ingredients:</strong> Premium proteins, grains, and nutrients',
        '<strong>Life Stage Options:</strong> Appropriate nutrition for puppies, adults, and seniors',
        '<strong>Trusted Brands:</strong> Products from manufacturers known for pet nutrition'
      ];
    }
    if (lowerTitle.includes('bed')) {
      return [
        '<strong>Comfortable Support:</strong> Cushioning that supports joints and muscles',
        '<strong>Durable Fabrics:</strong> Materials that withstand scratching and nesting',
        '<strong>Easy Maintenance:</strong> Washable covers for hygiene and freshness',
        '<strong>Size Options:</strong> Appropriate beds for all dog breeds and sizes'
      ];
    }
    // Generic dog products
    return [
      '<strong>Premium Quality:</strong> Expertly selected products for your dog\'s comfort and happiness',
      '<strong>Trusted Brands:</strong> Products from manufacturers known for pet safety and quality',
      '<strong>Practical Design:</strong> Thoughtfully engineered for both pets and owners',
      '<strong>Great Value:</strong> Durable products that provide long-lasting use'
    ];
  }
  
  // CAT PRODUCTS
  if (urlPath.includes('/cat')) {
    if (lowerTitle.includes('toy')) {
      return [
        '<strong>Stimulating Play:</strong> Interactive designs that engage your cat\'s natural hunting instincts',
        '<strong>Safe Materials:</strong> Non-toxic, cat-safe construction for peace of mind',
        '<strong>Variety of Options:</strong> Toys for different play preferences and activity levels',
        '<strong>Durable Quality:</strong> Built to withstand enthusiastic play and pouncing'
      ];
    }
    if (lowerTitle.includes('litter')) {
      return [
        '<strong>Odor Control:</strong> Advanced formulas that neutralize unpleasant smells',
        '<strong>Easy to Clean:</strong> Clumping or easy-scoop options for simple maintenance',
        '<strong>Low Dust:</strong> Healthier for both cats and owners',
        '<strong>Economical:</strong> Long-lasting products that provide great value'
      ];
    }
    if (lowerTitle.includes('food')) {
      return [
        '<strong>Complete Nutrition:</strong> Balanced meals formulated for feline health',
        '<strong>Quality Proteins:</strong> Real meat and fish for obligate carnivores',
        '<strong>Life Stage Options:</strong> Appropriate nutrition for kittens, adults, and seniors',
        '<strong>Palatable Flavors:</strong> Delicious options even fussy cats will enjoy'
      ];
    }
    // Generic cat products
    return [
      '<strong>Premium Quality:</strong> Expertly selected products for your cat\'s comfort and happiness',
      '<strong>Trusted Brands:</strong> Products from manufacturers known for feline health and safety',
      '<strong>Cat-Friendly Design:</strong> Thoughtfully engineered for feline needs and behavior',
      '<strong>Great Value:</strong> Durable products that provide long-lasting use'
    ];
  }
  
  // BIRD PRODUCTS
  if (urlPath.includes('/bird')) {
    if (lowerTitle.includes('toy')) {
      return [
        '<strong>Mental Enrichment:</strong> Toys that challenge and stimulate your bird\'s intelligence',
        '<strong>Safe Materials:</strong> Non-toxic, bird-safe construction',
        '<strong>Variety:</strong> Options for foraging, chewing, and interactive play',
        '<strong>Durable Quality:</strong> Built to withstand beaks and claws'
      ];
    }
    if (lowerTitle.includes('cage')) {
      return [
        '<strong>Spacious Design:</strong> Adequate room for movement and wing stretching',
        '<strong>Safe Construction:</strong> Appropriate bar spacing and non-toxic materials',
        '<strong>Easy Maintenance:</strong> Removable trays and accessible cleaning',
        '<strong>Quality Build:</strong> Sturdy construction for long-lasting use'
      ];
    }
    if (lowerTitle.includes('food')) {
      return [
        '<strong>Nutritionally Complete:</strong> Balanced nutrition for avian health',
        '<strong>Species-Specific:</strong> Formulas appropriate for different bird types',
        '<strong>Fresh Quality:</strong> Premium seeds, pellets, and supplements',
        '<strong>Variety:</strong> Multiple options to keep your bird interested'
      ];
    }
    // Generic bird products
    return [
      '<strong>Premium Quality:</strong> Expertly selected products for your bird\'s wellbeing',
      '<strong>Trusted Brands:</strong> Products from manufacturers known for avian care',
      '<strong>Bird-Safe Design:</strong> Thoughtfully chosen for feathered friends',
      '<strong>Great Value:</strong> Quality products at competitive prices'
    ];
  }
  
  // GENERIC PET PRODUCTS
  return [
    '<strong>Premium Quality:</strong> Expertly selected products for your pet\'s comfort and happiness',
    '<strong>Trusted Brands:</strong> Products from manufacturers known for pet safety and quality',
    '<strong>Practical Design:</strong> Thoughtfully engineered for pets and their owners',
    '<strong>Great Value:</strong> Durable products that provide long-lasting use'
  ];
}

/**
 * Generate pet-specific FAQs
 */
function generateFAQs(row: CsvRow): FAQItem[] {
  const petType = row.url_path.includes('/dog') ? 'dog' : 
                  row.url_path.includes('/cat') ? 'cat' :
                  row.url_path.includes('/bird') ? 'bird' : 'pet';
  
  return [
    {
      question: `What ${row.h1_title.toLowerCase()} do you stock?`,
      answer: `We stock a comprehensive range of ${row.h1_title.toLowerCase()} from leading pet brands. All products are carefully selected for quality, safety, and ${petType} wellbeing. Browse our collection to find exactly what you need.`
    },
    {
      question: `Do you offer free shipping on ${row.h1_title.toLowerCase()}?`,
      answer: `Yes! We offer free shipping Australia-wide on all orders. Most orders are dispatched within 24 hours, so you'll receive your ${row.h1_title.toLowerCase()} quickly.`
    }
  ];
}

// ============================================================================
// VALIDATION
// ============================================================================

function validatePetContent(row: CsvRow): { issues: string[]; score: number } {
  const issues: string[] = [];
  
  // Check for equestrian language in pet pages
  if (row.short_description && row.short_description.includes('riding')) {
    issues.push('Short description contains "riding" (inappropriate for pets)');
  }
  if (row.short_description && row.short_description.includes('competing')) {
    issues.push('Short description contains "competing" (inappropriate for pets)');
  }
  if (row.long_description && row.long_description.includes('equestrian')) {
    issues.push('Long description contains "equestrian" (inappropriate for pets)');
  }
  if (row.long_description && row.long_description.includes('saddle')) {
    issues.push('Long description contains "saddle" (inappropriate for pets)');
  }
  
  // Check meta description length
  if (!row.meta_description || row.meta_description.length < 140) {
    issues.push('Meta description too short (< 140 chars)');
  }
  if (row.meta_description && row.meta_description.length > 165) {
    issues.push('Meta description too long (> 165 chars)');
  }
  
  // Check short description
  if (!row.short_description || row.short_description.length < 50) {
    issues.push('Short description too short or missing');
  }
  
  // Check long description
  if (!row.long_description || row.long_description.length < 200) {
    issues.push('Long description too short or missing');
  }
  
  const score = Math.max(0, 100 - (issues.length * 15));
  return { issues, score };
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPetPage(row: CsvRow, allRows: CsvRow[], dryRun: boolean): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Processing: ${row.url_path}`);
  console.log(`   H1: ${row.h1_title}`);
  
  // Validate current content
  const before = validatePetContent(row);
  console.log(`   📊 Current score: ${before.score}/100`);
  
  if (before.issues.length > 0) {
    console.log(`   ⚠️  Issues found:`);
    before.issues.forEach(issue => console.log(`      - ${issue}`));
  }
  
  if (before.score >= 90 && before.issues.length === 0) {
    console.log(`   ✅ Content already excellent, skipping`);
    return false;
  }
  
  console.log(`   🔧 Fixing content...`);
  
  // Generate new content
  const newMetaDescription = generateMetaDescription(row);
  const newShortDescription = generateShortDescription(row);
  const newLongDescription = generateLongDescription(row, allRows);
  const newFAQs = generateFAQs(row);
  
  // Apply changes
  if (!dryRun) {
    row.meta_description = newMetaDescription;
    row.short_description = newShortDescription;
    row.long_description = newLongDescription;
    row.faq_json = JSON.stringify(newFAQs);
  }
  
  // Validate after
  const after = validatePetContent(row);
  console.log(`   📊 New score: ${after.score}/100 ${after.score >= before.score ? '✅' : '⚠️'}`);
  
  if (dryRun) {
    console.log(`\n   --- BEFORE vs AFTER ---`);
    console.log(`   OLD Short: ${row.short_description.substring(0, 80)}...`);
    console.log(`   NEW Short: ${newShortDescription.substring(0, 80)}...`);
    console.log(`\n   OLD Meta: ${row.meta_description.substring(0, 80)}...`);
    console.log(`   NEW Meta: ${newMetaDescription.substring(0, 80)}...`);
  }
  
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n🐾 PET CONTENT GENERATOR\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-pet-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
  
  // Load CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  // Filter to only /pet pages
  const petPages = rows.filter(r => r.url_path.startsWith('/pet'));
  console.log(`📊 Found ${petPages.length} pet pages\n`);
  
  // Process pages
  let processed = 0;
  let changed = 0;
  let totalScore = 0;
  
  for (const row of petPages) {
    const wasChanged = await processPetPage(row, rows, dryRun);
    processed++;
    if (wasChanged) changed++;
    
    const validation = validatePetContent(row);
    totalScore += validation.score;
    
    await new Promise(resolve => setTimeout(resolve, 100));
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
  console.log(`Pages changed: ${changed}`);
  console.log(`Average score: ${(totalScore / processed).toFixed(1)}/100`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
