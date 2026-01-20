/**
 * Preview Category Titles Script
 * 
 * This script helps you preview and validate title changes in collection-content.csv
 * 
 * Usage:
 *   npm run preview-titles                    # Show all titles
 *   npm run preview-titles -- --category horse # Show only horse category
 *   npm run preview-titles -- --level 1       # Show only top-level categories
 *   npm run preview-titles -- --validate      # Check for issues
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

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

interface TitleIssue {
  url_path: string;
  field: string;
  issue: string;
  current_value: string;
  suggestion?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const categoryFilter = args.find(arg => arg.startsWith('--category='))?.split('=')[1];
const levelFilter = args.find(arg => arg.startsWith('--level='))?.split('=')[1];
const validateMode = args.includes('--validate');
const helpMode = args.includes('--help') || args.includes('-h');

if (helpMode) {
  console.log(`
📋 Preview Category Titles Script

Usage:
  npm run preview-titles                      # Show all titles
  npm run preview-titles -- --category=horse  # Show only horse category
  npm run preview-titles -- --level=1         # Show only top-level categories
  npm run preview-titles -- --validate        # Check for title issues

Options:
  --category=<name>   Filter by category (e.g., horse, rider, clothing)
  --level=<number>    Filter by category level (1, 2, or 3)
  --validate          Run validation checks on all titles
  --help, -h          Show this help message

Examples:
  npm run preview-titles -- --category=horse --level=2
  npm run preview-titles -- --validate
  `);
  process.exit(0);
}

// Load CSV
const csvPath = path.join(process.cwd(), 'exports', 'collection-content.csv');

if (!fs.existsSync(csvPath)) {
  console.error('❌ Error: collection-content.csv not found at:', csvPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf-8');
const records = csv.parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CollectionRow[];

console.log(`\n📊 Loaded ${records.length} categories from CSV\n`);

// Filter records
let filteredRecords = records;

if (categoryFilter) {
  filteredRecords = filteredRecords.filter(r => 
    r.url_path.startsWith(`/${categoryFilter}`)
  );
  console.log(`🔍 Filtered to category: ${categoryFilter} (${filteredRecords.length} entries)\n`);
}

if (levelFilter) {
  filteredRecords = filteredRecords.filter(r => 
    r.category_level === levelFilter
  );
  console.log(`🔍 Filtered to level: ${levelFilter} (${filteredRecords.length} entries)\n`);
}

// Validation function
function validateTitles(records: CollectionRow[]): TitleIssue[] {
  const issues: TitleIssue[] = [];

  records.forEach(row => {
    // Check meta_title length (should be 50-60 chars)
    if (row.meta_title.length > 70) {
      issues.push({
        url_path: row.url_path,
        field: 'meta_title',
        issue: 'Too long for SEO (>70 chars)',
        current_value: row.meta_title,
        suggestion: `Consider shortening to ~60 chars (currently ${row.meta_title.length})`
      });
    }

    // Check if meta_title includes brand
    if (!row.meta_title.includes('The Equestrian') && !row.meta_title.includes('Equestrian')) {
      issues.push({
        url_path: row.url_path,
        field: 'meta_title',
        issue: 'Missing brand name',
        current_value: row.meta_title,
        suggestion: 'Add "| The Equestrian" to the end'
      });
    }

    // Check if h1_title is too short
    if (row.h1_title.length < 3) {
      issues.push({
        url_path: row.url_path,
        field: 'h1_title',
        issue: 'Too short',
        current_value: row.h1_title,
        suggestion: 'Make more descriptive'
      });
    }

    // Check if h1_title is too long
    if (row.h1_title.length > 60) {
      issues.push({
        url_path: row.url_path,
        field: 'h1_title',
        issue: 'Too long (>60 chars)',
        current_value: row.h1_title,
        suggestion: 'Consider shortening for better readability'
      });
    }

    // Check if breadcrumb is too long
    if (row.breadcrumb_label.length > 30) {
      issues.push({
        url_path: row.url_path,
        field: 'breadcrumb_label',
        issue: 'Too long for breadcrumb (>30 chars)',
        current_value: row.breadcrumb_label,
        suggestion: 'Use a shorter version'
      });
    }

    // Check if breadcrumb is empty
    if (!row.breadcrumb_label || row.breadcrumb_label.trim() === '') {
      issues.push({
        url_path: row.url_path,
        field: 'breadcrumb_label',
        issue: 'Empty breadcrumb label',
        current_value: row.breadcrumb_label,
        suggestion: 'Add a breadcrumb label'
      });
    }

    // Check if meta_description is too short
    if (row.meta_description.length < 120) {
      issues.push({
        url_path: row.url_path,
        field: 'meta_description',
        issue: 'Meta description too short (<120 chars)',
        current_value: row.meta_description,
        suggestion: 'Expand to 150-160 characters for better SEO'
      });
    }

    // Check if meta_description is too long
    if (row.meta_description.length > 160) {
      issues.push({
        url_path: row.url_path,
        field: 'meta_description',
        issue: 'Meta description too long (>160 chars)',
        current_value: row.meta_description,
        suggestion: `Shorten to ~160 chars (currently ${row.meta_description.length})`
      });
    }
  });

  return issues;
}

// Display function
function displayTitles(records: CollectionRow[]) {
  records.forEach((row, index) => {
    const levelEmoji = row.category_level === '1' ? '📁' : row.category_level === '2' ? '📂' : '📄';
    
    console.log(`${levelEmoji} ${row.url_path}`);
    console.log(`   H1 Title:     ${row.h1_title}`);
    console.log(`   Meta Title:   ${row.meta_title} (${row.meta_title.length} chars)`);
    console.log(`   Breadcrumb:   ${row.breadcrumb_label}`);
    console.log(`   Level:        ${row.category_level}`);
    console.log(`   Status:       ${row.status}`);
    
    if (row.parent_url) {
      console.log(`   Parent:       ${row.parent_url}`);
    }
    
    console.log('');
  });
}

// Run validation mode
if (validateMode) {
  console.log('🔍 Running validation checks...\n');
  
  const issues = validateTitles(filteredRecords);
  
  if (issues.length === 0) {
    console.log('✅ No issues found! All titles look good.\n');
  } else {
    console.log(`⚠️  Found ${issues.length} potential issues:\n`);
    
    // Group by url_path
    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.url_path]) {
        acc[issue.url_path] = [];
      }
      acc[issue.url_path].push(issue);
      return acc;
    }, {} as Record<string, TitleIssue[]>);

    Object.entries(groupedIssues).forEach(([url_path, pathIssues]) => {
      console.log(`\n📍 ${url_path}`);
      pathIssues.forEach(issue => {
        console.log(`   ⚠️  ${issue.field}: ${issue.issue}`);
        console.log(`      Current: "${issue.current_value}"`);
        if (issue.suggestion) {
          console.log(`      💡 ${issue.suggestion}`);
        }
      });
    });
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total categories checked: ${filteredRecords.length}`);
    console.log(`   Categories with issues: ${Object.keys(groupedIssues).length}`);
    console.log(`   Total issues found: ${issues.length}`);
    
    // Issue breakdown
    const issueTypes = issues.reduce((acc, issue) => {
      const key = `${issue.field}: ${issue.issue}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n   Issue breakdown:`);
    Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`);
      });
  }
} else {
  // Display mode
  displayTitles(filteredRecords);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total entries: ${filteredRecords.length}`);
  
  // Count by level
  const levelCounts = filteredRecords.reduce((acc, r) => {
    acc[r.category_level] = (acc[r.category_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`   By level:`);
  Object.entries(levelCounts).forEach(([level, count]) => {
    console.log(`      Level ${level}: ${count}`);
  });
  
  console.log(`\n💡 Tip: Use --validate to check for title issues`);
  console.log(`   Example: npm run preview-titles -- --validate\n`);
}
