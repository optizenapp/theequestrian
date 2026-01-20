#!/usr/bin/env tsx

/**
 * Fix Short Descriptions - Pet Pages
 * 
 * Creates unique, contextual short descriptions for each pet page
 * instead of generic templates. Focused on pet care, not riding.
 * 
 * Usage:
 *   npm run fix-short-desc-pet -- --dry-run
 *   npm run fix-short-desc-pet
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

/**
 * Generate unique short description for pet products
 */
function generateUniquePetShortDescription(row: CsvRow): string {
  const h1Lower = row.h1_title.toLowerCase();
  const urlPath = row.url_path.toLowerCase();
  
  // DOG PRODUCTS
  if (urlPath.includes('/dog')) {
    
    // Collars & Leads
    if (urlPath.includes('collar') || urlPath.includes('lead')) {
      return 'Quality dog collars and leads built for Australian conditions. Durable materials, comfortable designs, and secure fittings for safe walks and training sessions.';
    }
    
    // Dog Toys
    if (urlPath.includes('toy')) {
      return 'Engaging dog toys that provide mental stimulation and physical exercise. Safe, durable designs that withstand enthusiastic play, perfect for keeping your dog entertained.';
    }
    
    // Dog Treats
    if (urlPath.includes('treat')) {
      return 'Delicious, nutritious dog treats made with quality ingredients. Perfect for training rewards or special moments, with options for all dietary needs and preferences.';
    }
    
    // Dog Grooming
    if (urlPath.includes('groom')) {
      return 'Complete dog grooming supplies for a healthy coat and happy pup. From brushes to shampoos, gentle formulas and professional tools for at-home grooming.';
    }
    
    // Dog Food
    if (urlPath.includes('food')) {
      return 'Nutritionally balanced dog food from trusted brands. Complete meals formulated for different life stages, sizes, and dietary requirements with fast Australian delivery.';
    }
    
    // Dog Accessories
    if (urlPath.includes('accessories')) {
      return 'Essential dog accessories for comfort and convenience. Quality products designed to make life easier for you and more enjoyable for your four-legged friend.';
    }
    
    // Dog Bedding
    if (urlPath.includes('bed')) {
      return 'Comfortable, supportive dog beds for restful sleep. Durable fabrics, washable covers, and sizes for every breed, shipped fast across Australia.';
    }
    
    // Dog Health & Supplements
    if (urlPath.includes('supplement') || urlPath.includes('health')) {
      return 'Quality dog supplements and health products for optimal wellbeing. Support joint health, digestion, coat condition, and overall vitality with trusted formulas.';
    }
    
    // Dog Walking & Exercise
    if (urlPath.includes('walk')) {
      return 'Essential gear for enjoyable dog walks and outdoor adventures. Comfortable harnesses, extendable leads, and accessories for active Australian dogs.';
    }
    
    // Dog Coats & Fashion
    if (urlPath.includes('coat') || urlPath.includes('rug') || urlPath.includes('fashion')) {
      return 'Stylish and functional dog coats for Australian weather. From rain protection to winter warmth, quality designs that fit comfortably and look great.';
    }
    
    // Dog Kennels & Carriers
    if (urlPath.includes('kennel') || urlPath.includes('carrier')) {
      return 'Safe, comfortable kennels and carriers for home and travel. Quality construction, adequate ventilation, and sizes suitable for all breeds and purposes.';
    }
    
    // Veterinary & Medical
    if (urlPath.includes('vet') || urlPath.includes('flea') || urlPath.includes('worm')) {
      return 'Effective veterinary products for dog health and parasite control. Trusted treatments and preventatives to keep your dog healthy and protected.';
    }
    
    // Skin Care & Potions
    if (urlPath.includes('skin') || urlPath.includes('potion')) {
      return 'Gentle skin care products for dogs with sensitive skin. Natural formulas that soothe, protect, and promote healthy skin and coat condition.';
    }
    
    // Generic dog fallback
    return 'Quality dog products selected for your pet\'s health and happiness. Trusted brands, practical designs, and fast shipping across Australia.';
  }
  
  // CAT PRODUCTS
  if (urlPath.includes('/cat')) {
    
    // Cat Toys
    if (urlPath.includes('toy') || urlPath.includes('gym')) {
      return 'Interactive cat toys and climbing gyms that engage natural instincts. From feather wands to scratching posts, keep your cat entertained and active.';
    }
    
    // Cat Food
    if (urlPath.includes('food') || urlPath.includes('treat')) {
      return 'Premium cat food and treats formulated for feline health. Complete nutrition for all life stages, with flavours even fussy cats will love.';
    }
    
    // Cat Litter
    if (urlPath.includes('litter')) {
      return 'High-quality cat litter with superior odor control. From clumping clay to natural options, find the perfect litter for your home and your cat\'s preferences.';
    }
    
    // Cat Accessories
    if (urlPath.includes('accessories')) {
      return 'Essential cat accessories for comfort and enrichment. Quality products designed for feline needs, from feeding bowls to cozy beds and grooming tools.';
    }
    
    // Cat Skin Care
    if (urlPath.includes('skin') || urlPath.includes('potion')) {
      return 'Gentle grooming and skin care products formulated for cats. Safe, effective solutions for coat health, flea prevention, and sensitive skin care.';
    }
    
    // Generic cat fallback
    return 'Quality cat products chosen for feline health and happiness. Everything your cat needs for comfort, play, and wellbeing with fast Australian delivery.';
  }
  
  // BIRD PRODUCTS
  if (urlPath.includes('/bird')) {
    
    // Bird Toys
    if (urlPath.includes('toy')) {
      return 'Stimulating bird toys that provide mental enrichment and physical activity. Safe, durable designs for foraging, climbing, and play that birds love.';
    }
    
    // Bird Cages
    if (urlPath.includes('cage') || urlPath.includes('furniture')) {
      return 'Spacious, safe bird cages and furniture for happy, healthy birds. Quality construction with appropriate bar spacing and easy-clean designs.';
    }
    
    // Bird Food
    if (urlPath.includes('food') || urlPath.includes('treat')) {
      return 'Nutritious bird food and treats for optimal avian health. Species-specific formulas with quality seeds, pellets, and supplements for vitality.';
    }
    
    // Bird Care
    if (urlPath.includes('care') || urlPath.includes('potion')) {
      return 'Essential bird care products for health and hygiene. From supplements to grooming aids, everything needed for proper avian care and wellness.';
    }
    
    // Generic bird fallback
    return 'Quality bird products for health and enrichment. Trusted brands, species-appropriate designs, and fast shipping across Australia.';
  }
  
  // SMALL ANIMAL PRODUCTS
  if (urlPath.includes('/small-animal')) {
    return 'Complete small animal supplies for rabbits, guinea pigs, hamsters, and more. Quality habitats, food, toys, and care products with expert advice available.';
  }
  
  // POULTRY PRODUCTS
  if (urlPath.includes('/poultry')) {
    return 'Essential poultry supplies for backyard chickens and birds. From feeders to health products, everything needed for happy, productive poultry keeping.';
  }
  
  // PET SUPPLEMENTS (General)
  if (urlPath.includes('/pet/supplement') || urlPath.includes('/pet/probiotic')) {
    return 'Quality pet supplements for overall health and vitality. Trusted formulas supporting digestion, joint health, immunity, and wellbeing for dogs, cats, and more.';
  }
  
  // PONY (Shetland)
  if (urlPath.includes('/pony')) {
    return 'Specialized products for ponies and miniature horses. Appropriately sized tack, rugs, and care items designed specifically for smaller equines.';
  }
  
  // GENERIC PET FALLBACK
  return 'Quality pet products for health, happiness, and wellbeing. Trusted brands, expert advice, and fast delivery across Australia.';
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

async function processPage(row: CsvRow, dryRun: boolean): Promise<boolean> {
  // Only process pet pages
  if (!row.url_path.startsWith('/pet')) {
    return false;
  }
  
  const oldShortDesc = row.short_description;
  const newShortDesc = generateUniquePetShortDescription(row);
  
  // Check if it needs changing
  if (oldShortDesc === newShortDesc) {
    return false;
  }
  
  // Check if old is generic template
  const isGeneric = oldShortDesc.includes('Expertly selected for quality');
  
  if (!isGeneric && oldShortDesc.length > 100) {
    // Already has custom content
    return false;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🐾 ${row.url_path}`);
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
  
  console.log('\n🐾 FIX SHORT DESCRIPTIONS - PET PAGES\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`CSV: ${CSV_PATH}\n`);
  
  // Create backup
  if (!dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `-backup-short-desc-pet-${timestamp}.csv`);
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
    if (row.url_path.startsWith('/pet')) {
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
  console.log(`Pet pages processed: ${processed}`);
  console.log(`Short descriptions changed: ${changed}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes saved)' : 'LIVE (changes saved)'}`);
  console.log(`${'='.repeat(80)}\n`);
}

main().catch(console.error);
