#!/usr/bin/env tsx

/**
 * Script 12: Generate Unique Intros
 * 
 * Generates unique opening paragraphs for each category
 * - Uses category context and hierarchy
 * - Includes specific product types
 * - Adds compelling hooks
 * 
 * Usage:
 *   npm run generate-intros -- --dry-run  (preview changes)
 *   npm run generate-intros -- --yes      (apply changes)
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

function generateIntro(row: CsvRow): string {
  const { url_path, h1_title, parent_url, category_level } = row;
  const level = parseInt(category_level);
  
  // Get category context
  const segments = url_path.split('/').filter(s => s);
  const mainCategory = segments[0] || '';
  const subCategory = segments[1] || '';
  
  // Generate intro based on category type and level
  let intro = '';
  
  // Level 1 categories (main categories)
  if (level === 1) {
    switch (mainCategory) {
      case 'horse':
        intro = `<h2>Premium Horse Equipment & Supplies</h2><p>Discover everything you need to care for, ride, and compete with your horse. From essential daily care items to competition-grade equipment, our carefully curated collection features products from the world's most trusted equestrian brands. Whether you're preparing for your first show or maintaining a seasoned competitor, find quality gear designed for Australian conditions.</p>`;
        break;
      case 'rider':
        intro = `<h2>Essential Rider Equipment & Apparel</h2><p>Safety, comfort, and performance start with the right rider equipment. Our collection includes certified safety gear, premium riding apparel, and essential accessories for riders of all levels. From your first helmet to competition-ready attire, we stock products that meet Australian safety standards and perform in our unique climate.</p>`;
        break;
      case 'clothing':
        intro = `<h2>Premium Equestrian Clothing</h2><p>Look professional in the arena and feel comfortable in the saddle with our extensive range of riding apparel. Featuring technical fabrics designed for performance, traditional styles for competition, and casual wear for the barn, our collection includes options for every rider and every occasion. All sizing includes Australian conversions for easy ordering.</p>`;
        break;
      case 'pet':
        intro = `<h2>Quality Pet Supplies</h2><p>Keep your four-legged companions happy and healthy with our range of pet supplies. From nutritious treats to engaging toys, we stock quality products for dogs, cats, birds, and small animals. All products meet Australian safety standards with fast shipping nationwide.</p>`;
        break;
      case 'accessories':
        intro = `<h2>Equestrian Accessories & Essentials</h2><p>Complete your equestrian lifestyle with our range of accessories. From practical everyday items to special gifts for horse lovers, find unique products that combine functionality with style. Perfect for treating yourself or finding that special gift for the equestrian in your life.</p>`;
        break;
      default:
        intro = `<h2>${h1_title}</h2><p>Explore our comprehensive range of ${h1_title.toLowerCase()} products. Quality items from trusted brands, all available with free shipping Australia-wide.</p>`;
    }
  }
  // Level 2 categories (subcategories)
  else if (level === 2) {
    // Generate contextual intro based on parent category
    if (mainCategory === 'horse') {
      intro = generateHorseSubcategoryIntro(subCategory, h1_title);
    } else if (mainCategory === 'rider') {
      intro = generateRiderSubcategoryIntro(subCategory, h1_title);
    } else if (mainCategory === 'clothing') {
      intro = generateClothingSubcategoryIntro(subCategory, h1_title);
    } else if (mainCategory === 'pet') {
      intro = generatePetSubcategoryIntro(subCategory, h1_title);
    } else {
      intro = `<h2>${h1_title}</h2><p>Browse our selection of ${h1_title.toLowerCase()}. Quality products from leading brands with fast shipping Australia-wide.</p>`;
    }
  }
  // Level 3+ categories (specific product types)
  else {
    intro = `<h2>${h1_title}</h2><p>Find the perfect ${h1_title.toLowerCase()} for your needs. Our curated selection features quality options from trusted brands, all available with free shipping Australia-wide.</p>`;
  }
  
  return intro;
}

function generateHorseSubcategoryIntro(subCategory: string, title: string): string {
  const intros: Record<string, string> = {
    'rugs': `<h2>Horse Rugs for Every Season</h2><p>Protect your horse in all weather conditions with our comprehensive range of horse rugs. From lightweight summer sheets to heavy winter turnout rugs, we stock options for every Australian climate zone. Choose from trusted brands like Weatherbeeta, Horseware, and Rambo, with sizing and fill weight guidance to help you select the perfect fit.</p>`,
    'saddles': `<h2>Quality Saddles for Every Discipline</h2><p>Find your perfect saddle from our range of dressage, jumping, and all-purpose designs. Whether you need a competition saddle or an everyday training option, we stock quality leather and synthetic saddles from respected manufacturers. Professional saddle fitting advice available to ensure the best fit for both horse and rider.</p>`,
    'boots': `<h2>Protective Horse Boots</h2><p>Keep your horse's legs safe during work and turnout with our range of protective boots. From brushing boots and tendon boots to travel boots and bell boots, find the right protection for your discipline and training needs. Quality construction from brands trusted by riders worldwide.</p>`,
    'grooming': `<h2>Complete Grooming Solutions</h2><p>Maintain your horse's health and appearance with our extensive grooming range. From essential daily tools to specialized show preparation products, we stock everything you need for thorough horse care. Complete grooming kits available for beginners, plus individual tools for specific needs.</p>`,
    'supplements': `<h2>Equine Health Supplements</h2><p>Support your horse's health and performance with our range of quality supplements. From joint support and digestive aids to vitamins and calming products, find targeted solutions for your horse's specific needs. All products comply with Australian regulations, with guidance on competition use where relevant.</p>`,
    'tack': `<h2>Quality Horse Tack</h2><p>Equip your horse with properly fitted, quality tack. Our range includes bridles, reins, girths, stirrups, and saddle pads from trusted manufacturers. Whether you're starting out or upgrading your equipment, find tack that combines functionality with durability.</p>`,
  };
  
  return intros[subCategory] || `<h2>${title}</h2><p>Explore our range of ${title.toLowerCase()} designed for quality and performance. Trusted brands with fast Australian shipping.</p>`;
}

function generateRiderSubcategoryIntro(subCategory: string, title: string): string {
  const intros: Record<string, string> = {
    'helmets': `<h2>Safety-Certified Riding Helmets</h2><p>Your helmet is your most important piece of riding equipment. Our range includes helmets meeting AS/NZS 3838 Australian safety standards from leading manufacturers like Charles Owen, Samshield, and KEP. Find the perfect combination of safety, comfort, and style with options for every discipline and budget.</p>`,
    'boots': `<h2>Riding Boots for Every Discipline</h2><p>Step into quality with our range of riding boots. From traditional tall leather boots to practical paddock boots and half chaps, find footwear that combines comfort, durability, and style. Available in multiple calf widths and heights with sizing guidance to ensure the perfect fit.</p>`,
    'gloves': `<h2>Riding Gloves for All Conditions</h2><p>Maintain secure rein contact and protect your hands with our range of riding gloves. From lightweight summer styles to insulated winter options, find gloves that offer the right combination of grip, feel, and weather protection for Australian conditions.</p>`,
    'spurs': `<h2>Spurs & Spur Accessories</h2><p>Refine your aids with properly fitted spurs. Our range includes dressage and jumping styles in various lengths and designs, plus quality spur straps. Find the right spurs for your level and discipline with guidance on appropriate use.</p>`,
  };
  
  return intros[subCategory] || `<h2>${title}</h2><p>Browse our selection of ${title.toLowerCase()} designed for rider comfort and performance. Quality products with Australian shipping.</p>`;
}

function generateClothingSubcategoryIntro(subCategory: string, title: string): string {
  const intros: Record<string, string> = {
    'womens': `<h2>Ladies' Riding Clothing</h2><p>Discover riding apparel designed specifically for women riders. From technical breeches and competition wear to casual barn clothing, our range combines performance fabrics with flattering fits. Featuring brands like Pikeur, Cavallo, and Ariat, with European sizing converted to Australian standards.</p>`,
    'mens': `<h2>Men's Riding Apparel</h2><p>Find riding clothing built for male riders. Our collection includes performance breeches, competition shirts, and casual wear designed for comfort in the saddle and style at the barn. Quality brands with sizing guidance for easy ordering.</p>`,
    'kids': `<h2>Children's Riding Clothing</h2><p>Outfit young riders with quality apparel that grows with them. From first jodhpurs to competition wear, our range includes durable, comfortable clothing designed for active kids. Affordable options that don't compromise on quality or safety.</p>`,
    'breeches': `<h2>Riding Breeches & Jodhpurs</h2><p>Find your perfect fit in our extensive breeches collection. Choose from full-seat and knee-patch styles in technical fabrics designed for Australian conditions. Featuring top brands with detailed sizing charts and care instructions to keep your breeches performing at their best.</p>`,
  };
  
  return intros[subCategory] || `<h2>${title}</h2><p>Shop our range of ${title.toLowerCase()} combining style, comfort, and performance. Quality equestrian apparel with Australian sizing.</p>`;
}

function generatePetSubcategoryIntro(subCategory: string, title: string): string {
  const intros: Record<string, string> = {
    'dog': `<h2>Dog Supplies & Treats</h2><p>Treat your canine companion with our range of dog products. From nutritious treats to engaging toys, find quality supplies that keep your dog happy and healthy. All products meet Australian safety standards.</p>`,
    'cat': `<h2>Cat Supplies & Accessories</h2><p>Keep your feline friend entertained and well-cared for with our cat product range. From treats to toys and accessories, find everything you need for your cat's wellbeing.</p>`,
  };
  
  return intros[subCategory] || `<h2>${title}</h2><p>Browse our ${title.toLowerCase()} selection. Quality pet products with fast Australian delivery.</p>`;
}

function replaceIntro(description: string, newIntro: string): string {
  // Remove existing intro (first h2 and following paragraph)
  const withoutIntro = description.replace(/^<h2>[\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>\s*/, '');
  
  // Add new intro at the beginning
  return newIntro + '\n' + withoutIntro;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run generate-intros -- --dry-run  (preview changes)');
    console.log('  npm run generate-intros -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; level: number }> = [];
  
  // Process each row - only regenerate for level 1 and 2
  for (const row of rows) {
    const level = parseInt(row.category_level);
    
    if (level <= 2) {
      const newIntro = generateIntro(row);
      const oldLongDesc = row.long_description;
      const newLongDesc = replaceIntro(oldLongDesc, newIntro);
      
      if (oldLongDesc !== newLongDesc) {
        changedCount++;
        changes.push({
          url: row.url_path,
          level,
        });
        
        if (!dryRun) {
          row.long_description = newLongDesc;
        }
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 20):\n`);
  changes.slice(0, 20).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url} (Level ${change.level})`);
  });
  
  if (changes.length > 20) {
    console.log(`\n... and ${changes.length - 20} more changes\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Rows changed: ${changedCount}`);
  console.log(`   Unchanged: ${rows.length - changedCount}`);
  
  // Show breakdown by level
  const byLevel: Record<number, number> = {};
  changes.forEach(c => {
    byLevel[c.level] = (byLevel[c.level] || 0) + 1;
  });
  
  console.log('\n   Changes by category level:');
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`     Level ${level}: ${count}`);
  });
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No changes made.');
    console.log('   Run with --yes to apply changes.');
  } else {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-unique-intros-${timestamp}.csv`);
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
