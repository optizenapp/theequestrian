#!/usr/bin/env tsx

/**
 * Fix Long Descriptions - Equestrian Pages
 * 
 * Creates unique, detailed long descriptions for each equestrian page
 * with category-specific content, features, and internal linking.
 * 
 * Usage:
 *   npm run fix-long-desc-equestrian -- --dry-run
 *   npm run fix-long-desc-equestrian
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { getProductTypesForCollection } from '../lib/mapping/collection-mapping';

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

/**
 * Generate unique, detailed long description with proper HTML structure
 */
function generateUniqueLongDescription(row: CsvRow, allRows: CsvRow[]): string {
  const h1Lower = row.h1_title.toLowerCase();
  const urlPath = row.url_path.toLowerCase();
  
  let html = '';
  
  // H2 with contextual prefix
  const h2Prefix = getH2Prefix(urlPath, h1Lower);
  html += `<h2>${h2Prefix} ${row.h1_title}</h2>\n`;
  
  // Opening paragraph - unique per category
  html += generateOpeningParagraph(urlPath, h1Lower, row.h1_title);
  
  // Features section with category-specific bullets
  html += `<h3>What Makes Great ${row.h1_title}?</h3>\n`;
  html += '<ul>\n';
  const features = getCategoryFeatures(urlPath, h1Lower);
  features.forEach(feature => {
    html += `<li>${feature}</li>\n`;
  });
  html += '</ul>\n';
  
  // Internal links to child categories
  const childCategories = allRows.filter(r => r.parent_url === row.url_path);
  if (childCategories.length > 0) {
    html += '<h3>Shop by Category</h3>\n';
    html += '<p>Browse our specialized categories including ';
    
    const links = childCategories.slice(0, 6).map(child => {
      const label = child.breadcrumb_label || child.h1_title;
      return `<a href="${child.url_path}">${label.toLowerCase()}</a>`;
    });
    
    html += links.join(', ');
    html += '. Each category features products from world-leading equestrian brands trusted by professionals.</p>\n';
  }
  
  return html;
}

/**
 * Get contextual H2 prefix based on category
 */
function getH2Prefix(urlPath: string, h1Lower: string): string {
  if (h1Lower.includes('safety') || h1Lower.includes('helmet') || h1Lower.includes('protection')) {
    return 'Essential Safety';
  }
  if (h1Lower.includes('competition') || h1Lower.includes('show')) {
    return 'Competition-Ready';
  }
  if (h1Lower.includes('kids') || h1Lower.includes('children') || h1Lower.includes('junior')) {
    return 'Quality';
  }
  if (h1Lower.includes('training') || h1Lower.includes('schooling')) {
    return 'Professional Training';
  }
  if (urlPath.includes('/clothing')) {
    return 'Stylish';
  }
  return 'Premium';
}

/**
 * Generate unique opening paragraph based on category
 */
function generateOpeningParagraph(urlPath: string, h1Lower: string, h1Title: string): string {
  // SADDLES
  if (urlPath.includes('/saddle')) {
    if (h1Lower.includes('jump')) {
      return '<p>Our jumping saddle collection features forward-cut designs that place you in the perfect position for taking fences. Each saddle is crafted from premium European leather with deep knee rolls and close contact panels. From young horses learning to jump to seasoned competitors tackling Grand Prix courses, we stock saddles from manufacturers like CWD, Butet, and Pessoa. All products ready to ship Australia-wide with expert fitting advice available.</p>\n';
    }
    if (h1Lower.includes('dressage')) {
      return '<p>Explore our dressage saddle range, designed to support the deep seat and long leg position essential for classical riding. Each saddle features an extended mono or double-flap design with girthing options that provide stability and freedom of movement. We stock leading European manufacturers known for their traditional craftsmanship and modern innovations. All saddles available with professional fitting consultation and fast Australian delivery.</p>\n';
    }
    if (h1Lower.includes('all-purpose') || h1Lower.includes('general')) {
      return '<p>Browse versatile all-purpose saddles that adapt to multiple disciplines, from flatwork to small jumps. These saddles feature moderate knee rolls and balanced seat positions, making them ideal for riders who enjoy variety in their training. Perfect for riding schools, young riders, and horses in varied work. We stock trusted brands at competitive prices with expert advice and fast shipping across Australia.</p>\n';
    }
    return '<p>Discover our complete saddle collection featuring designs for every discipline and riding level. Each saddle is selected for quality construction, rider comfort, and horse welfare. From European craftsmanship to modern innovations, we stock only manufacturers with proven track records in the equestrian world. Expert fitting advice available, with most orders shipped within 24 hours across Australia.</p>\n';
  }
  
  // RUGS & BLANKETS
  if (urlPath.includes('/rug')) {
    if (h1Lower.includes('summer') || h1Lower.includes('fly')) {
      return '<p>Protect your horse from Australia\'s intense summer sun and persistent flies with our lightweight rug collection. These rugs feature breathable mesh construction, UV-resistant fabrics, and secure fittings that stay in place during turnout. From fly sheets with full belly coverage to combo neck designs, each rug is selected for its ability to keep horses cool and comfortable in hot conditions. All products in stock and ready for fast dispatch across Australia.</p>\n';
    }
    if (h1Lower.includes('winter') || h1Lower.includes('heavy')) {
      return '<p>Keep your horse warm through cold Australian winters with our heavyweight turnout rug range. These rugs combine waterproof outer shells with high-fill insulation, ensuring your horse stays dry and comfortable in wet, windy conditions. Features include tail flaps, leg arches, and secure cross surcingles for freedom of movement. We stock leading brands known for durability and weather resistance, all available for fast delivery nationwide.</p>\n';
    }
    if (h1Lower.includes('stable')) {
      return '<p>Shop stable rugs designed for indoor warmth without overheating. These rugs feature breathable materials with varying fill weights to suit different temperatures and horse needs. From lightweight cotton to medium-fill quilted designs, each rug provides comfort during stabling while allowing moisture to escape. Perfect for horses in work, those needing extra warmth, or post-exercise cooling. All available with fast Australian shipping.</p>\n';
    }
    return '<p>Browse our comprehensive horse rug collection covering every season and purpose. From turnout to stable, summer sheets to heavy winter rugs, each product is selected for quality materials, secure fittings, and long-lasting performance. We stock trusted brands like Weatherbeeta, Horseware, and Saxon, all designed to withstand Australian conditions. Expert advice available with orders shipped fast nationwide.</p>\n';
  }
  
  // BOOTS & LEG PROTECTION
  if (urlPath.includes('/boot') && urlPath.includes('/horse')) {
    if (h1Lower.includes('jump') || h1Lower.includes('tendon')) {
      return '<p>Protect your horse\'s tendons during jumping with our specialized boot collection. These boots feature impact-absorbing strike pads, reinforced shells, and breathable linings that prevent rubbing during intensive work. From training sessions to competition, each boot is designed to stay secure without restricting movement. We stock leading brands trusted by professional show jumpers, all available for fast dispatch across Australia.</p>\n';
    }
    if (h1Lower.includes('brush')) {
      return '<p>Essential brushing boots to protect your horse\'s legs from knocks and scrapes during daily training. These lightweight boots feature flexible materials that move with your horse while providing cushioning against interference. Perfect for flatwork, lunging, and general riding, they\'re easy to fit, comfortable for all-day wear, and simple to clean. All products in stock and ready to ship Australia-wide.</p>\n';
    }
    if (h1Lower.includes('travel')) {
      return '<p>Keep your horse\'s legs safe during transport with our travel boot collection. These boots provide full leg coverage with padded protection from hock to coronet band. Features include breathable materials to prevent overheating, secure fastenings that won\'t slip, and durable construction for repeated use. Perfect for float trips, whether short journeys or long-distance travel. All available for fast Australian delivery.</p>\n';
    }
    return '<p>Explore our complete range of horse boots and leg protection for every discipline and purpose. From training to competition, turnout to travel, each boot is selected for its protective qualities, secure fit, and durability. We stock trusted brands that combine advanced materials with practical designs, all tested by professional riders. Expert advice available with fast shipping across Australia.</p>\n';
  }
  
  // BRIDLES & BITS
  if (urlPath.includes('/bridle') || urlPath.includes('/bit')) {
    if (h1Lower.includes('bit')) {
      return '<p>Find the perfect bit for clear, comfortable communication with your horse. Our bit collection spans from gentle snaffles to advanced double bridles, covering every discipline and training need. Each bit is crafted from quality materials - stainless steel, copper alloys, and synthetic options - with attention to mouthpiece design, weight, and action. Expert advice available to help you choose the right bit for your horse. All products in stock with fast Australian shipping.</p>\n';
    }
    return '<p>Explore quality bridles crafted from premium European leather. Each bridle features adjustable nosebands, padded headpieces, and stainless steel fittings built to last. From schooling bridles to competition show bridles, our collection covers every discipline - dressage, jumping, eventing, and showing. We stock leading manufacturers known for their craftsmanship, comfort, and classical styling. All available for fast delivery across Australia.</p>\n';
  }
  
  // SADDLE PADS & NUMNAHS
  if (urlPath.includes('/pad')) {
    if (h1Lower.includes('gel')) {
      return '<p>Advanced gel saddle pads offering superior shock absorption and pressure distribution. These pads feature medical-grade gel inserts that mold to your horse\'s back, providing cushioning while maintaining saddle stability. Perfect for horses with sensitive backs, those in intensive work, or riders seeking additional comfort. Non-slip designs that won\'t migrate during riding, all available for fast Australian delivery.</p>\n';
    }
    return '<p>Shop saddle pads and numnahs designed for comfort, protection, and performance. Our collection features moisture-wicking materials, anatomically shaped designs, and options for every saddle type. From basic cotton numnahs to advanced memory foam and gel pads, each product helps distribute pressure evenly while keeping your horse\'s back dry and comfortable. All products in stock with fast shipping nationwide.</p>\n';
  }
  
  // CLOTHING - BREECHES & JODHPURS
  if (urlPath.includes('/breech') || urlPath.includes('/jodhpur')) {
    if (h1Lower.includes('competition') || h1Lower.includes('show')) {
      return '<p>Competition breeches designed for the show ring, combining elegant styling with technical performance. These breeches feature four-way stretch fabrics that move with you, silicone knee or full-seat grips for security, and tailored fits that look professional under show jackets. From dressage whites to dark competition breeches, we stock leading brands trusted by top riders. All available with fast Australian delivery.</p>\n';
    }
    if (h1Lower.includes('kids') || h1Lower.includes('children')) {
      return '<p>Quality kids\' riding pants built for growing riders who need durability and comfort. These breeches and jodhpurs feature reinforced inner legs, stretchy fabrics for freedom of movement, and styles that young riders love wearing. From first riding lessons to Pony Club competitions, we stock sizes for all ages with adjustable features for longer wear. All products ready to ship fast across Australia.</p>\n';
    }
    return '<p>Discover riding breeches and jodhpurs for every discipline and occasion. Our collection features technical fabrics with four-way stretch, moisture-wicking properties, and reinforced seating for durability. From daily training to competition, each pair is designed to provide comfort during long hours in the saddle. We stock leading equestrian brands in a range of colors, styles, and price points. All available for fast Australian delivery.</p>\n';
  }
  
  // CLOTHING - HELMETS
  if (urlPath.includes('/helmet')) {
    return '<p>Safety-certified riding helmets combining advanced protection technology with contemporary styling. Every helmet in our collection meets or exceeds Australian and international safety standards, featuring multi-impact foam, adjustable fit systems, and ventilation for comfort. From schooling to competition, we stock helmets for all disciplines and age groups. Professional fitting advice available with all products shipped fast across Australia.</p>\n';
  }
  
  // CLOTHING - JACKETS
  if (urlPath.includes('/jacket') && urlPath.includes('/clothing')) {
    if (h1Lower.includes('show') || h1Lower.includes('competition')) {
      return '<p>Elegant competition jackets that project professionalism in the show ring. These jackets feature tailored cuts, technical stretch fabrics, and classic styling that meets show regulations across disciplines. From dressage tailcoats to show jumping jackets, each garment combines traditional appearance with modern comfort features. We stock leading brands in sizes for all riders, all available for fast Australian delivery.</p>\n';
    }
    return '<p>Quality riding jackets for training, competing, and everyday equestrian life. Our collection includes waterproof options for all-weather riding, insulated jackets for cold mornings, and lightweight softshells for versatile use. Each jacket is designed with rider needs in mind - freedom of movement, practical pockets, and durable construction. All products in stock and ready to ship fast across Australia.</p>\n';
  }
  
  // CLOTHING - FOOTWEAR
  if (urlPath.includes('/footwear') || (urlPath.includes('/boot') && urlPath.includes('/clothing'))) {
    if (h1Lower.includes('long') || h1Lower.includes('dress')) {
      return '<p>Elegant long riding boots for competition and formal occasions. These boots feature premium leather construction that molds to your leg over time, creating a custom fit. With slim profiles, traditional styling, and quality craftsmanship, each pair is built to last through years of riding. We stock leading European manufacturers in a range of sizes and calf widths. All available for fast Australian delivery.</p>\n';
    }
    return '<p>Quality riding boots designed for comfort, durability, and performance. From everyday jodhpur boots to specialized competition footwear, our collection covers every riding need. Each pair features supportive construction, non-slip soles, and materials that withstand daily stable work. We stock trusted brands at various price points, ensuring every rider finds the perfect boot. All products ready to ship fast nationwide.</p>\n';
  }
  
  // GROOMING
  if (urlPath.includes('/groom')) {
    return '<p>Complete grooming supplies for maintaining a healthy, shiny coat. Our collection includes quality brushes, curry combs, hoof picks, and grooming kits designed for effective cleaning and coat care. From basic daily grooming to show preparation, we stock professional-grade tools that make grooming easier and more enjoyable. Plus shampoos, conditioners, and coat care products from leading equine care brands. All available with fast Australian shipping.</p>\n';
  }
  
  // STABLE & YARD
  if (urlPath.includes('/stable')) {
    if (h1Lower.includes('fly')) {
      return '<p>Effective fly control products designed for Australian conditions. Our range includes fly masks, sprays, veils, and environmental controls to keep your horse comfortable during fly season. From paddock to stable, each product is selected for its effectiveness against Australian flies and midges. We stock trusted brands with proven results, all available for fast delivery nationwide.</p>\n';
    }
    return '<p>Essential stable and yard equipment for daily horse care. From feed buckets and hay nets to grooming supplies and stable accessories, our collection covers everything needed for efficient horse management. Each product is selected for durability, practicality, and value, built to withstand the demands of busy stable yards. All products in stock and ready for fast dispatch across Australia.</p>\n';
  }
  
  // GENERIC FALLBACK
  return `<p>Browse our comprehensive ${h1Title.toLowerCase()} collection, carefully selected for quality and performance. Each product is chosen from trusted equestrian brands with proven track records. Whether you\'re training, competing, or enjoying leisure riding, find everything you need with expert advice and fast delivery across Australia.</p>\n`;
}

/**
 * Get category-specific feature bullets
 */
function getCategoryFeatures(urlPath: string, h1Lower: string): string[] {
  // SADDLES
  if (urlPath.includes('/saddle')) {
    return [
      '<strong>Premium Leather:</strong> European craftsmanship with supple, long-lasting leather that ages beautifully',
      '<strong>Ergonomic Design:</strong> Engineered for rider position and horse comfort with balanced weight distribution',
      '<strong>Custom Fitting:</strong> Expert fitting advice available to ensure proper fit for both horse and rider',
      '<strong>Lasting Value:</strong> Investment-quality saddles that maintain their performance and value for years'
    ];
  }
  
  // RUGS
  if (urlPath.includes('/rug')) {
    return [
      '<strong>Weather Protection:</strong> Waterproof, breathable fabrics that shield from rain, wind, and sun',
      '<strong>Secure Fit:</strong> Adjustable straps, leg arches, and tail flaps that stay in place during turnout',
      '<strong>Durable Construction:</strong> Reinforced stress points and quality materials for seasons of use',
      '<strong>Easy Care:</strong> Machine washable designs that maintain their protective qualities'
    ];
  }
  
  // BOOTS (Horse)
  if (urlPath.includes('/boot') && urlPath.includes('/horse')) {
    return [
      '<strong>Impact Protection:</strong> Advanced materials that absorb shock and protect against strikes',
      '<strong>Secure Fastenings:</strong> Straps and closures that stay in place without restricting movement',
      '<strong>Breathable Design:</strong> Ventilated materials that prevent heat buildup during work',
      '<strong>Easy Maintenance:</strong> Durable, washable materials that stay looking good'
    ];
  }
  
  // BRIDLES & BITS
  if (urlPath.includes('/bridle') || urlPath.includes('/bit')) {
    return [
      '<strong>Quality Materials:</strong> Premium leather and stainless steel built to last',
      '<strong>Adjustable Fit:</strong> Multiple adjustment points for perfect horse comfort',
      '<strong>Classic Styling:</strong> Traditional designs that look professional in any setting',
      '<strong>Reliable Hardware:</strong> Buckles and fittings that won\'t rust or break'
    ];
  }
  
  // SADDLE PADS
  if (urlPath.includes('/pad')) {
    return [
      '<strong>Pressure Distribution:</strong> Advanced cushioning that protects your horse\'s back',
      '<strong>Moisture Management:</strong> Wicking fabrics that keep your horse dry and comfortable',
      '<strong>Anatomical Shape:</strong> Contoured designs that complement saddle fit',
      '<strong>Non-Slip:</strong> Materials that stay in place without migrating'
    ];
  }
  
  // BREECHES & JODHPURS
  if (urlPath.includes('/breech') || urlPath.includes('/jodhpur')) {
    return [
      '<strong>Four-Way Stretch:</strong> Technical fabrics that move with you in the saddle',
      '<strong>Grip Technology:</strong> Silicone or leather patches for security and stability',
      '<strong>Flattering Fit:</strong> Tailored designs that look professional and feel comfortable',
      '<strong>Durable Construction:</strong> Reinforced seams and inner legs for long-lasting wear'
    ];
  }
  
  // HELMETS
  if (urlPath.includes('/helmet')) {
    return [
      '<strong>Safety Certified:</strong> Meets Australian and international standards for rider protection',
      '<strong>Advanced Technology:</strong> Multi-impact foam and reinforced shells for maximum safety',
      '<strong>Comfortable Fit:</strong> Adjustable systems and ventilation for all-day wear',
      '<strong>Contemporary Style:</strong> Modern designs that look great while keeping you safe'
    ];
  }
  
  // JACKETS
  if (urlPath.includes('/jacket') && urlPath.includes('/clothing')) {
    return [
      '<strong>Weather Resistance:</strong> Fabrics that protect from wind, rain, and cold',
      '<strong>Freedom of Movement:</strong> Stretch panels and tailored cuts for riding comfort',
      '<strong>Practical Features:</strong> Pockets, zips, and details designed for equestrians',
      '<strong>Versatile Styling:</strong> Designs that transition from stable to everyday wear'
    ];
  }
  
  // BOOTS (Rider)
  if (urlPath.includes('/boot') && urlPath.includes('/clothing')) {
    return [
      '<strong>Quality Leather:</strong> Premium materials that mold to your foot for custom fit',
      '<strong>Supportive Construction:</strong> Structured design for ankle support and comfort',
      '<strong>Non-Slip Soles:</strong> Grip patterns designed for stirrup safety',
      '<strong>Lasting Quality:</strong> Durable construction for years of riding'
    ];
  }
  
  // GROOMING
  if (urlPath.includes('/groom')) {
    return [
      '<strong>Professional Tools:</strong> Quality brushes and combs designed for effective grooming',
      '<strong>Gentle Products:</strong> Formulas safe for horse skin and coat',
      '<strong>Complete Care:</strong> Everything needed from daily grooming to show preparation',
      '<strong>Easy to Use:</strong> Ergonomic designs that make grooming more enjoyable'
    ];
  }
  
  // GENERIC FALLBACK
  return [
    '<strong>Premium Quality:</strong> Products from trusted equestrian brands with proven performance',
    '<strong>Expert Selection:</strong> Carefully chosen by experienced equestrians who understand your needs',
    '<strong>Australian Ready:</strong> Suitable for our climate and conditions',
    '<strong>Fast Delivery:</strong> Most orders dispatched within 24 hours nationwide'
  ];
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, allRows: CsvRow[], dryRun: boolean): Promise<boolean> {
  // Skip pet pages
  if (row.url_path.startsWith('/pet')) {
    return false;
  }
  
  const oldLongDesc = row.long_description;
  const newLongDesc = generateUniqueLongDescription(row, allRows);
  
  // Check if current description is generic/template
  const isGeneric = oldLongDesc.includes('Browse our specialized collection') || 
                    oldLongDesc.includes('Browse our extensive collection') ||
                    oldLongDesc.length < 300;
  
  if (!isGeneric && oldLongDesc.length > 800) {
    // Already has substantial custom content
    return false;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${row.url_path}`);
  console.log(`   H1: ${row.h1_title}`);
  console.log(`   OLD length: ${oldLongDesc.length} chars`);
  console.log(`   NEW length: ${newLongDesc.length} chars`);
  
  if (!dryRun) {
    row.long_description = newLongDesc;
  }
  
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n📝 FIX LONG DESCRIPTIONS - EQUESTRIAN PAGES\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-long-desc-${timestamp}.csv`);
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
  console.log(`Long descriptions changed: ${changed}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
