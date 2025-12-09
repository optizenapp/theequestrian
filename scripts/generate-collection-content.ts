/**
 * Generate World-Class Collection Content
 * 
 * Creates humanized, SEO-optimized content for all collection pages following:
 * - Entity-First SEO framework
 * - Information Gain principles
 * - Hub & Spoke internal linking
 * - High perplexity and burstiness for natural language
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

interface CollectionRow {
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

interface RelatedCategory {
  url: string;
  title: string;
  description: string;
}

/**
 * Generate long description with high perplexity and burstiness
 */
function generateLongDescription(
  title: string,
  urlPath: string,
  level: number,
  allRows: CollectionRow[]
): string {
  const pathParts = urlPath.split('/').filter(p => p);
  const category = pathParts[0];
  const subcategory = pathParts[1];
  const subsubcategory = pathParts[2];

  // Determine category type for contextual content
  const isHorse = category === 'horse';
  const isClothing = category === 'clothing';
  const isRider = category === 'rider';
  const isPet = category === 'pet';

  // Generate opening with varied sentence structure (burstiness)
  let content = `<h2>Premium ${title}</h2>`;
  
  // Varied opening paragraphs based on category level
  if (level === 1) {
    // Top-level category - broadest scope
    content += `<p>Welcome to our complete ${title.toLowerCase()} collection. `;
    content += `We've assembled everything you need in one place - from everyday essentials to competition-grade equipment. `;
    content += `Every product has been carefully selected by our expert team who understand the unique demands of ${isHorse ? 'equine care' : isRider ? 'riders' : isPet ? 'pet owners' : 'the equestrian lifestyle'}. `;
    content += `Browse our specialized categories below to find exactly what you're looking for.</p>`;
  } else if (level === 2) {
    // Subcategory - broader scope
    content += `<p>Discover our comprehensive collection of ${title.toLowerCase()}, carefully curated to meet the demands of ${isHorse ? 'horses' : isRider ? 'riders' : isPet ? 'pet owners' : 'equestrians'} at every level. `;
    content += `From competition-ready gear to everyday essentials, we stock only the finest brands known for quality, durability, and performance. `;
    content += `Each product has been expertly selected by our team of ${isHorse ? 'equine specialists' : 'experienced professionals'} who understand what truly matters.</p>`;
  } else {
    // Sub-subcategory - specific focus
    content += `<p>Welcome to our specialized ${title.toLowerCase()} collection. `;
    content += `Whether you're a seasoned professional or just starting out, finding the right ${title.toLowerCase()} makes all the difference. `;
    content += `We've assembled an exceptional range that combines cutting-edge technology with time-tested designs.</p>`;
  }

  // Add "What Makes Great X?" section with attributes
  content += `<h3>What Makes Great ${title}?</h3><ul>`;
  
  // Category-specific attributes (high perplexity - varied vocabulary)
  if (isHorse) {
    if (subcategory === 'boots') {
      content += `<li><strong>Protection & Support:</strong> Advanced impact absorption and tendon support for maximum safety during training and competition</li>`;
      content += `<li><strong>Perfect Fit:</strong> Anatomically designed to move with your horse while staying securely in place</li>`;
      content += `<li><strong>Breathable Materials:</strong> Moisture-wicking fabrics that prevent overheating and maintain comfort</li>`;
      content += `<li><strong>Easy Maintenance:</strong> Durable construction that withstands frequent washing and daily use</li>`;
    } else if (subcategory === 'rugs') {
      content += `<li><strong>Weather Protection:</strong> Waterproof and breathable fabrics that keep your horse comfortable in all conditions</li>`;
      content += `<li><strong>Proper Fit:</strong> Tailored designs that prevent rubbing and allow natural movement</li>`;
      content += `<li><strong>Temperature Regulation:</strong> Appropriate weight and insulation for seasonal needs</li>`;
      content += `<li><strong>Durability:</strong> Reinforced stress points and quality materials that last season after season</li>`;
    } else if (subcategory === 'grooming') {
      content += `<li><strong>Quality Tools:</strong> Professional-grade brushes and combs that effectively clean without damaging coat or skin</li>`;
      content += `<li><strong>Ergonomic Design:</strong> Comfortable grips that reduce hand fatigue during grooming sessions</li>`;
      content += `<li><strong>Effective Products:</strong> Shampoos and conditioners formulated specifically for equine coat and skin</li>`;
      content += `<li><strong>Complete Care:</strong> Everything needed for show preparation and daily maintenance</li>`;
    } else {
      content += `<li><strong>Premium Quality:</strong> Expertly crafted from the finest materials for lasting performance</li>`;
      content += `<li><strong>Functional Design:</strong> Thoughtfully engineered to meet the specific needs of horses and riders</li>`;
      content += `<li><strong>Trusted Brands:</strong> Products from manufacturers with proven track records in equestrian sports</li>`;
      content += `<li><strong>Value:</strong> Investment pieces that deliver exceptional performance over time</li>`;
    }
  } else if (isClothing) {
    content += `<li><strong>Technical Fabrics:</strong> Advanced moisture-wicking and breathable materials that keep you comfortable in the saddle</li>`;
    content += `<li><strong>Perfect Fit:</strong> Designed specifically for riding with stretch panels and reinforced seams where you need them most</li>`;
    content += `<li><strong>Durability:</strong> Built to withstand daily wear, frequent washing, and the demands of equestrian life</li>`;
    content += `<li><strong>Style:</strong> Look professional in the arena and fashionable at the barn with timeless designs</li>`;
  } else if (isRider) {
    content += `<li><strong>Safety First:</strong> Certified protection that meets or exceeds industry standards</li>`;
    content += `<li><strong>Comfort:</strong> Ergonomic designs that you'll actually want to wear</li>`;
    content += `<li><strong>Quality Construction:</strong> Attention to detail that ensures longevity and reliability</li>`;
    content += `<li><strong>Professional Standards:</strong> Competition-approved gear trusted by top riders</li>`;
  } else {
    content += `<li><strong>Quality Materials:</strong> Durable construction that stands up to daily use</li>`;
    content += `<li><strong>Thoughtful Design:</strong> Features that make a real difference in performance</li>`;
    content += `<li><strong>Expert Selection:</strong> Carefully chosen products from trusted manufacturers</li>`;
    content += `<li><strong>Great Value:</strong> Competitive pricing without compromising on quality</li>`;
  }
  
  content += `</ul>`;

  // Add "Shop by Category" section with actual internal links
  if (level === 1) {
    // Top-level: Link to subcategories (level 2)
    const subcategories = allRows.filter(row => {
      const rowPath = row.url_path;
      const rowParts = rowPath.split('/').filter(p => p);
      return rowParts.length === 2 && 
             rowParts[0] === category &&
             parseInt(row.category_level) === 2;
    });

    if (subcategories.length > 0) {
      content += `<h3>Shop by Category</h3>`;
      content += `<p>Explore our specialized departments including `;
      
      // Add links to first 4-5 subcategories
      const linksToShow = subcategories.slice(0, 4);
      const linkTexts = linksToShow.map((row, index) => {
        const linkText = row.h1_title.toLowerCase();
        const isLast = index === linksToShow.length - 1;
        const isSecondLast = index === linksToShow.length - 2;
        
        let prefix = '';
        if (isLast && linksToShow.length > 1) {
          prefix = ' and ';
        } else if (isSecondLast) {
          prefix = '';
        } else if (index > 0) {
          prefix = ' ';
        }
        
        return `${prefix}<a href="${row.url_path}">${linkText}</a>`;
      }).join(',');
      
      content += linkTexts;
      if (subcategories.length > 4) {
        content += `, plus ${subcategories.length - 4} more specialized categories`;
      }
      content += `. Each department is stocked with premium products from the world's leading brands.</p>`;
    }
  } else if (level === 2) {
    // Subcategory: Link to sub-subcategories (level 3)
    const subSubcategories = allRows.filter(row => {
      const rowPath = row.url_path;
      const rowParts = rowPath.split('/').filter(p => p);
      return rowParts.length === 3 && 
             rowParts[0] === category && 
             rowParts[1] === subcategory &&
             parseInt(row.category_level) === 3;
    });

    if (subSubcategories.length > 0) {
      content += `<h3>Shop by Type</h3>`;
      content += `<p>Browse our specialized categories including `;
      
      // Add links to first 3-4 subcategories
      const linksToShow = subSubcategories.slice(0, 3);
      const linkTexts = linksToShow.map((row, index) => {
        const linkText = row.h1_title.toLowerCase();
        const isLast = index === linksToShow.length - 1;
        const isSecondLast = index === linksToShow.length - 2;
        
        let prefix = '';
        if (isLast && linksToShow.length > 1) {
          prefix = ' and ';
        } else if (isSecondLast) {
          prefix = '';
        } else if (index > 0) {
          prefix = ' ';
        }
        
        return `${prefix}<a href="${row.url_path}">${linkText}</a>`;
      }).join(',');
      
      content += linkTexts;
      content += `. Each category features products from world-leading brands trusted by professional ${isHorse ? 'equestrians' : isRider ? 'riders' : 'enthusiasts'}.</p>`;
    } else {
      // Fallback if no subcategories
      content += `<h3>Shop by Category</h3>`;
      content += `<p>Browse our specialized categories to find exactly what you need. `;
      content += `Each section features products from world-leading brands trusted by professional ${isHorse ? 'equestrians' : isRider ? 'riders' : 'enthusiasts'}. `;
      content += `Not sure where to start? Our expert team is always here to help you make the right choice.</p>`;
    }
  }

  return content;
}

/**
 * Generate category-specific FAQs (not generic)
 */
function generateFAQs(title: string, urlPath: string, level: number): FAQItem[] {
  const pathParts = urlPath.split('/').filter(p => p);
  const category = pathParts[0];
  const subcategory = pathParts[1];

  const faqs: FAQItem[] = [];

  // Category-specific questions
  if (category === 'horse' && subcategory === 'boots') {
    faqs.push({
      question: `What type of ${title.toLowerCase()} do I need for my horse?`,
      answer: `The right ${title.toLowerCase()} depend on your horse's activity level and discipline. For jumping and eventing, tendon boots offer crucial protection. For turnout, bell boots prevent overreach injuries. For therapy and recovery, consider ice boots or magnetic boots. Our team can help you choose based on your specific needs.`
    });
    faqs.push({
      question: `How do I know if ${title.toLowerCase()} fit properly?`,
      answer: `Properly fitted ${title.toLowerCase()} should sit snugly without restricting movement or causing pressure points. Check that straps are secure but not too tight, and ensure the boots don't rotate during movement. If you're unsure, consult our sizing guides or contact our expert team for personalized fitting advice.`
    });
  } else if (category === 'horse' && subcategory === 'rugs') {
    faqs.push({
      question: `What weight rug does my horse need?`,
      answer: `Rug weight depends on your horse's coat, body condition, and local climate. Clipped horses typically need heavier rugs (200-400g) in winter, while unclipped horses may only need lightweight options (0-100g). Consider your horse's individual needs - some run hot, others cold. We're happy to help you choose the right weight.`
    });
    faqs.push({
      question: `How do I measure my horse for a rug?`,
      answer: `Measure from the center of your horse's chest to the point of the buttock in a straight line. This gives you the rug size in inches or centimeters. For best fit, also consider your horse's build - some brands run larger or smaller. Check individual product sizing charts and don't hesitate to contact us for guidance.`
    });
  } else if (category === 'clothing') {
    faqs.push({
      question: `What size should I order?`,
      answer: `We recommend consulting our detailed size guide for each brand, as sizing can vary between manufacturers. Most riders find their regular size works well, but competition wear may run smaller. When in doubt, size up for comfort, especially for items you'll wear over base layers.`
    });
    faqs.push({
      question: `How do I care for technical riding clothing?`,
      answer: `Wash in cold water on a gentle cycle and hang to dry to preserve technical fabrics. Avoid fabric softeners as they can reduce moisture-wicking properties. For competition wear, follow specific care instructions on the label. Proper care ensures your investment lasts for years.`
    });
  } else if (category === 'rider') {
    faqs.push({
      question: `How do I choose the right ${title.toLowerCase()}?`,
      answer: `Consider your riding discipline, frequency, and personal preferences. Safety should always come first - look for certified products that meet current standards. Comfort is also crucial as you're more likely to use gear that feels good. Our team can help match you with the perfect ${title.toLowerCase()} for your needs.`
    });
    faqs.push({
      question: `Are these products competition-approved?`,
      answer: `Most of our ${title.toLowerCase()} meet or exceed competition standards, but requirements vary by discipline and level. Check specific product descriptions for certification details, or contact us to confirm if an item is suitable for your competition needs.`
    });
  } else {
    // Generic but still useful FAQs
    faqs.push({
      question: `How do I choose the right ${title.toLowerCase()}?`,
      answer: `Consider your specific needs, budget, and intended use. Read product descriptions carefully and check sizing information. Our customer reviews provide valuable insights from real users. If you're unsure, our expert team is always happy to provide personalized recommendations.`
    });
    faqs.push({
      question: `Do you offer free shipping on ${title.toLowerCase()}?`,
      answer: `Yes! We offer free shipping on all orders over $100 within Australia. Orders are typically processed within 1-2 business days. For urgent needs, express shipping options are available at checkout.`
    });
  }

  return faqs.slice(0, 2); // Return 2 FAQs per page
}

/**
 * Generate semantically related categories (Hub & Spoke)
 */
function generateRelatedCategories(
  urlPath: string,
  allRows: CollectionRow[]
): RelatedCategory[] {
  const pathParts = urlPath.split('/').filter(p => p);
  const category = pathParts[0];
  const subcategory = pathParts[1];
  const level = pathParts.length;

  const related: RelatedCategory[] = [];

  // Hub & Spoke strategy: Link to complementary categories
  if (category === 'horse') {
    if (subcategory === 'boots') {
      related.push({
        url: '/horse/bandages',
        title: 'Bandages & Wraps',
        description: 'Complement your boots with quality bandages'
      });
      related.push({
        url: '/horse/grooming',
        title: 'Grooming Supplies',
        description: 'Keep your horse looking their best'
      });
    } else if (subcategory === 'rugs') {
      related.push({
        url: '/horse/boots',
        title: 'Horse Boots',
        description: 'Complete protection for your horse'
      });
      related.push({
        url: '/horse/stable',
        title: 'Stable Equipment',
        description: 'Everything for your stable'
      });
    } else if (subcategory === 'grooming') {
      related.push({
        url: '/horse/rugs',
        title: 'Horse Rugs',
        description: 'Keep your horse comfortable year-round'
      });
      related.push({
        url: '/horse/stable',
        title: 'Stable Equipment',
        description: 'Complete stable management solutions'
      });
    }
  } else if (category === 'clothing') {
    if (subcategory === 'womens') {
      related.push({
        url: '/clothing/footwear',
        title: 'Riding Footwear',
        description: 'Complete your outfit with quality boots'
      });
      related.push({
        url: '/rider/helmets',
        title: 'Riding Helmets',
        description: 'Safety first with certified helmets'
      });
    } else if (subcategory === 'footwear') {
      related.push({
        url: '/clothing/womens',
        title: "Ladies' Riding Clothing",
        description: 'Complete your riding wardrobe'
      });
      related.push({
        url: '/rider/accessories',
        title: 'Rider Accessories',
        description: 'Essential accessories for every rider'
      });
    }
  } else if (category === 'rider') {
    related.push({
      url: '/clothing/womens',
      title: "Ladies' Riding Clothing",
      description: 'Complete your riding wardrobe'
    });
    related.push({
      url: '/horse/tack',
      title: 'Horse Tack',
      description: 'Quality tack for horse and rider'
    });
  }

  return related.slice(0, 2); // Return 2 related categories
}

/**
 * Main content generation function
 */
async function generateContent() {
  console.log('🚀 Starting content generation...\n');

  const csvPath = path.join(process.cwd(), 'exports', 'collection-content.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  const rows = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as CollectionRow[];

  console.log(`📄 Found ${rows.length} collection pages\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip if already has content
    if (row.long_description && row.long_description.length > 100) {
      console.log(`⏭️  Skipping ${row.url_path} (already has content)`);
      skipped++;
      continue;
    }

    const level = parseInt(row.category_level);
    
    // Skip level 0 (root) but generate for 1, 2, and 3
    if (level < 1) {
      skipped++;
      continue;
    }

    console.log(`✍️  Generating content for ${row.url_path}...`);

    // Generate long description
    row.long_description = generateLongDescription(
      row.h1_title,
      row.url_path,
      level,
      rows
    );

    // Generate FAQs
    const faqs = generateFAQs(row.h1_title, row.url_path, level);
    row.faq_json = JSON.stringify(faqs);

    // Generate related categories
    const related = generateRelatedCategories(row.url_path, rows);
    row.related_categories_json = JSON.stringify(related);

    updated++;
  }

  // Write back to CSV
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

  fs.writeFileSync(csvPath, output);

  console.log(`\n✅ Content generation complete!`);
  console.log(`   Updated: ${updated} pages`);
  console.log(`   Skipped: ${skipped} pages`);
  console.log(`\n📝 CSV file updated: ${csvPath}`);
}

// Run the script
generateContent().catch(console.error);

