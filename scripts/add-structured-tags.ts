/**
 * Add Structured Tags to Shopify Products
 * 
 * This script automatically adds structured tags based on product type
 * for better schema.org structured data extraction
 * 
 * Usage:
 * npx tsx scripts/add-structured-tags.ts
 */

import { shopifyFetch } from '../lib/shopify/client';

// Tag mapping based on product type
const TAG_MAPPINGS: Record<string, string[]> = {
  // Helmets
  'riding helmets': ['Safety Equipment', 'Head Protection'],
  'helmet': ['Safety Equipment', 'Head Protection'],
  
  // Boots
  'paddock boots': ['Leather', 'Footwear'],
  'riding boots': ['Leather', 'Footwear'],
  'tall boots': ['Leather', 'Footwear'],
  'field boots': ['Leather', 'Footwear'],
  'dress boots': ['Leather', 'Footwear'],
  
  // Apparel
  'breeches': ['Riding Apparel', 'Stretch Fabric'],
  'jodhpurs': ['Riding Apparel', 'Stretch Fabric'],
  'riding tights': ['Riding Apparel', 'Stretch Fabric', 'Breathable'],
  'show shirt': ['Riding Apparel', 'Competition Wear'],
  'riding jacket': ['Riding Apparel', 'Weather Protection'],
  
  // Horse Gear
  'saddle': ['Leather', 'Horse Tack'],
  'bridle': ['Leather', 'Horse Tack'],
  'halter': ['Horse Tack'],
  'girth': ['Horse Tack'],
  
  // Rugs/Blankets
  'turnout rug': ['Waterproof', 'Weather Protection', 'Horse Blanket'],
  'stable rug': ['Horse Blanket', 'Breathable'],
  'cooler': ['Horse Blanket', 'Breathable'],
  'fly sheet': ['Horse Blanket', 'Breathable', 'UV Protection'],
  
  // Gloves
  'riding gloves': ['Riding Apparel', 'Grip Enhancement'],
  
  // Safety Vests
  'body protector': ['Safety Equipment', 'Impact Protection'],
  'safety vest': ['Safety Equipment', 'Impact Protection'],
};

// Material keywords to detect in product descriptions
const MATERIAL_KEYWORDS: Record<string, string> = {
  'leather': 'Leather',
  'synthetic': 'Synthetic Material',
  'cotton': 'Cotton',
  'wool': 'Wool',
  'nylon': 'Nylon',
  'polyester': 'Polyester',
  'aramid': 'Aramid Fibres',
  'breathable': 'Breathable',
  'waterproof': 'Waterproof',
  'water resistant': 'Water Resistant',
  'windproof': 'Windproof',
};

// Safety certifications to detect
const CERTIFICATION_PATTERNS = [
  /ASTM\s*F\d{4}[-\s]*\d{0,2}/gi,
  /SNELL\s*E\d{4}/gi,
  /PAS\s*015[:\s]*\d{4}/gi,
  /EN\s*\d{4}/gi,
  /CE\s*certified/gi,
];

interface Product {
  id: string;
  title: string;
  productType: string;
  description: string;
  tags: string[];
  vendor: string;
}

/**
 * Get suggested tags for a product
 */
function getSuggestedTags(product: Product): string[] {
  const suggestedTags = new Set<string>();
  const productTypeLower = product.productType.toLowerCase();
  const descriptionLower = product.description.toLowerCase();
  const titleLower = product.title.toLowerCase();
  
  // 1. Add tags based on product type mapping
  for (const [type, tags] of Object.entries(TAG_MAPPINGS)) {
    if (productTypeLower.includes(type)) {
      tags.forEach(tag => suggestedTags.add(tag));
    }
  }
  
  // 2. Detect materials from description and title
  for (const [keyword, tag] of Object.entries(MATERIAL_KEYWORDS)) {
    if (descriptionLower.includes(keyword) || titleLower.includes(keyword)) {
      suggestedTags.add(tag);
    }
  }
  
  // 3. Extract safety certifications
  const fullText = `${product.title} ${product.description}`;
  CERTIFICATION_PATTERNS.forEach(pattern => {
    const matches = fullText.match(pattern);
    if (matches) {
      matches.forEach(cert => suggestedTags.add(cert.trim()));
    }
  });
  
  // 4. Remove tags that already exist
  const existingTags = new Set(product.tags.map(t => t.toLowerCase()));
  const newTags = Array.from(suggestedTags).filter(
    tag => !existingTags.has(tag.toLowerCase())
  );
  
  return newTags;
}

/**
 * Fetch all products
 */
async function getAllProducts(): Promise<Product[]> {
  const query = `
    query GetAllProducts($cursor: String) {
      products(first: 250, after: $cursor) {
        edges {
          node {
            id
            title
            productType
            description
            tags
            vendor
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  
  const products: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  
  while (hasNextPage) {
    const data: any = await shopifyFetch({
      query,
      variables: { cursor },
    });
    
    products.push(...data.products.edges.map((edge: any) => edge.node));
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  
  return products;
}

/**
 * Update product tags
 */
async function updateProductTags(productId: string, newTags: string[]): Promise<void> {
  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  await shopifyFetch({
    query: mutation,
    variables: {
      input: {
        id: productId,
        tags: newTags,
      },
    },
  });
}

/**
 * Export suggestions to CSV for review
 */
function exportToCSV(updates: Array<{ product: Product; suggestedTags: string[] }>) {
  const fs = require('fs');
  const path = require('path');
  
  const csvLines = ['Handle,Title,Product Type,Current Tags,Suggested Tags,Confidence,Reason'];
  
  for (const { product, suggestedTags } of updates) {
    const confidence = calculateConfidence(product, suggestedTags);
    const reason = getReasonForTags(product, suggestedTags);
    
    csvLines.push([
      product.id.split('/').pop(),
      `"${product.title}"`,
      `"${product.productType}"`,
      `"${product.tags.join(', ')}"`,
      `"${suggestedTags.join(', ')}"`,
      confidence,
      `"${reason}"`
    ].join(','));
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `tag-suggestions-${timestamp}.csv`;
  const filepath = path.join(process.cwd(), 'exports', filename);
  
  fs.writeFileSync(filepath, csvLines.join('\n'));
  console.log(`\n📄 Exported suggestions to: ${filename}`);
  console.log('   Review this file before applying tags!\n');
}

/**
 * Calculate confidence score for suggestions
 */
function calculateConfidence(product: Product, suggestedTags: string[]): string {
  let score = 0;
  const reasons: string[] = [];
  
  // High confidence if product type matches exactly
  const productTypeLower = product.productType.toLowerCase();
  if (Object.keys(TAG_MAPPINGS).some(type => productTypeLower === type)) {
    score += 40;
    reasons.push('exact product type match');
  } else if (Object.keys(TAG_MAPPINGS).some(type => productTypeLower.includes(type))) {
    score += 20;
    reasons.push('partial product type match');
  }
  
  // High confidence if certifications found in description
  const fullText = `${product.title} ${product.description}`;
  const hasCertifications = suggestedTags.some(tag => 
    /ASTM|SNELL|PAS|EN\d{4}|CE/i.test(tag)
  );
  if (hasCertifications) {
    score += 40;
    reasons.push('certifications found in text');
  }
  
  // Medium confidence if materials found
  const hasMaterials = suggestedTags.some(tag =>
    /leather|cotton|wool|nylon|polyester/i.test(tag)
  );
  if (hasMaterials) {
    score += 20;
    reasons.push('materials detected');
  }
  
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get human-readable reason for tag suggestions
 */
function getReasonForTags(product: Product, suggestedTags: string[]): string {
  const reasons: string[] = [];
  
  // Check what triggered each tag
  suggestedTags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    const titleLower = product.title.toLowerCase();
    const descLower = product.description.toLowerCase();
    
    if (/astm|snell|pas|en\d{4}|ce/i.test(tag)) {
      if (titleLower.includes(tagLower) || descLower.includes(tagLower)) {
        reasons.push(`"${tag}" found in product text`);
      }
    } else if (Object.values(TAG_MAPPINGS).flat().includes(tag)) {
      reasons.push(`"${tag}" from product type mapping`);
    } else if (Object.values(MATERIAL_KEYWORDS).includes(tag)) {
      const keyword = Object.keys(MATERIAL_KEYWORDS).find(
        k => MATERIAL_KEYWORDS[k] === tag
      );
      if (keyword && (titleLower.includes(keyword) || descLower.includes(keyword))) {
        reasons.push(`"${tag}" detected from keyword "${keyword}"`);
      }
    }
  });
  
  return reasons.slice(0, 3).join('; ') || 'Based on product type';
}

/**
 * Main execution
 */
async function main() {
  console.log('🏷️  Analyzing products for structured tags...\n');
  
  // Fetch all products
  const products = await getAllProducts();
  console.log(`Found ${products.length} products\n`);
  
  // Analyze each product
  const updates: Array<{ product: Product; suggestedTags: string[] }> = [];
  
  for (const product of products) {
    const suggestedTags = getSuggestedTags(product);
    
    if (suggestedTags.length > 0) {
      updates.push({ product, suggestedTags });
      
      const confidence = calculateConfidence(product, suggestedTags);
      const confidenceEmoji = confidence === 'HIGH' ? '🟢' : confidence === 'MEDIUM' ? '🟡' : '🔴';
      
      console.log(`${confidenceEmoji} ${product.title}`);
      console.log(`   Type: ${product.productType}`);
      console.log(`   Current tags: ${product.tags.slice(0, 3).join(', ')}${product.tags.length > 3 ? '...' : ''}`);
      console.log(`   Suggested: ${suggestedTags.join(', ')}`);
      console.log(`   Confidence: ${confidence}`);
      console.log('');
    }
  }
  
  console.log(`\n✨ Found ${updates.length} products with tag suggestions\n`);
  
  // Group by confidence
  const high = updates.filter(u => calculateConfidence(u.product, u.suggestedTags) === 'HIGH');
  const medium = updates.filter(u => calculateConfidence(u.product, u.suggestedTags) === 'MEDIUM');
  const low = updates.filter(u => calculateConfidence(u.product, u.suggestedTags) === 'LOW');
  
  console.log('📊 Confidence Breakdown:');
  console.log(`   🟢 HIGH confidence: ${high.length} products (safe to apply)`);
  console.log(`   🟡 MEDIUM confidence: ${medium.length} products (review recommended)`);
  console.log(`   🔴 LOW confidence: ${low.length} products (manual review required)\n`);
  
  // Export to CSV for review
  exportToCSV(updates);
  
  console.log('📝 Next Steps:');
  console.log('   1. Review the exported CSV file');
  console.log('   2. Check the "Confidence" and "Reason" columns');
  console.log('   3. Remove any incorrect suggestions from the CSV');
  console.log('   4. Import the CSV to Shopify (or use the apply code below)\n');
  
  console.log('⚠️  To auto-apply HIGH confidence tags only:');
  console.log('   Uncomment the "Apply high confidence" section in the code\n');
  
  // SAFE: Only apply HIGH confidence tags (uncomment to use)
  /*
  console.log('🚀 Applying HIGH confidence tags only...\n');
  for (const { product, suggestedTags } of high) {
    const allTags = [...product.tags, ...suggestedTags];
    await updateProductTags(product.id, allTags);
    console.log(`✅ Updated: ${product.title}`);
  }
  console.log(`\n✅ Applied tags to ${high.length} products`);
  */
}

main().catch(console.error);

