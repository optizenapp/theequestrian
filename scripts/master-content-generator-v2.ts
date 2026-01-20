#!/usr/bin/env tsx

/**
 * Master Content Generator V2 - WITH VERBOSE LOGGING
 * 
 * Fixes:
 * 1. Verbose terminal logging to track every step
 * 2. Smart category/subcategory detection at ANY depth
 * 3. Correct product lists for meta descriptions
 * 4. Category-specific content (no "technical fabrics" for fly control!)
 * 
 * Usage:
 *   npm run master-generate-v2 -- --start=0 --max=5 --dry-run
 *   npm run master-generate-v2 -- --start=0 --max=238
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

interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'critical' | 'warning';
}

// ============================================================================
// SMART CATEGORY DETECTION USING ACTUAL PRODUCT TYPES
// ============================================================================

/**
 * Get actual product types from Shopify mapping for this collection
 * This is THE SOURCE OF TRUTH - no more guessing!
 */
function getActualProductTypes(urlPath: string): string[] {
  const parts = urlPath.split('/').filter(p => p);
  
  if (parts.length === 0) return [];
  
  const category = parts[0];
  const subcategory = parts[1] || undefined;
  const subsubcategory = parts[2] || undefined;
  
  try {
    const productTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
    console.log(`      📦 Actual product types from Shopify: [${productTypes.join(', ')}]`);
    return productTypes;
  } catch (error) {
    console.log(`      ⚠️  Could not load product types: ${error}`);
    return [];
  }
}

/**
 * Detect the primary category type from URL path (FALLBACK ONLY)
 * Works at ANY depth: /horse/boots/travel -> "boots"
 * Prioritizes LAST (most specific) segment first
 */
function detectCategoryType(urlPath: string): string {
  const parts = urlPath.split('/').filter(p => p);
  
  // Check each part for known category types, starting from the END (most specific)
  const categoryTypes = [
    'boots', 'rugs', 'saddles', 'bridles', 'halters', 'pads', 'grooming',
    'supplements', 'treats', 'stable', 'training', 'tack',
    'clothing', 'breeches', 'jodhpurs', 'tops', 'jackets', 'helmets',
    'footwear', 'accessories', 'gloves', 'socks', 'belts', 'caps',
    'rider', 'luggage', 'bags', 'handbags',
    'dog', 'cat', 'pet'
  ];
  
  // Check from last to first (most specific to least specific)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (categoryTypes.includes(parts[i])) {
      return parts[i];
    }
  }
  
  // Fallback to last part
  return parts[parts.length - 1] || 'products';
}

/**
 * Get appropriate products list for meta description
 * NOW USES ACTUAL PRODUCT TYPES FROM SHOPIFY!
 */
function getProductsForCategory(urlPath: string, h1Title: string): string[] {
  // Get actual product types from Shopify mapping
  const productTypes = getActualProductTypes(urlPath);
  
  // If we have product types, use them directly!
  if (productTypes.length > 0) {
    // Convert product types to user-friendly names
    const friendlyNames = productTypes.map(pt => {
      // Remove prefixes like "HORSE:", "STABLE:", "RIDER:"
      let friendly = pt.replace(/^(HORSE|STABLE|RIDER|CLOTHING):\s*/i, '');
      // Convert to lowercase for consistency
      friendly = friendly.toLowerCase();
      // Add pluralization hints for better readability
      if (!friendly.endsWith('s') && !friendly.includes(' - ')) {
        friendly += 's';
      }
      return friendly;
    });
    
    // Remove duplicates and limit to 4
    const uniqueNames = [...new Set(friendlyNames)];
    
    console.log(`      ✅ Using actual products: [${uniqueNames.join(', ')}]`);
    return uniqueNames.slice(0, 4); // Limit to 4 for meta description
  }
  
  // FALLBACK: Old logic if no product types found
  console.log(`      ⚠️  No product types found, using fallback detection`);
  const categoryType = detectCategoryType(urlPath);
  const lowerTitle = h1Title.toLowerCase();
  
  console.log(`      📦 Category type detected: "${categoryType}"`);
  
  // Horse Boots
  if (categoryType === 'boots' && urlPath.includes('/horse')) {
    return ['brushing boots', 'tendon boots', 'travel boots', 'bell boots'];
  }
  
  // Horse Rugs
  if (categoryType === 'rugs') {
    if (lowerTitle.includes('summer')) return ['lightweight turnout rugs', 'fly sheets', 'mesh rugs', 'combo rugs'];
    if (lowerTitle.includes('winter')) return ['heavyweight turnout rugs', 'stable rugs', 'under rugs', 'combo rugs'];
    if (lowerTitle.includes('stable')) return ['stable rugs', 'under rugs', 'fleece rugs', 'coolers'];
    return ['turnout rugs', 'stable rugs', 'summer sheets', 'coolers', 'fly sheets'];
  }
  
  // Saddles
  if (categoryType === 'saddles') {
    if (lowerTitle.includes('jumping')) return ['close contact saddles', 'jumping saddles', 'forward seat saddles'];
    if (lowerTitle.includes('dressage')) return ['dressage saddles', 'monoflap saddles', 'deep seat saddles'];
    if (lowerTitle.includes('all-purpose') || lowerTitle.includes('general')) return ['all-purpose saddles', 'general purpose saddles', 'training saddles'];
    return ['dressage saddles', 'jumping saddles', 'all-purpose saddles', 'endurance saddles'];
  }
  
  // Saddle Pads
  if (categoryType === 'pads') {
    return ['saddle pads', 'numnahs', 'half pads', 'gel pads'];
  }
  
  // Bridles & Halters
  if (categoryType === 'bridles') {
    return ['snaffle bridles', 'double bridles', 'show bridles', 'western bridles'];
  }
  if (categoryType === 'halters') {
    return ['headcollars', 'show halters', 'leather halters', 'rope halters', 'lead ropes'];
  }
  
  // Grooming
  if (categoryType === 'grooming' || lowerTitle.includes('groom')) {
    return ['brushes', 'combs', 'hoof picks', 'grooming kits', 'shampoos'];
  }
  
  // Stable & Training
  if (categoryType === 'stable') {
    if (lowerTitle.includes('fly')) return ['fly masks', 'fly sprays', 'fly sheets', 'fly veils'];
    return ['stable equipment', 'feed buckets', 'hay nets', 'stable accessories'];
  }
  if (categoryType === 'training') {
    return ['lunge lines', 'training aids', 'whips', 'schooling equipment'];
  }
  
  // Clothing - Breeches & Jodhpurs
  if (categoryType === 'breeches' || categoryType === 'jodhpurs') {
    if (lowerTitle.includes('kids') || lowerTitle.includes('children')) {
      return ['kids breeches', 'children\'s jodhpurs', 'junior riding pants'];
    }
    if (lowerTitle.includes('men')) {
      return ['men\'s breeches', 'men\'s jodhpurs', 'men\'s riding pants'];
    }
    return ['breeches', 'jodhpurs', 'riding tights', 'competition pants'];
  }
  
  // Clothing - Tops
  if (categoryType === 'tops' || lowerTitle.includes('shirt') || lowerTitle.includes('polo')) {
    return ['riding shirts', 'polo shirts', 'competition shirts', 'base layers'];
  }
  
  // Clothing - Jackets
  if (categoryType === 'jackets' || lowerTitle.includes('jacket')) {
    return ['show jackets', 'riding jackets', 'softshell jackets', 'competition jackets'];
  }
  
  // Helmets & Safety
  if (categoryType === 'helmets' || lowerTitle.includes('helmet')) {
    return ['riding helmets', 'skull caps', 'show helmets', 'safety helmets'];
  }
  
  // Footwear
  if (categoryType === 'footwear' || lowerTitle.includes('boot')) {
    if (lowerTitle.includes('jodhpur')) return ['jodhpur boots', 'paddock boots', 'ankle boots'];
    if (lowerTitle.includes('long')) return ['long riding boots', 'dress boots', 'field boots'];
    return ['riding boots', 'jodhpur boots', 'long boots', 'paddock boots'];
  }
  
  // Accessories
  if (categoryType === 'accessories' || lowerTitle.includes('accessory')) {
    if (urlPath.includes('/clothing')) {
      if (lowerTitle.includes('glove')) return ['riding gloves', 'winter gloves', 'competition gloves'];
      if (lowerTitle.includes('sock')) return ['riding socks', 'boot socks', 'competition socks'];
      if (lowerTitle.includes('belt')) return ['riding belts', 'show belts', 'leather belts'];
      if (lowerTitle.includes('cap')) return ['riding caps', 'sun caps', 'baseball caps'];
      return ['gloves', 'socks', 'belts', 'hair nets', 'show accessories'];
    }
    return ['riding accessories', 'tack accessories', 'stable accessories'];
  }
  
  // Rider Luggage
  if (categoryType === 'luggage' || categoryType === 'bags') {
    if (lowerTitle.includes('handbag')) return ['handbags', 'shoulder bags', 'crossbody bags', 'totes'];
    if (lowerTitle.includes('backpack')) return ['riding backpacks', 'gear backpacks', 'day packs'];
    return ['gear bags', 'boot bags', 'helmet bags', 'garment bags', 'backpacks'];
  }
  
  // Pets
  if (categoryType === 'dog') {
    if (lowerTitle.includes('collar')) return ['dog collars', 'leads', 'harnesses', 'training collars'];
    if (lowerTitle.includes('toy')) return ['dog toys', 'chew toys', 'fetch toys', 'interactive toys'];
    return ['dog supplies', 'collars', 'leads', 'toys', 'beds'];
  }
  if (categoryType === 'cat') {
    return ['cat toys', 'scratching posts', 'cat beds', 'cat accessories'];
  }
  
  // Generic fallback
  if (urlPath.includes('/horse')) {
    return ['saddles', 'rugs', 'boots', 'tack', 'grooming supplies'];
  }
  if (urlPath.includes('/clothing') || urlPath.includes('/rider')) {
    return ['breeches', 'jodhpurs', 'riding tops', 'jackets'];
  }
  
  return ['equestrian products', 'riding gear', 'horse equipment'];
}

/**
 * Get category-specific feature bullets
 * NOW USES ACTUAL PRODUCT TYPES - NO MORE "technical fabrics" for fly control!
 */
function getCategoryFeatures(urlPath: string, h1Title: string): string[] {
  const productTypes = getActualProductTypes(urlPath);
  const categoryType = detectCategoryType(urlPath);
  const lowerTitle = h1Title.toLowerCase();
  
  // Use first product type if available
  const primaryProductType = productTypes.length > 0 ? productTypes[0].toLowerCase() : '';
  
  console.log(`      ✨ Generating features for: "${categoryType}" (product type: "${primaryProductType}")`);
  
  // Horse Boots
  if (categoryType === 'boots' && urlPath.includes('/horse')) {
    return [
      '<strong>Protection & Support:</strong> Advanced impact absorption and tendon support for maximum safety during training and competition',
      '<strong>Perfect Fit:</strong> Anatomically designed to move with your horse while staying securely in place',
      '<strong>Breathable Materials:</strong> Moisture-wicking fabrics that prevent heat buildup and maintain comfort',
      '<strong>Durability:</strong> Reinforced stitching and premium materials built to withstand daily use'
    ];
  }
  
  // Horse Rugs
  if (categoryType === 'rugs') {
    if (lowerTitle.includes('summer') || lowerTitle.includes('fly')) {
      return [
        '<strong>UV Protection:</strong> Advanced fabrics that shield your horse from harmful sun rays',
        '<strong>Fly Protection:</strong> Fine mesh construction that keeps insects away while allowing airflow',
        '<strong>Breathable Design:</strong> Lightweight materials that prevent overheating in warm weather',
        '<strong>Perfect Fit:</strong> Tailored cuts with adjustable straps for comfort and security'
      ];
    }
    if (lowerTitle.includes('winter') || lowerTitle.includes('stable')) {
      return [
        '<strong>Superior Insulation:</strong> High-quality fill that keeps your horse warm in cold conditions',
        '<strong>Waterproof Protection:</strong> Durable outer shell that repels rain and snow',
        '<strong>Breathable Layers:</strong> Advanced fabrics that wick moisture while retaining warmth',
        '<strong>Secure Fit:</strong> Adjustable closures and leg straps that stay in place'
      ];
    }
    return [
      '<strong>Weather Protection:</strong> Durable materials that shield your horse from the elements',
      '<strong>Perfect Fit:</strong> Anatomically designed with adjustable straps for comfort',
      '<strong>Quality Construction:</strong> Reinforced stitching and premium fabrics for lasting performance',
      '<strong>Easy Care:</strong> Machine washable designs that maintain their quality wash after wash'
    ];
  }
  
  // Saddles
  if (categoryType === 'saddles') {
    return [
      '<strong>Precision Engineering:</strong> Expertly crafted trees and panels for optimal weight distribution',
      '<strong>Superior Comfort:</strong> Premium leather and padding that molds to both horse and rider',
      '<strong>Perfect Balance:</strong> Designed to enhance your position and communication with your horse',
      '<strong>Lasting Quality:</strong> Traditional craftsmanship combined with modern materials for durability'
    ];
  }
  
  // Saddle Pads
  if (categoryType === 'pads') {
    return [
      '<strong>Shock Absorption:</strong> Advanced cushioning that protects your horse\'s back during work',
      '<strong>Breathability:</strong> Moisture-wicking materials that prevent heat buildup and discomfort',
      '<strong>Perfect Fit:</strong> Contoured designs that complement your saddle and horse\'s conformation',
      '<strong>Easy Maintenance:</strong> Machine washable fabrics that retain their shape and performance'
    ];
  }
  
  // Bridles & Halters
  if (categoryType === 'bridles' || categoryType === 'halters') {
    return [
      '<strong>Premium Leather:</strong> Soft, supple materials that are gentle on your horse\'s face',
      '<strong>Adjustable Fit:</strong> Multiple adjustment points for a perfect, comfortable fit',
      '<strong>Quality Hardware:</strong> Durable buckles and fittings that won\'t rust or break',
      '<strong>Elegant Design:</strong> Classic styling that looks professional in any setting'
    ];
  }
  
  // Grooming
  if (categoryType === 'grooming' || lowerTitle.includes('groom')) {
    return [
      '<strong>Professional Quality:</strong> Tools designed for effective cleaning and coat care',
      '<strong>Ergonomic Design:</strong> Comfortable grips that reduce hand fatigue during grooming',
      '<strong>Durable Construction:</strong> Long-lasting materials that withstand daily use',
      '<strong>Complete Care:</strong> Everything you need for a healthy, shiny coat'
    ];
  }
  
  // Stable Equipment
  if (categoryType === 'stable') {
    if (lowerTitle.includes('fly')) {
      return [
        '<strong>Effective Protection:</strong> Proven designs that keep flies and insects away',
        '<strong>Comfortable Fit:</strong> Soft materials that won\'t rub or irritate',
        '<strong>Durable Construction:</strong> Built to withstand outdoor conditions',
        '<strong>Easy Application:</strong> Simple to put on and remove for daily use'
      ];
    }
    return [
      '<strong>Premium Quality:</strong> Expertly crafted from the finest materials for lasting performance',
      '<strong>Functional Design:</strong> Thoughtfully engineered to meet the specific needs of horses',
      '<strong>Trusted Brands:</strong> Products from manufacturers with proven track records',
      '<strong>Australian Ready:</strong> Suitable for our unique climate and conditions'
    ];
  }
  
  // Training Equipment
  if (categoryType === 'training') {
    return [
      '<strong>Professional Grade:</strong> Equipment trusted by trainers and coaches',
      '<strong>Safety First:</strong> Designed with both horse and handler safety in mind',
      '<strong>Durable Materials:</strong> Built to withstand intensive training sessions',
      '<strong>Effective Results:</strong> Tools that help develop skills and improve performance'
    ];
  }
  
  // CLOTHING ITEMS - These CAN have technical fabrics
  if (urlPath.includes('/clothing') || urlPath.includes('/rider')) {
    // Helmets & Safety
    if (categoryType === 'helmets' || lowerTitle.includes('helmet')) {
      return [
        '<strong>Safety Certified:</strong> Meets or exceeds Australian and international safety standards',
        '<strong>Advanced Protection:</strong> Multi-impact foam and reinforced shells for maximum safety',
        '<strong>Comfortable Fit:</strong> Adjustable sizing systems and ventilation for all-day wear',
        '<strong>Stylish Design:</strong> Modern aesthetics that look great in and out of the arena'
      ];
    }
    
    // Footwear
    if (categoryType === 'footwear' || (lowerTitle.includes('boot') && !urlPath.includes('/horse'))) {
      return [
        '<strong>Superior Comfort:</strong> Cushioned insoles and supportive construction for long hours in the saddle',
        '<strong>Premium Materials:</strong> Quality leather that molds to your foot over time',
        '<strong>Excellent Grip:</strong> Non-slip soles designed for safety in stirrups and on stable floors',
        '<strong>Lasting Durability:</strong> Reinforced stitching and quality construction for years of wear'
      ];
    }
    
    // Gloves
    if (lowerTitle.includes('glove')) {
      return [
        '<strong>Superior Grip:</strong> Textured palms and fingers for secure rein control',
        '<strong>Breathable Comfort:</strong> Moisture-wicking materials that keep hands dry',
        '<strong>Perfect Fit:</strong> Stretchy fabrics that move with your hands',
        '<strong>Durable Construction:</strong> Reinforced areas for long-lasting performance'
      ];
    }
    
    // Socks
    if (lowerTitle.includes('sock')) {
      return [
        '<strong>Cushioned Comfort:</strong> Extra padding in key areas for all-day wear',
        '<strong>Moisture Management:</strong> Technical fabrics that wick sweat away',
        '<strong>Perfect Fit:</strong> Arch support and stay-up designs that won\'t slip',
        '<strong>Durable Quality:</strong> Reinforced heels and toes for lasting wear'
      ];
    }
    
    // Luggage & Bags
    if (categoryType === 'luggage' || categoryType === 'bags' || lowerTitle.includes('bag')) {
      return [
        '<strong>Spacious Design:</strong> Thoughtfully organized compartments for all your gear',
        '<strong>Durable Construction:</strong> Heavy-duty materials and reinforced stitching',
        '<strong>Easy Transport:</strong> Comfortable handles and straps for convenient carrying',
        '<strong>Weather Resistant:</strong> Water-resistant fabrics to protect your belongings'
      ];
    }
    
    // Generic clothing (breeches, tops, jackets, etc.)
    return [
      '<strong>Technical Fabrics:</strong> Advanced moisture-wicking and breathable materials that keep you comfortable in the saddle',
      '<strong>Perfect Fit:</strong> Designed specifically for riding with stretch panels and reinforced seams where you need them most',
      '<strong>Durability:</strong> Built to withstand the demands of daily riding and competition',
      '<strong>Professional Style:</strong> Classic designs that look sharp in the arena or stable yard'
    ];
  }
  
  // PET PRODUCTS - Dog & Cat
  if (urlPath.includes('/pet/dog') || categoryType === 'dog') {
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
        '<strong>Engaging Design:</strong> Interactive features that keep your dog entertained',
        '<strong>Safe Materials:</strong> Non-toxic, pet-safe construction for worry-free play',
        '<strong>Durable Quality:</strong> Built to withstand enthusiastic chewing and play',
        '<strong>Variety:</strong> Options for different play styles and dog sizes'
      ];
    }
    if (lowerTitle.includes('treat')) {
      return [
        '<strong>Natural Ingredients:</strong> Quality nutrition without artificial additives',
        '<strong>Tasty Flavors:</strong> Delicious options your dog will love',
        '<strong>Health Benefits:</strong> Supports dental health, digestion, and overall wellbeing',
        '<strong>Australian Made:</strong> Many locally sourced and produced options'
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
  
  if (urlPath.includes('/pet/cat') || categoryType === 'cat') {
    if (lowerTitle.includes('toy')) {
      return [
        '<strong>Stimulating Play:</strong> Interactive designs that engage your cat\'s natural instincts',
        '<strong>Safe Materials:</strong> Non-toxic, cat-safe construction',
        '<strong>Variety of Options:</strong> Toys for different play preferences and activity levels',
        '<strong>Durable Quality:</strong> Built to withstand enthusiastic play sessions'
      ];
    }
    // Generic cat products
    return [
      '<strong>Premium Quality:</strong> Expertly selected products for your cat\'s comfort and happiness',
      '<strong>Trusted Brands:</strong> Products from manufacturers known for pet safety',
      '<strong>Practical Design:</strong> Thoughtfully engineered for feline needs',
      '<strong>Great Value:</strong> Durable products that provide long-lasting use'
    ];
  }
  
  // Generic fallback for anything else
  return [
    '<strong>Premium Quality:</strong> Expertly crafted from the finest materials for lasting performance',
    '<strong>Functional Design:</strong> Thoughtfully engineered to meet the specific needs of horses and riders',
    '<strong>Trusted Brands:</strong> Products from manufacturers with proven track records',
    '<strong>Australian Ready:</strong> Suitable for our unique climate and conditions'
  ];
}

/**
 * Get contextual H2 prefix (not always "Premium")
 */
function getH2Prefix(urlPath: string, h1Title: string): string {
  const lowerTitle = h1Title.toLowerCase();
  
  if (lowerTitle.includes('safety') || lowerTitle.includes('helmet') || lowerTitle.includes('protection')) {
    return 'Protective';
  }
  if (lowerTitle.includes('competition') || lowerTitle.includes('show')) {
    return 'Professional';
  }
  if (lowerTitle.includes('essential') || lowerTitle.includes('basic')) {
    return 'Essential';
  }
  if (lowerTitle.includes('luxury') || lowerTitle.includes('premium')) {
    return 'Premium';
  }
  if (lowerTitle.includes('kids') || lowerTitle.includes('children')) {
    return 'Quality';
  }
  if (lowerTitle.includes('training') || lowerTitle.includes('schooling')) {
    return 'Professional';
  }
  if (lowerTitle.includes('everyday') || lowerTitle.includes('daily')) {
    return 'Reliable';
  }
  if (lowerTitle.includes('style') || lowerTitle.includes('fashion')) {
    return 'Stylish';
  }
  if (lowerTitle.includes('comfort')) {
    return 'Comfortable';
  }
  
  // Default based on category
  if (urlPath.includes('/clothing')) {
    return 'Stylish';
  }
  
  return 'Premium';
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

function generateMetaDescription(row: CsvRow): string {
  const products = getProductsForCategory(row.url_path, row.h1_title);
  const productList = products.slice(0, 4).join(', ');
  
  const desc = `Shop premium ${row.h1_title.toLowerCase()} including ${productList}. Free shipping Australia-wide. Expert advice available.`;
  
  // Ensure 150-160 chars
  if (desc.length < 150) {
    return desc + ' Find the perfect gear for your needs.';
  }
  if (desc.length > 160) {
    return desc.substring(0, 157) + '...';
  }
  
  return desc;
}

function generateShortDescription(row: CsvRow): string {
  // Remove any existing category prefix
  let desc = row.short_description || '';
  desc = desc.replace(/^[a-z\s\-]+:\s*/i, '');
  desc = desc.replace(new RegExp(`^${row.h1_title}\\.?\\s*`, 'i'), '');
  
  // Check if current description has generic/wrong content
  const hasWrongContent = desc.includes('competing or riding') && row.url_path.includes('/pet');
  
  // If empty, too short, or has wrong content, generate new
  if (desc.length < 50 || hasWrongContent) {
    // Generate category-appropriate description
    if (row.url_path.includes('/pet/dog') || row.url_path.includes('/pet/cat')) {
      desc = 'Expertly selected for quality, durability, and performance. Whether you\'re training or caring for your pet, find exactly what you need at The Equestrian.';
    } else if (row.url_path.includes('/rider') || row.url_path.includes('/clothing')) {
      desc = 'Expertly selected for quality, durability, and performance. Whether you\'re competing or riding for leisure, find exactly what you need at The Equestrian.';
    } else if (row.url_path.includes('/horse')) {
      desc = 'Expertly selected for quality, durability, and performance. Whether you\'re training, competing, or caring for your horse, find exactly what you need at The Equestrian.';
    } else {
      desc = 'Expertly selected for quality, durability, and performance. Find exactly what you need at The Equestrian.';
    }
  }
  
  // Ensure it starts with capital letter
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

function generateLongDescription(row: CsvRow, allRows: CsvRow[]): string {
  const h2Prefix = getH2Prefix(row.url_path, row.h1_title);
  const features = getCategoryFeatures(row.url_path, row.h1_title);
  
  let html = `<h2>${h2Prefix} ${row.h1_title}</h2>\n`;
  
  // Generate category-appropriate opening paragraph
  if (row.url_path.includes('/pet/dog') || row.url_path.includes('/pet/cat')) {
    html += `<p>Discover our comprehensive collection of ${row.h1_title.toLowerCase()}, carefully curated to meet the needs of pet owners. From training essentials to everyday care, we stock only the finest brands known for quality and durability. All products in stock and ready to ship Australia-wide.</p>`;
  } else {
    html += `<p>Browse our specialized collection. All products in stock and ready to ship. Most orders dispatched within 24 hours Australia-wide.</p>`;
  }
  
  html += `<h3>What Makes Great ${row.h1_title}?</h3>\n`;
  html += '<ul>\n';
  features.forEach(feature => {
    html += `<li>${feature}</li>\n`;
  });
  html += '</ul>\n';
  
  // Internal links
  const childCategories = allRows.filter(r => r.parent_url === row.url_path && r.status === 'active');
  if (childCategories.length > 0) {
    html += '<h3>Shop by Category</h3>\n';
    html += '<p>Browse our specialized categories including ';
    
    const links = childCategories.slice(0, 5).map(child => {
      const label = child.breadcrumb_label || child.h1_title;
      return `<a href="${child.url_path}">${label.toLowerCase()}</a>`;
    });
    
    html += links.join(', ');
    html += '. Each category features products from world-leading brands trusted by professional equestrians.</p>\n';
  }
  
  return html;
}

function generateFAQs(row: CsvRow): FAQItem[] {
  const categoryName = row.h1_title;
  
  return [
    {
      question: `What ${categoryName.toLowerCase()} do you stock?`,
      answer: `We stock a comprehensive range of ${categoryName.toLowerCase()} from leading brands. All products are carefully selected for quality, durability, and performance. Browse our collection to find exactly what you need.`
    },
    {
      question: `Do you offer free shipping on ${categoryName.toLowerCase()}?`,
      answer: `Yes! We offer free shipping Australia-wide on all orders. Most orders are dispatched within 24 hours, so you'll receive your ${categoryName.toLowerCase()} quickly.`
    }
  ];
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateContent(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  console.log(`      🔍 Validating content...`);
  
  // Meta description
  if (!row.meta_description || row.meta_description.length < 140) {
    issues.push({ field: 'meta_description', issue: 'Too short (< 140 chars)', severity: 'critical' });
  }
  if (row.meta_description && row.meta_description.length > 165) {
    issues.push({ field: 'meta_description', issue: 'Too long (> 165 chars)', severity: 'warning' });
  }
  
  // Check for wrong products in meta description - SMART CHECK
  const categoryType = detectCategoryType(row.url_path);
  const correctProducts = getProductsForCategory(row.url_path, row.h1_title);
  const metaLower = row.meta_description.toLowerCase();
  
  // Check if meta description contains any of the correct products
  const hasCorrectProducts = correctProducts.some(p => metaLower.includes(p.toLowerCase()));
  
  // If meta description doesn't have correct products, flag it
  if (!hasCorrectProducts && correctProducts.length > 0) {
    issues.push({ field: 'meta_description', issue: 'Missing correct products for this category', severity: 'critical' });
  }
  
  // Check for obviously wrong products
  if (categoryType === 'caps' && (metaLower.includes('breeches') || metaLower.includes('jodhpurs'))) {
    issues.push({ field: 'meta_description', issue: 'Wrong products (breeches/jodhpurs in caps)', severity: 'critical' });
  }
  if (categoryType === 'stable' && metaLower.includes('saddles')) {
    issues.push({ field: 'meta_description', issue: 'Wrong products (saddles in stable)', severity: 'critical' });
  }
  if (categoryType === 'grooming' && (metaLower.includes('saddles') || metaLower.includes('breeches'))) {
    issues.push({ field: 'meta_description', issue: 'Wrong products (tack/clothing in grooming)', severity: 'critical' });
  }
  
  // Short description
  if (row.short_description && row.short_description.match(/^[a-z]/)) {
    issues.push({ field: 'short_description', issue: 'Starts with lowercase', severity: 'critical' });
  }
  if (row.short_description && row.short_description.match(/^[a-z\s\-]+:/i)) {
    issues.push({ field: 'short_description', issue: 'Has category prefix', severity: 'critical' });
  }
  // Check for inappropriate content in pet pages
  if (row.url_path.includes('/pet') && row.short_description && row.short_description.includes('competing or riding')) {
    issues.push({ field: 'short_description', issue: 'Inappropriate "riding" content on pet page', severity: 'critical' });
  }
  
  // Long description
  if (!row.long_description || row.long_description.length < 200) {
    issues.push({ field: 'long_description', issue: 'Too short', severity: 'critical' });
  }
  if (row.long_description && row.long_description.includes('<p>, . that .</p>')) {
    issues.push({ field: 'long_description', issue: 'Broken HTML fragments', severity: 'critical' });
  }
  
  // Check for inappropriate "technical fabrics" in non-clothing
  if (!row.url_path.includes('/clothing') && !row.url_path.includes('/rider')) {
    if (row.long_description && row.long_description.includes('Technical Fabrics')) {
      issues.push({ field: 'long_description', issue: 'Inappropriate "technical fabrics" for non-clothing', severity: 'critical' });
    }
  }
  
  // H1 capitalization
  if (row.h1_title && row.h1_title.match(/^[a-z]/)) {
    issues.push({ field: 'h1_title', issue: 'Starts with lowercase', severity: 'warning' });
  }
  
  console.log(`      ${issues.length === 0 ? '✅' : '⚠️'} Found ${issues.length} issues`);
  
  return issues;
}

function calculateScore(issues: ValidationIssue[]): number {
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 15;
    if (issue.severity === 'warning') score -= 5;
  });
  return Math.max(0, score);
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(
  row: CsvRow,
  allRows: CsvRow[],
  dryRun: boolean
): Promise<{ changed: boolean; score: number }> {
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Processing: ${row.url_path}`);
  console.log(`   H1: ${row.h1_title}`);
  console.log(`   Level: ${row.category_level}`);
  
  // Validate current content
  const issuesBefore = validateContent(row);
  const scoreBefore = calculateScore(issuesBefore);
  
  console.log(`   📊 Current score: ${scoreBefore}/100`);
  
  if (scoreBefore >= 90 && issuesBefore.filter(i => i.severity === 'critical').length === 0) {
    console.log(`   ✅ Content already excellent, skipping`);
    return { changed: false, score: scoreBefore };
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
    
    // Fix H1 if needed
    if (row.h1_title.match(/^[a-z]/)) {
      row.h1_title = row.h1_title.charAt(0).toUpperCase() + row.h1_title.slice(1);
    }
  }
  
  // Validate after
  const issuesAfter = validateContent(row);
  const scoreAfter = calculateScore(issuesAfter);
  
  console.log(`   📊 New score: ${scoreAfter}/100 (${scoreAfter >= scoreBefore ? '✅' : '⚠️'})`);
  
  if (dryRun) {
    console.log(`\n   --- BEFORE vs AFTER ---`);
    console.log(`   OLD Meta: ${row.meta_description.substring(0, 100)}...`);
    console.log(`   NEW Meta: ${newMetaDescription}`);
    console.log(`\n   OLD Long (first 150): ${row.long_description.substring(0, 150)}...`);
    console.log(`   NEW Long (first 150): ${newLongDescription.substring(0, 150)}...`);
  }
  
  return { changed: true, score: scoreAfter };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const startIdx = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
  const maxPages = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '999999');
  
  console.log('\n🚀 MASTER CONTENT GENERATOR V2 - WITH VERBOSE LOGGING\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Processing: ${startIdx} to ${startIdx + maxPages - 1}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-${timestamp}.csv`);
    fs.copyFileSync(CSV_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
  
  // Load CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log(`📊 Total rows in CSV: ${rows.length}\n`);
  
  // Process pages
  let processed = 0;
  let changed = 0;
  let totalScore = 0;
  
  for (let i = startIdx; i < Math.min(startIdx + maxPages, rows.length); i++) {
    const row = rows[i];
    
    const result = await processPage(row, rows, dryRun);
    processed++;
    if (result.changed) changed++;
    totalScore += result.score;
    
    // Small delay to make output readable
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
  console.log(`Pages processed: ${processed}`);
  console.log(`Pages changed: ${changed}`);
  console.log(`Average score: ${(totalScore / processed).toFixed(1)}/100`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
