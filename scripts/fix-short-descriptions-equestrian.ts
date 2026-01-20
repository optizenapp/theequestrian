#!/usr/bin/env tsx

/**
 * Fix Short Descriptions - Equestrian Pages
 * 
 * Creates unique, contextual short descriptions for each equestrian page
 * instead of generic templates. Uses actual product types and category context.
 * 
 * Usage:
 *   npm run fix-short-desc-equestrian -- --dry-run
 *   npm run fix-short-desc-equestrian
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
 * Get actual product types from Shopify mapping
 */
function getActualProductTypes(urlPath: string): string[] {
  const parts = urlPath.split('/').filter(p => p);
  if (parts.length === 0) return [];
  
  const category = parts[0];
  const subcategory = parts[1] || undefined;
  const subsubcategory = parts[2] || undefined;
  
  try {
    return getProductTypesForCollection(category, subcategory, subsubcategory);
  } catch (error) {
    return [];
  }
}

/**
 * Generate unique short description based on category and context
 */
function generateUniqueShortDescription(row: CsvRow): string {
  const productTypes = getActualProductTypes(row.url_path);
  const h1Lower = row.h1_title.toLowerCase();
  const urlPath = row.url_path.toLowerCase();
  
  // HORSE PRODUCTS
  if (urlPath.startsWith('/horse')) {
    
    // Saddles
    if (urlPath.includes('/saddle')) {
      if (h1Lower.includes('jump')) {
        return 'Discover jumping saddles designed for forward position and close contact. Premium leather construction from leading brands, available with expert fitting advice Australia-wide.';
      }
      if (h1Lower.includes('dressage')) {
        return 'Explore dressage saddles crafted for deep seat and optimal leg position. Traditional craftsmanship meets modern design, shipped fast across Australia.';
      }
      if (h1Lower.includes('all-purpose') || h1Lower.includes('general')) {
        return 'Browse versatile all-purpose saddles suitable for multiple disciplines. Quality construction that adapts to your riding style, with Australia-wide delivery.';
      }
      return 'Shop premium saddles for every discipline and riding level. Expert craftsmanship, superior comfort, and fast Australian shipping on all orders.';
    }
    
    // Rugs & Blankets
    if (urlPath.includes('/rug')) {
      if (h1Lower.includes('summer') || h1Lower.includes('fly')) {
        return 'Protect your horse from summer sun and flies with lightweight, breathable rugs. UV protection and fly mesh designs suited to Australian conditions.';
      }
      if (h1Lower.includes('winter') || h1Lower.includes('heavy')) {
        return 'Keep your horse warm through cold weather with heavyweight turnout rugs. Waterproof, breathable designs built for Australian winters.';
      }
      if (h1Lower.includes('stable')) {
        return 'Shop stable rugs for indoor warmth and comfort. Premium materials and perfect fit, ready to ship across Australia within 24 hours.';
      }
      if (h1Lower.includes('cooler')) {
        return 'Essential cooling rugs for post-exercise temperature management. Moisture-wicking fabrics that speed up drying time after work or bathing.';
      }
      return 'Explore our complete range of horse rugs for every season and purpose. Quality fabrics, secure fittings, and fast delivery Australia-wide.';
    }
    
    // Boots & Leg Protection
    if (urlPath.includes('/boot')) {
      if (h1Lower.includes('jump') || h1Lower.includes('tendon')) {
        return 'Protect your horse\'s legs during jumping with specialized tendon boots. Impact-absorbing designs from trusted brands, shipped fast across Australia.';
      }
      if (h1Lower.includes('brush')) {
        return 'Essential brushing boots to prevent knocks and scrapes during training. Lightweight, breathable protection for everyday riding and schooling.';
      }
      if (h1Lower.includes('travel')) {
        return 'Keep your horse safe during transport with protective travel boots. Full leg coverage with padding, perfect for Australian conditions.';
      }
      return 'Shop horse boots and leg protection for training, competition, and travel. Trusted brands with impact absorption and secure fastenings.';
    }
    
    // Bridles & Bits
    if (urlPath.includes('/bridle') || urlPath.includes('/bit')) {
      if (h1Lower.includes('bit')) {
        return 'Find the perfect bit for clear communication with your horse. From snaffles to doubles, quality materials and expert advice available.';
      }
      if (h1Lower.includes('snaffle')) {
        return 'Shop snaffle bridles for training and everyday riding. Premium leather, comfortable fit, and classic styling from trusted manufacturers.';
      }
      return 'Explore quality bridles crafted from premium leather. Adjustable fit, durable hardware, and designs for every discipline with fast Australian delivery.';
    }
    
    // Halters & Leads
    if (urlPath.includes('/halter') || urlPath.includes('/lead')) {
      return 'Choose from quality halters and lead ropes for safe horse handling. Soft, strong materials with secure fittings, shipped across Australia.';
    }
    
    // Saddle Pads
    if (urlPath.includes('/pad')) {
      if (h1Lower.includes('gel')) {
        return 'Advanced gel saddle pads for superior shock absorption. Protects your horse\'s back during work while maintaining saddle stability.';
      }
      if (h1Lower.includes('numnah')) {
        return 'Quality numnahs in various shapes and materials. Breathable, moisture-wicking designs that complement your saddle perfectly.';
      }
      if (h1Lower.includes('wither')) {
        return 'Specialized wither relief pads for horses with high or sensitive withers. Extra cushioning where it\'s needed most.';
      }
      return 'Shop saddle pads and numnahs for comfort and protection. Moisture-wicking materials, perfect fit, and fast delivery across Australia.';
    }
    
    // Grooming
    if (urlPath.includes('/groom')) {
      return 'Complete grooming supplies for a healthy, shiny coat. From brushes to shampoos, everything you need for professional horse care at home.';
    }
    
    // Stable & Yard
    if (urlPath.includes('/stable')) {
      if (h1Lower.includes('fly')) {
        return 'Effective fly control products to keep your horse comfortable. Masks, sprays, and veils designed for Australian fly conditions.';
      }
      return 'Essential stable and yard equipment for daily horse care. Durable, practical products from trusted brands with fast Australian shipping.';
    }
    
    // Training Equipment
    if (urlPath.includes('/training')) {
      return 'Professional training equipment for ground work and development. From lunge lines to schooling whips, quality gear for effective training.';
    }
    
    // Generic horse fallback
    return 'Quality horse equipment selected for performance and durability. Trusted brands, expert advice, and fast delivery across Australia.';
  }
  
  // RIDER & CLOTHING
  if (urlPath.startsWith('/rider') || urlPath.startsWith('/clothing')) {
    
    // Helmets & Safety
    if (urlPath.includes('/helmet')) {
      return 'Safety-certified riding helmets combining protection with style. Advanced impact technology, comfortable ventilation, and designs for every discipline.';
    }
    
    // Breeches & Jodhpurs
    if (urlPath.includes('/breech') || urlPath.includes('/jodhpur')) {
      if (h1Lower.includes('kids') || h1Lower.includes('children')) {
        return 'Comfortable, durable kids\' riding pants built for growth and activity. Reinforced knees, stretchy fabrics, and styles they\'ll love wearing.';
      }
      if (h1Lower.includes('men')) {
        return 'Men\'s riding breeches engineered for comfort in the saddle. Technical fabrics with reinforced inner legs and professional styling.';
      }
      if (h1Lower.includes('competition') || h1Lower.includes('show')) {
        return 'Competition breeches designed for the show ring. Sleek styling, perfect fit, and technical fabrics that maintain their look all day.';
      }
      return 'Discover riding breeches and jodhpurs for every discipline and occasion. Technical fabrics, reinforced seams, and comfortable fit for long days in the saddle.';
    }
    
    // Riding Tops
    if (urlPath.includes('/top') || urlPath.includes('/shirt') || urlPath.includes('/polo')) {
      if (h1Lower.includes('competition') || h1Lower.includes('show')) {
        return 'Elegant competition shirts for a polished show ring appearance. Moisture-wicking fabrics that look crisp under jackets all day.';
      }
      if (h1Lower.includes('sun') || h1Lower.includes('rash')) {
        return 'Sun-safe riding tops with UPF protection for Australian conditions. Lightweight, breathable fabrics perfect for hot weather training.';
      }
      return 'Comfortable riding tops combining style and function. Breathable, moisture-wicking fabrics that move with you in the saddle.';
    }
    
    // Jackets
    if (urlPath.includes('/jacket')) {
      if (h1Lower.includes('show') || h1Lower.includes('competition')) {
        return 'Tailored competition jackets for a professional show ring presence. Classic styling with technical features for comfort and movement.';
      }
      if (h1Lower.includes('rain') || h1Lower.includes('waterproof')) {
        return 'Waterproof riding jackets to keep you dry in all weather. Breathable fabrics with freedom of movement for riding and stable work.';
      }
      if (h1Lower.includes('softshell')) {
        return 'Versatile softshell jackets perfect for training and casual riding. Weather-resistant, stretchy, and comfortable for everyday equestrian life.';
      }
      return 'Quality riding jackets for every season and discipline. Functional designs that look great in the arena, paddock, or stable yard.';
    }
    
    // Footwear
    if (urlPath.includes('/footwear') || urlPath.includes('/boot')) {
      if (h1Lower.includes('jodhpur') || h1Lower.includes('paddock')) {
        return 'Classic jodhpur boots for schooling and everyday riding. Comfortable leather that molds to your foot with secure ankle support.';
      }
      if (h1Lower.includes('long') || h1Lower.includes('dress')) {
        return 'Elegant long riding boots for competition and formal occasions. Premium leather construction with slim fit and traditional styling.';
      }
      if (h1Lower.includes('yard') || h1Lower.includes('muck')) {
        return 'Durable yard boots for stable work and wet conditions. Waterproof, easy to clean, and comfortable for all-day wear.';
      }
      return 'Quality riding boots designed for comfort and performance. From schooling to show ring, find the perfect pair for your equestrian lifestyle.';
    }
    
    // Gloves
    if (urlPath.includes('/glove')) {
      return 'Riding gloves offering superior grip and feel on the reins. Breathable materials, reinforced palms, and styles for every season and discipline.';
    }
    
    // Accessories
    if (urlPath.includes('/accessories')) {
      if (h1Lower.includes('sock')) {
        return 'Technical riding socks for comfort in boots all day. Moisture-wicking, cushioned, and designed to stay up during riding and barn work.';
      }
      if (h1Lower.includes('belt')) {
        return 'Quality belts to complete your riding outfit. Classic designs in leather and technical materials suitable for competition and training.';
      }
      if (h1Lower.includes('cap')) {
        return 'Stylish caps and headwear for stable work and casual wear. Sun protection with equestrian flair, perfect for Australian conditions.';
      }
      return 'Essential riding accessories to complete your equestrian wardrobe. Quality details that make a difference in style and function.';
    }
    
    // Luggage & Bags
    if (urlPath.includes('/luggage') || urlPath.includes('/bag')) {
      if (h1Lower.includes('boot')) {
        return 'Protective boot bags to transport and store your riding boots. Durable materials with compartments for clean storage and travel.';
      }
      if (h1Lower.includes('helmet')) {
        return 'Padded helmet bags for safe transport and storage. Hard-shell and soft options to protect your essential safety equipment.';
      }
      if (h1Lower.includes('garment')) {
        return 'Garment bags designed for competition wear. Keep jackets and shirts pristine during transport to shows and events.';
      }
      if (h1Lower.includes('handbag')) {
        return 'Stylish equestrian-themed handbags for everyday use. Practical designs with horse-lover details that showcase your passion.';
      }
      return 'Practical gear bags for equestrians on the go. Organize and transport everything from boots to show wear with durable, well-designed luggage.';
    }
    
    // Generic rider/clothing fallback
    return 'Quality equestrian apparel designed for riders who demand both style and performance. Technical fabrics, perfect fit, and fast delivery.';
  }
  
  // ACCESSORIES (general)
  if (urlPath.startsWith('/accessories')) {
    return 'Discover unique equestrian accessories and gifts. Quality products for horse lovers, from practical to decorative, all shipped fast across Australia.';
  }
  
  // GENERIC FALLBACK
  return 'Expertly curated equestrian products from trusted brands. Quality, performance, and style with fast shipping across Australia.';
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, dryRun: boolean): Promise<boolean> {
  // Skip pet pages
  if (row.url_path.startsWith('/pet')) {
    return false;
  }
  
  const oldShortDesc = row.short_description;
  const newShortDesc = generateUniqueShortDescription(row);
  
  // Check if it needs changing
  if (oldShortDesc === newShortDesc) {
    return false;
  }
  
  // Check if old is generic template
  const isGeneric = oldShortDesc.includes('Expertly selected for quality, durability, and performance');
  
  if (!isGeneric && oldShortDesc.length > 100) {
    // Already has custom content
    return false;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${row.url_path}`);
  console.log(`   H1: ${row.h1_title}`);
  console.log(`   OLD: ${oldShortDesc.substring(0, 80)}...`);
  console.log(`   NEW: ${newShortDesc.substring(0, 80)}...`);
  
  if (!dryRun) {
    row.short_description = newShortDesc;
  }
  
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n📝 FIX SHORT DESCRIPTIONS - EQUESTRIAN PAGES\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-short-desc-${timestamp}.csv`);
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
      const wasChanged = await processPage(row, dryRun);
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
  console.log(`Short descriptions changed: ${changed}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
