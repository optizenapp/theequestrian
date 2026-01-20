#!/usr/bin/env tsx

/**
 * Script 7: Rewrite FAQs
 * 
 * Rewrites all FAQ questions to be category-specific
 * - Provides detailed, helpful answers
 * - Adds technical specifications
 * - Includes Australian-specific information
 * 
 * Usage:
 *   npm run rewrite-faqs -- --dry-run  (preview changes)
 *   npm run rewrite-faqs -- --yes      (apply changes)
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

interface FAQ {
  question: string;
  answer: string;
}

// Category-specific FAQ templates
const FAQ_TEMPLATES: Record<string, FAQ[]> = {
  'breeches': [
    {
      question: 'What size breeches should I order?',
      answer: 'Most brands run true to European sizing. Check our detailed size charts which include Australian conversions (EU 34 = AU 6, EU 36 = AU 8, etc.). If between sizes, we recommend sizing up for comfort, especially for full-seat styles. Measure your waist and hips, and compare to the brand-specific size chart.',
    },
    {
      question: 'What\'s the difference between full-seat and knee-patch breeches?',
      answer: 'Full-seat breeches have grip material covering the entire seat area, providing maximum stability for dressage and flatwork. Knee-patch breeches have grip only at the knees, offering more freedom of movement preferred by jumping riders. Both styles are suitable for general riding.',
    },
    {
      question: 'How do I care for my riding breeches?',
      answer: 'Wash in cold water on gentle cycle, inside out to protect grip material. Hang dry or tumble dry on low heat. Avoid fabric softeners as they reduce moisture-wicking properties and can damage silicone grip. With proper care, quality breeches last 2-3 years of regular use.',
    },
  ],
  'helmets': [
    {
      question: 'How do I know which helmet size to order?',
      answer: 'Measure your head circumference just above your eyebrows with a soft tape measure. Most helmets are sized in cm (52-62cm range). Check the specific brand\'s size chart as sizing can vary. A properly fitted helmet should feel snug but not tight, and shouldn\'t move when you shake your head.',
    },
    {
      question: 'Do these helmets meet Australian safety standards?',
      answer: 'Yes, all our helmets meet or exceed AS/NZS 3838 Australian safety standards. Many also carry additional certifications like VG1, PAS015, or ASTM. Helmets are required for competition and strongly recommended for all riding activities. Replace your helmet after any impact or every 5 years.',
    },
    {
      question: 'Can I return a helmet if it doesn\'t fit?',
      answer: 'Yes, we offer hassle-free returns on unworn helmets with original tags and packaging within 30 days. Free return shipping Australia-wide. Proper fit is crucial for safety, so we want you to get it right.',
    },
  ],
  'rugs': [
    {
      question: 'What rug weight do I need for my horse?',
      answer: 'This depends on your climate, horse\'s breed, clip, and shelter. Northern Australia/Queensland: 0-200g year-round for most horses. Southern regions (Victoria, Tasmania, NSW highlands): 200-400g for winter. Clipped horses need heavier rugs. Start with medium weight and adjust based on your horse\'s comfort.',
    },
    {
      question: 'How do I measure my horse for a rug?',
      answer: 'Measure from the center of the chest to the point of the buttock (where the tail starts). Most brands use cm sizing (4\'0" to 7\'0" or 120cm to 210cm). If between sizes, size up. Check the brand\'s specific measuring guide as some measure differently.',
    },
    {
      question: 'What\'s the difference between turnout and stable rugs?',
      answer: 'Turnout rugs are waterproof and designed for outdoor use in all weather. They have stronger outer shells (600D-1200D+) and features like leg arches and tail flaps. Stable rugs are for indoor use only, not waterproof, and focus on warmth and comfort. Many horses need both types.',
    },
  ],
  'boots-rider': [
    {
      question: 'How do I choose between tall boots and paddock boots?',
      answer: 'Tall boots (field or dress) are one-piece boots reaching below the knee, preferred for competition and formal riding. Paddock boots are ankle-height and worn with half chaps for everyday riding. Paddock boots are more affordable and easier to fit, while tall boots offer a more polished look.',
    },
    {
      question: 'What size riding boots should I order?',
      answer: 'Measure your foot length, calf circumference at widest point, and height from floor to back of knee. European sizing with AU conversions provided. Most brands offer standard and slim calf widths. Leather boots should feel snug initially as they\'ll stretch; synthetic boots should fit comfortably from the start.',
    },
    {
      question: 'How long does it take for leather boots to break in?',
      answer: 'Quality leather boots typically require 2-3 weeks of regular wear to fully break in. Start with short rides and gradually increase duration. Use boot stretchers and leather conditioner to speed the process. Synthetic boots require no break-in period and are ready to ride immediately.',
    },
  ],
  'saddles': [
    {
      question: 'How do I know what saddle size I need?',
      answer: 'Saddle seat size (typically 15"-18" for adults) is measured from the pommel to the cantle. Sit in the saddle - you should have about 4 fingers width behind you and 2-3 fingers in front. Tree width (narrow, medium, wide) must fit your horse. Professional saddle fitting is highly recommended.',
    },
    {
      question: 'What\'s the difference between dressage and jumping saddles?',
      answer: 'Dressage saddles have a deep seat and straight flaps to support a long leg position. Jumping saddles have forward-cut flaps and knee rolls to support a shorter stirrup and forward position. All-purpose saddles offer a compromise suitable for general riding and light competition.',
    },
    {
      question: 'Do you offer saddle fitting services?',
      answer: 'We recommend working with a qualified saddle fitter in your area. Many of our saddles have adjustable trees or come with multiple gullet sizes. Contact us for saddle fitter recommendations in your region and guidance on measuring your horse.',
    },
  ],
  'supplements': [
    {
      question: 'How long before I see results from supplements?',
      answer: 'Most supplements require 4-6 weeks of consistent use before visible effects. Joint supplements may take 6-8 weeks. Digestive aids often show results within 1-2 weeks. Always follow manufacturer dosage guidelines based on your horse\'s weight. Consult your vet before starting any supplement program.',
    },
    {
      question: 'Are these supplements competition safe?',
      answer: 'Most supplements are competition safe, but rules vary by discipline and level. Check specific product information and your competition\'s prohibited substances list. FEI and EA have different regulations. When in doubt, contact your governing body or consult the product manufacturer.',
    },
    {
      question: 'How should I store equine supplements in Australian heat?',
      answer: 'Store in a cool, dry place away from direct sunlight. Australian summers can degrade supplements quickly. Keep containers sealed tightly. Refrigeration may be recommended for some products (check labels). Buy in quantities you\'ll use within 3-6 months for best freshness.',
    },
  ],
  'grooming': [
    {
      question: 'What grooming tools do I need for my horse?',
      answer: 'Essential tools include: curry comb (rubber or metal), body brush, dandy brush, mane comb, hoof pick, and sponges. Complete grooming kits typically include 6-8 tools. Add specialized tools like shedding blades for seasonal coat changes and sweat scrapers for after work.',
    },
    {
      question: 'How often should I groom my horse?',
      answer: 'Daily grooming is ideal for bonding and health monitoring. At minimum, groom before and after riding to remove dirt and check for injuries. During Australian fly season (October-April), regular grooming with fly spray application is especially important. Increase grooming during shedding seasons.',
    },
    {
      question: 'How do I maintain my grooming brushes?',
      answer: 'Wash brushes weekly with mild soap and warm water. Remove hair buildup after each use. Allow to dry completely before storing. Replace worn bristles. Natural bristle brushes last longer with proper care. Store in a dry grooming box to protect from dust and moisture.',
    },
  ],
  'gloves': [
    {
      question: 'What size riding gloves should I order?',
      answer: 'Measure hand circumference at the widest point (across knuckles, excluding thumb). Most brands use standard sizing (XS-XL). Gloves should fit snugly without restricting movement. Too loose and you\'ll lose grip; too tight and they\'ll be uncomfortable. Check brand-specific size charts.',
    },
    {
      question: 'What\'s the difference between summer and winter riding gloves?',
      answer: 'Summer gloves feature lightweight, breathable materials with mesh panels for ventilation. Winter gloves have insulation (Thinsulate or fleece lining) while maintaining grip and flexibility. Australian riders often need both types given our climate variations.',
    },
    {
      question: 'How do I care for my riding gloves?',
      answer: 'Most synthetic gloves are machine washable (cold water, gentle cycle). Leather gloves should be hand washed with saddle soap. Air dry only - never use heat. Proper care extends glove life to 1-2 years with regular use. Replace when grip material wears or seams split.',
    },
  ],
};

function getCategoryType(urlPath: string, h1Title: string): string {
  if (urlPath.includes('breech') || urlPath.includes('tight')) return 'breeches';
  if (urlPath.includes('helmet')) return 'helmets';
  if (urlPath.includes('boot') && (urlPath.includes('rider') || urlPath.includes('clothing'))) return 'boots-rider';
  if (urlPath.includes('rug')) return 'rugs';
  if (urlPath.includes('saddle')) return 'saddles';
  if (urlPath.includes('supplement')) return 'supplements';
  if (urlPath.includes('grooming')) return 'grooming';
  if (urlPath.includes('glove')) return 'gloves';
  
  return '';
}

function generateFAQs(categoryType: string, h1Title: string): FAQ[] {
  const template = FAQ_TEMPLATES[categoryType];
  if (!template) {
    // Return generic FAQs
    return [
      {
        question: `What ${h1Title.toLowerCase()} do you stock?`,
        answer: `We stock a wide range of ${h1Title.toLowerCase()} from leading brands. Browse our collection to see the full range of styles, sizes, and options available. All products include detailed descriptions and sizing information.`,
      },
      {
        question: 'Do you offer free shipping?',
        answer: 'Yes! We offer free shipping on all orders within Australia. Orders are typically dispatched within 24 hours. Express shipping options are available at checkout for urgent needs.',
      },
    ];
  }
  
  return template;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yes = args.includes('--yes');
  
  if (!dryRun && !yes) {
    console.error('❌ Error: Must specify either --dry-run or --yes');
    console.log('\nUsage:');
    console.log('  npm run rewrite-faqs -- --dry-run  (preview changes)');
    console.log('  npm run rewrite-faqs -- --yes      (apply changes)');
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
  const changes: Array<{ url: string; categoryType: string; oldCount: number; newCount: number }> = [];
  
  // Process each row
  for (const row of rows) {
    const categoryType = getCategoryType(row.url_path, row.h1_title);
    
    if (categoryType) {
      try {
        const oldFaqs = row.faq_json ? JSON.parse(row.faq_json) : [];
        const newFaqs = generateFAQs(categoryType, row.h1_title);
        
        // Only update if different or if old FAQs are generic
        const shouldUpdate = oldFaqs.length === 0 || 
                            oldFaqs.some((faq: FAQ) => 
                              faq.question.includes('How do I choose the right') ||
                              faq.question.includes('Do you offer free shipping')
                            );
        
        if (shouldUpdate) {
          changedCount++;
          changes.push({
            url: row.url_path,
            categoryType,
            oldCount: oldFaqs.length,
            newCount: newFaqs.length,
          });
          
          if (!dryRun) {
            row.faq_json = JSON.stringify(newFaqs);
          }
        }
      } catch (e) {
        // Skip rows with invalid JSON
        continue;
      }
    }
  }
  
  // Show preview
  console.log(`\n📝 Changes Preview (showing first 15):\n`);
  changes.slice(0, 15).forEach((change, idx) => {
    console.log(`${idx + 1}. ${change.url}`);
    console.log(`   Category: ${change.categoryType}`);
    console.log(`   FAQs: ${change.oldCount} → ${change.newCount}`);
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
    const backupPath = CSV_PATH.replace('.csv', `.backup-rewrite-faqs-${timestamp}.csv`);
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
