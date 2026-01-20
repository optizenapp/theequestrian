/**
 * Fix H1 Titles Script
 * 
 * Automatically fixes h1_title column in collection-content.csv by:
 * 1. Removing problematic prefixes (FOOTWEAR:, RUGS:, SADDLES:, Clothing -)
 * 2. Deriving proper titles from URL slugs
 * 3. Applying Title Case formatting
 * 
 * Usage:
 *   npm run fix-h1-titles               # Apply changes with confirmation
 *   npm run fix-h1-titles -- --dry-run  # Preview changes only
 *   npm run fix-h1-titles -- --yes      # Apply without confirmation
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

interface TitleChange {
  url_path: string;
  old_title: string;
  new_title: string;
  reason: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipConfirm = args.includes('--yes');

// Problematic prefixes to remove
const PREFIXES_TO_REMOVE = [
  'FOOTWEAR:',
  'RUGS:',
  'SADDLES:',
  'CLOTHING -',
  'RIDER:',
  'STABLE:',
  'HORSE:',
];

/**
 * Convert kebab-case to Title Case
 */
function toTitleCase(text: string): string {
  // Words that should stay lowercase (unless first word)
  const lowercaseWords = ['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for'];
  
  return text
    .split(/[\s-]+/)
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      
      // Keep & as is
      if (word === '&') return word;
      
      // Check if word should stay lowercase
      if (lowercaseWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Capitalize
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Generate proper h1_title from URL path
 */
function generateH1FromUrl(urlPath: string): string {
  const segments = urlPath.split('/').filter(Boolean);
  
  if (segments.length === 0) return '';
  
  // Get the last segment (most specific)
  const lastSegment = segments[segments.length - 1];
  
  // Get parent category for context
  const parentCategory = segments.length > 1 ? segments[0] : null;
  
  // Convert to title case
  let title = toTitleCase(lastSegment);
  
  // Add context from parent category if needed
  if (parentCategory && segments.length === 2) {
    const parentTitle = toTitleCase(parentCategory);
    
    // Special cases where we add parent context
    if (parentCategory === 'clothing' && !title.toLowerCase().includes('clothing')) {
      // /clothing/kids -> "Kids Clothing"
      // /clothing/footwear -> "Footwear" (already descriptive)
      if (!['footwear', 'accessories', 'outerwear', 'sleepwear', 'activewear', 'tops'].includes(lastSegment)) {
        title = `${title} Clothing`;
      }
    } else if (parentCategory === 'horse' && segments.length === 2) {
      // /horse/boots -> "Horse Boots"
      // /horse/rugs -> "Horse Rugs"
      if (!title.toLowerCase().includes('horse') && !['saddles', 'rugs'].includes(lastSegment)) {
        title = `Horse ${title}`;
      }
    }
  }
  
  // Handle level 3 (subcategories)
  if (segments.length === 3) {
    const middleSegment = segments[1];
    const middleTitle = toTitleCase(middleSegment);
    
    // /horse/rugs/summer -> "Summer Rugs"
    // /horse/boots/bell-boots -> "Bell Boots"
    // /clothing/footwear/western -> "Western Boots"
    // /horse/tack/accessories -> "Tack Accessories"
    
    // Special case: if last segment is generic (accessories, etc), add middle segment
    if (lastSegment === 'accessories' && !title.toLowerCase().includes(middleSegment)) {
      title = `${middleTitle} ${title}`;
    } else if (middleSegment === 'rugs' && !title.toLowerCase().includes('rug')) {
      title = `${title} Rugs`;
    } else if (middleSegment === 'boots' && !title.toLowerCase().includes('boot')) {
      title = `${title} Boots`;
    } else if (middleSegment === 'saddles' && !title.toLowerCase().includes('saddle')) {
      title = `${title} Saddles`;
    } else if (middleSegment === 'footwear' && !title.toLowerCase().includes('footwear') && !title.toLowerCase().includes('boot')) {
      title = `${title} Boots`;
    }
  }
  
  return title;
}

/**
 * Check if title has problematic prefix
 */
function hasProblematicPrefix(title: string): boolean {
  return PREFIXES_TO_REMOVE.some(prefix => 
    title.toUpperCase().startsWith(prefix.toUpperCase())
  );
}

/**
 * Remove problematic prefix from title
 */
function removePrefix(title: string): string {
  let cleaned = title;
  
  for (const prefix of PREFIXES_TO_REMOVE) {
    const regex = new RegExp(`^${prefix}\\s*`, 'i');
    cleaned = cleaned.replace(regex, '');
  }
  
  return cleaned.trim();
}

/**
 * Check if title is redundant (e.g., "Footwear: Equestrian Footwear")
 */
function isRedundant(title: string): boolean {
  const cleaned = removePrefix(title);
  const words = cleaned.toLowerCase().split(/\s+/);
  
  // Check if the same word appears multiple times
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // If any significant word (>3 chars) appears more than once, it's redundant
  return Object.entries(wordCounts).some(([word, count]) => 
    word.length > 3 && count > 1
  );
}

/**
 * Determine if title needs fixing
 */
function shouldUpdateTitle(urlPath: string, currentTitle: string): boolean {
  // Check for problematic prefixes
  if (hasProblematicPrefix(currentTitle)) {
    return true;
  }
  
  // Check for redundancy
  if (isRedundant(currentTitle)) {
    return true;
  }
  
  // Check for "Clothing -" pattern
  if (currentTitle.includes('Clothing -')) {
    return true;
  }
  
  return false;
}

/**
 * Generate new title for a row
 */
function generateNewTitle(urlPath: string, currentTitle: string): string {
  // If title has prefix, try to clean it first
  if (hasProblematicPrefix(currentTitle)) {
    let cleaned = removePrefix(currentTitle);
    
    // If cleaned title is redundant or too generic, generate from URL
    if (isRedundant(`PREFIX: ${cleaned}`) || cleaned.split(/\s+/).length < 2) {
      return generateH1FromUrl(urlPath);
    }
    
    // For complex titles like "Winter Rugs, Neck Rugs & Hoods", extract the main part
    if (cleaned.includes(',')) {
      const mainPart = cleaned.split(',')[0].trim();
      return toTitleCase(mainPart);
    }
    
    return toTitleCase(cleaned);
  }
  
  // For "Clothing -" pattern, generate from URL
  if (currentTitle.includes('Clothing -')) {
    return generateH1FromUrl(urlPath);
  }
  
  // Generate from URL
  return generateH1FromUrl(urlPath);
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📊 Analyzing collection-content.csv...\n');
  
  const csvPath = path.join(process.cwd(), 'exports', 'collection-content.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: collection-content.csv not found at:', csvPath);
    process.exit(1);
  }
  
  // Read CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CollectionRow[];
  
  console.log(`   Total categories: ${records.length}\n`);
  
  // Find titles that need fixing
  const changes: TitleChange[] = [];
  
  for (const row of records) {
    if (shouldUpdateTitle(row.url_path, row.h1_title)) {
      const newTitle = generateNewTitle(row.url_path, row.h1_title);
      
      if (newTitle !== row.h1_title && newTitle.length > 0) {
        let reason = '';
        if (hasProblematicPrefix(row.h1_title)) {
          reason = 'Has problematic prefix';
        } else if (isRedundant(row.h1_title)) {
          reason = 'Redundant title';
        } else if (row.h1_title.includes('Clothing -')) {
          reason = 'Has "Clothing -" prefix';
        }
        
        changes.push({
          url_path: row.url_path,
          old_title: row.h1_title,
          new_title: newTitle,
          reason,
        });
      }
    }
  }
  
  // Display changes
  if (changes.length === 0) {
    console.log('✅ No titles need fixing! All titles are already correct.\n');
    return;
  }
  
  console.log(`🔍 Found ${changes.length} titles that need fixing:\n`);
  
  changes.forEach((change, index) => {
    console.log(`  ${index + 1}. ${change.url_path}`);
    console.log(`     Current: "${change.old_title}"`);
    console.log(`     New:     "${change.new_title}"`);
    console.log(`     Reason:  ${change.reason}`);
    console.log('');
  });
  
  console.log(`📊 Summary:`);
  console.log(`   ✅ ${changes.length} titles will be updated`);
  console.log(`   ✅ ${records.length - changes.length} titles are already correct\n`);
  
  // Dry run mode
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
    console.log('To apply changes, run: npm run fix-h1-titles\n');
    return;
  }
  
  // Confirmation
  if (!skipConfirm) {
    console.log('💾 Backup will be created: exports/collection-content.backup.csv\n');
    
    // Simple confirmation (in real scenario, would use readline)
    console.log('⚠️  To apply changes, run with --yes flag:');
    console.log('   npm run fix-h1-titles -- --yes\n');
    return;
  }
  
  // Create backup
  const backupPath = path.join(process.cwd(), 'exports', 'collection-content.backup.csv');
  fs.copyFileSync(csvPath, backupPath);
  console.log(`✅ Backup created: ${backupPath}\n`);
  
  // Apply changes
  const updatedRecords = records.map(row => {
    const change = changes.find(c => c.url_path === row.url_path);
    if (change) {
      return {
        ...row,
        h1_title: change.new_title,
      };
    }
    return row;
  });
  
  // Write updated CSV
  const output = stringify(updatedRecords, {
    header: true,
    columns: Object.keys(records[0]),
  });
  
  fs.writeFileSync(csvPath, output, 'utf-8');
  
  console.log('✅ Changes applied successfully!\n');
  console.log('📝 Next steps:');
  console.log('   1. Run validation: npm run preview-titles -- --validate');
  console.log('   2. Review changes: git diff exports/collection-content.csv');
  console.log('   3. Test locally: npm run dev');
  console.log('   4. Commit changes: git add exports/collection-content.csv && git commit\n');
  console.log('💡 To revert: cp exports/collection-content.backup.csv exports/collection-content.csv\n');
}

// Run
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
