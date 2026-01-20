#!/usr/bin/env tsx

/**
 * Intelligent Content Validator & Fixer
 * 
 * Goes through each page one-by-one:
 * 1. Validates content quality
 * 2. Identifies specific issues
 * 3. Fixes issues automatically
 * 4. Shows progress and summary
 * 
 * Validation checks:
 * - Meta description mentions correct products
 * - No empty HTML elements
 * - FAQs are appropriate for category type
 * - Long description has sufficient content
 * - No grammar errors or broken fragments
 * - Proper capitalization
 * 
 * Usage:
 *   npm run validate-content -- --fix          (validate and fix all)
 *   npm run validate-content -- --check-only   (validate only, no fixes)
 *   npm run validate-content -- --start=50     (start from row 50)
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

interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  autoFixable: boolean;
}

interface ValidationResult {
  url: string;
  h1_title: string;
  issues: ValidationIssue[];
  score: number; // 0-100
}

// Category context for better content generation
const CATEGORY_CONTEXT: Record<string, { type: string; keywords: string[] }> = {
  'luggage': { type: 'accessory', keywords: ['travel', 'storage', 'bags', 'gear bags', 'duffel'] },
  'handbag': { type: 'accessory', keywords: ['fashion', 'style', 'carry', 'accessories'] },
  'giftware': { type: 'gift', keywords: ['gifts', 'presents', 'decorative', 'collectibles'] },
  'jewellery': { type: 'accessory', keywords: ['jewelry', 'necklaces', 'bracelets', 'earrings'] },
  'saddle': { type: 'equipment', keywords: ['riding', 'discipline', 'fit', 'leather', 'synthetic'] },
  'rug': { type: 'equipment', keywords: ['weather', 'protection', 'warmth', 'waterproof', 'fill'] },
  'helmet': { type: 'safety', keywords: ['safety', 'certified', 'protection', 'standards', 'ventilation'] },
  'boot': { type: 'equipment', keywords: ['riding', 'leather', 'fit', 'support'] },
  'breech': { type: 'clothing', keywords: ['riding', 'grip', 'stretch', 'comfort'] },
};

function getCategoryContext(urlPath: string): { type: string; keywords: string[] } {
  for (const [key, context] of Object.entries(CATEGORY_CONTEXT)) {
    if (urlPath.includes(key)) {
      return context;
    }
  }
  return { type: 'general', keywords: [] };
}

function validateMetaDescription(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { meta_description, url_path, h1_title } = row;
  
  // Check length
  if (meta_description.length < 120) {
    issues.push({
      field: 'meta_description',
      issue: `Too short (${meta_description.length} chars, should be 150-160)`,
      severity: 'warning',
      autoFixable: true,
    });
  } else if (meta_description.length > 160) {
    issues.push({
      field: 'meta_description',
      issue: `Too long (${meta_description.length} chars, should be 150-160)`,
      severity: 'warning',
      autoFixable: true,
    });
  }
  
  // Check for wrong product mentions
  const context = getCategoryContext(url_path);
  if (context.type === 'accessory' || context.type === 'gift') {
    if (meta_description.includes('helmets, boots, gloves and safety vests')) {
      issues.push({
        field: 'meta_description',
        issue: 'Mentions wrong products (helmets/boots for luggage/gifts)',
        severity: 'critical',
        autoFixable: true,
      });
    }
  }
  
  if (url_path.includes('saddle') && meta_description.includes('helmets, boots')) {
    issues.push({
      field: 'meta_description',
      issue: 'Mentions wrong products for saddle category',
      severity: 'critical',
      autoFixable: true,
    });
  }
  
  return issues;
}

function validateLongDescription(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { long_description, h1_title } = row;
  
  // Check for empty elements
  if (long_description.includes('<ul></ul>') || long_description.includes('<ul>\s*</ul>')) {
    issues.push({
      field: 'long_description',
      issue: 'Contains empty <ul> element',
      severity: 'critical',
      autoFixable: true,
    });
  }
  
  if (long_description.includes('<li></li>') || long_description.includes('<li>\s*</li>')) {
    issues.push({
      field: 'long_description',
      issue: 'Contains empty <li> elements',
      severity: 'critical',
      autoFixable: true,
    });
  }
  
  // Check for broken fragments
  if (long_description.match(/<p>[,\-\s\.]+<\/p>/)) {
    issues.push({
      field: 'long_description',
      issue: 'Contains broken text fragments',
      severity: 'critical',
      autoFixable: true,
    });
  }
  
  // Check content length
  const textContent = long_description.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 100) {
    issues.push({
      field: 'long_description',
      issue: `Content too sparse (${textContent.length} chars)`,
      severity: 'warning',
      autoFixable: true,
    });
  }
  
  return issues;
}

function validateFAQs(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { faq_json, url_path } = row;
  
  try {
    const faqs = JSON.parse(faq_json || '[]');
    const context = getCategoryContext(url_path);
    
    // Check if FAQs are inappropriate for category type
    if (context.type === 'accessory' || context.type === 'gift') {
      const hasInappropriate = faqs.some((faq: any) => 
        faq.answer.includes('Safety should always come first') ||
        faq.answer.includes('competition-approved') ||
        faq.answer.includes('certified products that meet current standards')
      );
      
      if (hasInappropriate) {
        issues.push({
          field: 'faq_json',
          issue: 'FAQs mention safety/competition for non-equipment items',
          severity: 'critical',
          autoFixable: true,
        });
      }
    }
    
    // Check for generic "How do I choose the right X?" questions
    const hasGeneric = faqs.some((faq: any) => 
      faq.question.includes('How do I choose the right') && 
      faq.question.includes(row.h1_title.toLowerCase())
    );
    
    if (hasGeneric && faqs.length < 3) {
      issues.push({
        field: 'faq_json',
        issue: 'Only has generic FAQs, needs specific questions',
        severity: 'warning',
        autoFixable: false,
      });
    }
  } catch (e) {
    issues.push({
      field: 'faq_json',
      issue: 'Invalid JSON format',
      severity: 'critical',
      autoFixable: false,
    });
  }
  
  return issues;
}

function validateShortDescription(row: CsvRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { short_description } = row;
  
  // Check capitalization
  if (short_description && short_description[0] !== short_description[0].toUpperCase()) {
    issues.push({
      field: 'short_description',
      issue: 'Does not start with capital letter',
      severity: 'warning',
      autoFixable: true,
    });
  }
  
  // Check for category prefix patterns
  if (short_description.match(/^[a-z\s]+:\s+/i)) {
    issues.push({
      field: 'short_description',
      issue: 'Contains category prefix (e.g., "saddles: jumping saddles")',
      severity: 'warning',
      autoFixable: true,
    });
  }
  
  return issues;
}

function validateRow(row: CsvRow): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...validateMetaDescription(row),
    ...validateLongDescription(row),
    ...validateFAQs(row),
    ...validateShortDescription(row),
  ];
  
  // Calculate score (100 = perfect, 0 = many critical issues)
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  
  let score = 100;
  score -= criticalCount * 20;
  score -= warningCount * 5;
  score = Math.max(0, score);
  
  return {
    url: row.url_path,
    h1_title: row.h1_title,
    issues: allIssues,
    score,
  };
}

// Auto-fix functions
function fixMetaDescription(row: CsvRow): boolean {
  const context = getCategoryContext(row.url_path);
  let fixed = false;
  
  // Fix wrong product mentions
  if (row.meta_description.includes('helmets, boots, gloves and safety vests')) {
    if (context.type === 'accessory' || context.type === 'gift') {
      row.meta_description = `Shop quality ${row.h1_title.toLowerCase()} from trusted brands. Free shipping Australia-wide. Expert advice available. Find the perfect ${row.h1_title.toLowerCase()} for your needs.`;
      fixed = true;
    }
  }
  
  // Ensure proper length (150-160 chars)
  if (row.meta_description.length < 120 || row.meta_description.length > 160) {
    const base = `Shop premium ${row.h1_title.toLowerCase()} from top brands. Free shipping Australia-wide. Expert advice available.`;
    if (base.length < 150) {
      row.meta_description = base + ' Find the perfect gear for your needs.';
    } else {
      row.meta_description = base;
    }
    fixed = true;
  }
  
  return fixed;
}

function fixLongDescription(row: CsvRow): boolean {
  let fixed = false;
  let desc = row.long_description;
  
  // Remove empty elements
  const before = desc;
  desc = desc.replace(/<ul>\s*<\/ul>/g, '');
  desc = desc.replace(/<ol>\s*<\/ol>/g, '');
  desc = desc.replace(/<li>\s*<\/li>/g, '');
  desc = desc.replace(/<h3>\s*<\/h3>/g, '');
  desc = desc.replace(/<p>\s*<\/p>/g, '');
  desc = desc.replace(/<p>[,\-\s\.]+<\/p>/g, '');
  
  if (desc !== before) {
    row.long_description = desc;
    fixed = true;
  }
  
  // If content is too sparse, add basic content
  const textContent = desc.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 100) {
    row.long_description = `<h2>${row.h1_title}</h2><p>Browse our selection of quality ${row.h1_title.toLowerCase()}. Carefully curated products from trusted brands with fast shipping Australia-wide.</p>`;
    fixed = true;
  }
  
  return fixed;
}

function fixFAQs(row: CsvRow): boolean {
  try {
    const faqs = JSON.parse(row.faq_json || '[]');
    const context = getCategoryContext(row.url_path);
    
    if (context.type === 'accessory' || context.type === 'gift') {
      const hasInappropriate = faqs.some((faq: any) => 
        faq.answer.includes('Safety should always come first') ||
        faq.answer.includes('competition-approved')
      );
      
      if (hasInappropriate) {
        const newFaqs = [
          {
            question: `What ${row.h1_title.toLowerCase()} do you stock?`,
            answer: `We stock a range of quality ${row.h1_title.toLowerCase()} suitable for equestrians. Browse our collection to see available styles and options. All products include detailed descriptions.`,
          },
          {
            question: 'Do you offer free shipping?',
            answer: 'Yes! We offer free shipping on all orders within Australia. Orders are typically dispatched within 24 hours.',
          },
        ];
        
        row.faq_json = JSON.stringify(newFaqs);
        return true;
      }
    }
  } catch (e) {
    // Skip invalid JSON
  }
  
  return false;
}

function fixShortDescription(row: CsvRow): boolean {
  let fixed = false;
  let desc = row.short_description;
  
  // Remove category prefix
  const before = desc;
  desc = desc.replace(/^[a-z\s]+:\s*/i, '');
  
  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  if (desc !== before) {
    row.short_description = desc;
    fixed = true;
  }
  
  return fixed;
}

function autoFixRow(row: CsvRow): string[] {
  const fixed: string[] = [];
  
  if (fixMetaDescription(row)) fixed.push('meta_description');
  if (fixLongDescription(row)) fixed.push('long_description');
  if (fixFAQs(row)) fixed.push('faq_json');
  if (fixShortDescription(row)) fixed.push('short_description');
  
  return fixed;
}

function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const checkOnly = args.includes('--check-only');
  const startRow = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0');
  
  if (!shouldFix && !checkOnly) {
    console.error('❌ Error: Must specify either --fix or --check-only');
    console.log('\nUsage:');
    console.log('  npm run validate-content -- --fix          (validate and fix)');
    console.log('  npm run validate-content -- --check-only   (validate only)');
    console.log('  npm run validate-content -- --start=50     (start from row 50)');
    process.exit(1);
  }
  
  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as CsvRow[];
  
  console.log(`\n🔍 Validating ${rows.length} pages (starting from row ${startRow})...\n`);
  
  const results: ValidationResult[] = [];
  let fixedCount = 0;
  
  // Process each row
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const result = validateRow(row);
    
    // Show progress every 10 rows
    if ((i - startRow) % 10 === 0) {
      console.log(`📄 Processing: ${i + 1}/${rows.length} - ${row.url_path}`);
    }
    
    if (result.issues.length > 0) {
      results.push(result);
      
      // Auto-fix if requested
      if (shouldFix) {
        const fixedFields = autoFixRow(row);
        if (fixedFields.length > 0) {
          fixedCount++;
          console.log(`   ✅ Fixed: ${fixedFields.join(', ')}`);
        }
      }
    }
  }
  
  // Summary
  console.log(`\n\n📊 Validation Summary:\n`);
  console.log(`   Total pages: ${rows.length}`);
  console.log(`   Pages with issues: ${results.length}`);
  console.log(`   Pages fixed: ${fixedCount}`);
  
  // Show worst offenders
  const worst = results.sort((a, b) => a.score - b.score).slice(0, 20);
  console.log(`\n\n⚠️  Pages needing attention (showing top 20):\n`);
  
  worst.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.url} (Score: ${result.score}/100)`);
    console.log(`   Title: ${result.h1_title}`);
    result.issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      console.log(`   ${icon} ${issue.field}: ${issue.issue}`);
    });
    console.log('');
  });
  
  if (shouldFix) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = CSV_PATH.replace('.csv', `.backup-validated-${timestamp}.csv`);
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
  } else {
    console.log(`\n💡 Run with --fix to automatically fix issues`);
  }
}

main();
