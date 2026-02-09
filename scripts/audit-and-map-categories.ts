#!/usr/bin/env tsx
/**
 * Category Structure Audit & Intelligent Mapping
 * 
 * This script:
 * 1. Analyzes old Shopify URLs vs new headless structure
 * 2. Uses logic + Anthropic Claude to intelligently map old → new URLs
 * 3. Identifies missing category pages that need to be created
 * 4. Outputs detailed reports for review before applying changes
 * 
 * Run modes:
 * - Dry run (30 samples): npm run audit:categories
 * - Full analysis: npm run audit:categories -- --full
 * - Apply changes: npm run audit:categories -- --apply
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@vercel/postgres';

// ============================================================================
// TYPES
// ============================================================================

interface OldUrl {
  url: string;
  segments: string[];
}

interface ExistingCategory {
  url_path: string;
  h1_title: string;
  breadcrumb_label: string;
  parent_url: string | null;
  category_level: number;
  status: string;
}

interface ExistingBrand {
  handle: string;
  title: string;
}

interface RedirectMapping {
  from: string;
  to: string;
  method: 'exact-match' | 'brand-match' | 'pattern-match' | 'ai-suggested' | 'unmappable';
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
  alternatives?: string[];
  isNewCategory?: boolean;
}

interface MissingCategory {
  url_path: string;
  parent_url: string | null;
  category_level: number;
  top_level: string;
  suggested_label: string;
  created_for: string[]; // Which old URLs map to this
}

interface AuditReport {
  summary: {
    totalOldUrls: number;
    alreadyMapped: number;
    newMappings: number;
    unmappable: number;
    missingCategories: number;
  };
  redirectMappings: RedirectMapping[];
  missingCategories: MissingCategory[];
  stats: {
    byMethod: Record<string, number>;
    byConfidence: Record<string, number>;
    byTopLevel: Record<string, number>;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TOP_LEVEL_CATEGORIES = ['horse', 'rider', 'clothing', 'pet', 'accessories'];
const DRY_RUN_SAMPLE_SIZE = 30;
const MODE = process.argv.includes('--full') ? 'full' : process.argv.includes('--apply') ? 'apply' : 'dry-run';

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load old URLs from CSV
 */
function loadOldUrls(): OldUrl[] {
  const csvPath = path.join(process.cwd(), 'docs', 'all_collection_urls.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const oldUrls: OldUrl[] = [];
  const seen = new Set<string>();

  for (const row of records) {
    const url = (row['OLD URLs'] || '').trim();
    if (!url || seen.has(url)) continue;
    
    seen.add(url);
    const segments = url
      .replace(/^\/collections\//, '')
      .split('/')
      .filter(s => s);
    
    oldUrls.push({ url, segments });
  }

  return oldUrls;
}

/**
 * Load existing categories from database
 */
async function loadExistingCategories(): Promise<Map<string, ExistingCategory>> {
  try {
    const result = await sql`
      SELECT 
        url_path,
        h1_title,
        breadcrumb_label,
        parent_url,
        category_level,
        status
      FROM collection_content
      WHERE status = 'published'
      ORDER BY url_path
    `;

    const map = new Map<string, ExistingCategory>();
    for (const row of result.rows) {
      map.set(row.url_path as string, row as ExistingCategory);
    }

    console.log(`✅ Loaded ${map.size} existing categories from database`);
    return map;
  } catch (error) {
    console.error('❌ Failed to load categories:', error);
    process.exit(1);
  }
}

/**
 * Load existing brands from CSV
 */
function loadExistingBrands(): Map<string, ExistingBrand> {
  const csvPath = path.join(process.cwd(), 'exports', 'brand-mapping.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.warn('⚠️  Brand mapping CSV not found');
    return new Map();
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const map = new Map<string, ExistingBrand>();
  for (const row of records) {
    const handle = (row.handle || '').trim();
    const title = (row.title || '').trim();
    if (handle) {
      map.set(handle, { handle, title });
    }
  }

  console.log(`✅ Loaded ${map.size} existing brands`);
  return map;
}

/**
 * Load existing redirects
 */
function loadExistingRedirects(): Map<string, string> {
  const csvPath = path.join(process.cwd(), 'redirects', 'collections.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.warn('⚠️  Existing redirects CSV not found');
    return new Map();
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const map = new Map<string, string>();
  for (const row of records) {
    const from = (row.from || '').trim();
    const to = (row.to || '').trim();
    if (from && to) {
      map.set(from, to);
    }
  }

  console.log(`✅ Loaded ${map.size} existing redirects`);
  return map;
}

// ============================================================================
// MAPPING LOGIC
// ============================================================================

/**
 * Calculate string similarity (0-1)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Try to map using pattern matching
 */
function patternMatch(
  segments: string[],
  existingCategories: Map<string, ExistingCategory>,
  topLevel: string
): { path: string; confidence: 'high' | 'medium' | 'low' } | null {
  const candidates: Array<{ path: string; score: number }> = [];

  // Get all categories for this top level
  for (const [urlPath, category] of existingCategories) {
    if (!urlPath.startsWith(`/${topLevel}/`)) continue;

    const categorySegments = urlPath.split('/').filter(s => s);
    
    // Calculate match score
    let score = 0;
    
    // Exact segment matches
    for (const seg of segments) {
      if (categorySegments.includes(seg)) {
        score += 2;
      } else {
        // Fuzzy match
        for (const catSeg of categorySegments) {
          const sim = similarity(seg, catSeg);
          if (sim > 0.7) {
            score += sim;
          }
        }
      }
    }

    if (score > 0) {
      candidates.push({ path: urlPath, score });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (best.score >= 4) confidence = 'high';
  else if (best.score >= 2) confidence = 'medium';

  return { path: best.path, confidence };
}

/**
 * Use Anthropic Claude to suggest mapping
 */
async function aiSuggestMapping(
  oldUrl: string,
  segments: string[],
  existingCategories: Map<string, ExistingCategory>,
  anthropic: Anthropic
): Promise<{ path: string; isNew: boolean; confidence: 'high' | 'medium' | 'low'; reasoning: string }> {
  
  // Build category structure by top level
  const categoryStructure: Record<string, string[]> = {};
  for (const topLevel of TOP_LEVEL_CATEGORIES) {
    categoryStructure[topLevel] = [];
    for (const [urlPath] of existingCategories) {
      if (urlPath.startsWith(`/${topLevel}/`)) {
        categoryStructure[topLevel].push(urlPath);
      }
    }
  }

  const prompt = `You are mapping old Shopify collection URLs to a new headless storefront structure.

TOP-LEVEL CATEGORIES (fixed, cannot create new ones):
- /horse - Horse equipment, tack, boots, rugs, grooming, supplements, stable equipment
- /rider - Rider gear, helmets, gloves, body protectors, accessories, jewellery
- /clothing - Equestrian apparel, breeches, jackets, footwear, tops
- /pet - Pet products (dogs, cats, birds, small animals)
- /accessories - Gifts, books, collectibles, gift cards

OLD SHOPIFY URL: ${oldUrl}
EXTRACTED SEGMENTS: ${segments.join(', ')}

EXISTING CATEGORY STRUCTURE:
${JSON.stringify(categoryStructure, null, 2)}

TASK:
1. Determine which top-level category this old URL belongs to
2. Find the best matching EXISTING category path, OR
3. If no good match exists, suggest a NEW category path within the appropriate top-level

RULES:
- MUST use one of the 5 top-level categories
- Can suggest new subcategories (2nd level) or sub-subcategories (3rd level)
- Maximum 3 levels: /top-level/subcategory/sub-subcategory
- Use kebab-case for URL slugs
- Prefer existing categories when possible
- Consider semantic meaning, not just string matching

Return ONLY valid JSON (no markdown, no explanation):
{
  "topLevel": "horse",
  "path": "/horse/boots/bell-boots",
  "isNew": false,
  "confidence": "high",
  "reasoning": "Brief explanation of why this mapping makes sense"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }
    
    const result = JSON.parse(jsonText);
    
    return {
      path: result.path,
      isNew: result.isNew || false,
      confidence: result.confidence || 'medium',
      reasoning: result.reasoning || 'AI suggested mapping'
    };
  } catch (error) {
    console.error(`⚠️  AI mapping failed for ${oldUrl}:`, error);
    return {
      path: '/',
      isNew: false,
      confidence: 'low',
      reasoning: 'AI mapping failed, defaulting to home'
    };
  }
}

/**
 * Map a single old URL to new structure
 */
async function mapOldUrl(
  oldUrl: OldUrl,
  existingCategories: Map<string, ExistingCategory>,
  existingBrands: Map<string, ExistingBrand>,
  existingRedirects: Map<string, string>,
  anthropic: Anthropic
): Promise<RedirectMapping> {
  
  const { url, segments } = oldUrl;

  // Check if already mapped
  if (existingRedirects.has(url)) {
    return {
      from: url,
      to: existingRedirects.get(url)!,
      method: 'exact-match',
      confidence: 'high',
      reasoning: 'Already in redirects CSV'
    };
  }

  // Check if it's a brand
  const firstSegment = segments[0];
  if (existingBrands.has(firstSegment)) {
    return {
      from: url,
      to: `/brands/${firstSegment}`,
      method: 'brand-match',
      confidence: 'high',
      reasoning: 'Matches existing brand handle'
    };
  }

  // Try pattern matching for each top-level category
  let bestMatch: { path: string; confidence: 'high' | 'medium' | 'low'; topLevel: string } | null = null;
  
  for (const topLevel of TOP_LEVEL_CATEGORIES) {
    const match = patternMatch(segments, existingCategories, topLevel);
    if (match && (!bestMatch || match.confidence === 'high')) {
      bestMatch = { ...match, topLevel };
      if (match.confidence === 'high') break;
    }
  }

  if (bestMatch && bestMatch.confidence === 'high') {
    return {
      from: url,
      to: bestMatch.path,
      method: 'pattern-match',
      confidence: bestMatch.confidence,
      reasoning: `Pattern matched to ${bestMatch.topLevel} category`
    };
  }

  // Use AI for ambiguous cases
  const aiResult = await aiSuggestMapping(url, segments, existingCategories, anthropic);
  
  return {
    from: url,
    to: aiResult.path,
    method: 'ai-suggested',
    confidence: aiResult.confidence,
    reasoning: aiResult.reasoning,
    isNewCategory: aiResult.isNew
  };
}

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Identify missing categories from mappings
 */
function identifyMissingCategories(
  mappings: RedirectMapping[],
  existingCategories: Map<string, ExistingCategory>
): MissingCategory[] {
  
  const missingPaths = new Map<string, string[]>(); // path -> old URLs that map to it

  for (const mapping of mappings) {
    if (mapping.isNewCategory && !existingCategories.has(mapping.to)) {
      if (!missingPaths.has(mapping.to)) {
        missingPaths.set(mapping.to, []);
      }
      missingPaths.get(mapping.to)!.push(mapping.from);
    }
  }

  const missing: MissingCategory[] = [];

  for (const [urlPath, createdFor] of missingPaths) {
    const segments = urlPath.split('/').filter(s => s);
    const level = segments.length;
    const topLevel = segments[0];
    const parentUrl = level > 1 ? '/' + segments.slice(0, -1).join('/') : null;
    
    // Generate label from last segment
    const lastSegment = segments[segments.length - 1];
    const suggestedLabel = lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    missing.push({
      url_path: urlPath,
      parent_url: parentUrl,
      category_level: level,
      top_level: topLevel,
      suggested_label: suggestedLabel,
      created_for: createdFor
    });
  }

  return missing;
}

/**
 * Generate statistics
 */
function generateStats(mappings: RedirectMapping[]): AuditReport['stats'] {
  const byMethod: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  const byTopLevel: Record<string, number> = {};

  for (const mapping of mappings) {
    byMethod[mapping.method] = (byMethod[mapping.method] || 0) + 1;
    byConfidence[mapping.confidence] = (byConfidence[mapping.confidence] || 0) + 1;
    
    const topLevel = mapping.to.split('/')[1] || 'root';
    byTopLevel[topLevel] = (byTopLevel[topLevel] || 0) + 1;
  }

  return { byMethod, byConfidence, byTopLevel };
}

// ============================================================================
// OUTPUT
// ============================================================================

/**
 * Write report to files
 */
function writeReport(report: AuditReport, mode: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = mode === 'dry-run' ? 'dry-run-sample' : 'full-audit';
  
  // Write JSON report
  const jsonPath = path.join(process.cwd(), 'exports', `${prefix}-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${jsonPath}`);

  // Write redirect mappings CSV
  const redirectsPath = path.join(process.cwd(), 'exports', `${prefix}-redirects-${timestamp}.csv`);
  const redirectsCsv = stringify(
    report.redirectMappings.map(m => ({
      from: m.from,
      to: m.to,
      method: m.method,
      confidence: m.confidence,
      reasoning: m.reasoning || '',
      is_new_category: m.isNewCategory ? 'yes' : 'no'
    })),
    { header: true }
  );
  fs.writeFileSync(redirectsPath, redirectsCsv);
  console.log(`📄 Redirects CSV saved to: ${redirectsPath}`);

  // Write missing categories CSV
  if (report.missingCategories.length > 0) {
    const missingPath = path.join(process.cwd(), 'exports', `${prefix}-missing-categories-${timestamp}.csv`);
    const missingCsv = stringify(
      report.missingCategories.map(m => ({
        url_path: m.url_path,
        parent_url: m.parent_url || '',
        category_level: m.category_level,
        top_level: m.top_level,
        suggested_label: m.suggested_label,
        created_for_urls: m.created_for.join('; ')
      })),
      { header: true }
    );
    fs.writeFileSync(missingPath, missingCsv);
    console.log(`📄 Missing categories CSV saved to: ${missingPath}`);
  }
}

/**
 * Print summary to console
 */
function printSummary(report: AuditReport) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n📈 Overall Stats:');
  console.log(`  Total old URLs analyzed: ${report.summary.totalOldUrls}`);
  console.log(`  Already mapped: ${report.summary.alreadyMapped}`);
  console.log(`  New mappings created: ${report.summary.newMappings}`);
  console.log(`  Unmappable: ${report.summary.unmappable}`);
  console.log(`  Missing categories to create: ${report.summary.missingCategories}`);

  console.log('\n🔧 Mapping Methods:');
  for (const [method, count] of Object.entries(report.stats.byMethod)) {
    console.log(`  ${method}: ${count}`);
  }

  console.log('\n🎯 Confidence Levels:');
  for (const [confidence, count] of Object.entries(report.stats.byConfidence)) {
    console.log(`  ${confidence}: ${count}`);
  }

  console.log('\n📁 By Top-Level Category:');
  for (const [topLevel, count] of Object.entries(report.stats.byTopLevel)) {
    console.log(`  ${topLevel}: ${count}`);
  }

  if (report.summary.missingCategories > 0) {
    console.log('\n⚠️  Missing Categories (need to be created):');
    for (const missing of report.missingCategories.slice(0, 10)) {
      console.log(`  ${missing.url_path} (${missing.suggested_label})`);
    }
    if (report.missingCategories.length > 10) {
      console.log(`  ... and ${report.missingCategories.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🔍 Category Structure Audit & Intelligent Mapping\n');
  console.log(`Mode: ${MODE.toUpperCase()}\n`);

  if (MODE === 'dry-run') {
    console.log(`📊 Processing ${DRY_RUN_SAMPLE_SIZE} sample URLs for review\n`);
  }

  // Initialize Anthropic
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }

  // Load data
  console.log('📥 Loading data...\n');
  const oldUrls = loadOldUrls();
  const existingCategories = await loadExistingCategories();
  const existingBrands = loadExistingBrands();
  const existingRedirects = loadExistingRedirects();

  console.log(`\n📊 Found ${oldUrls.length} old URLs to process\n`);

  // Select URLs to process
  const urlsToProcess = MODE === 'dry-run' 
    ? oldUrls.slice(0, DRY_RUN_SAMPLE_SIZE)
    : oldUrls;

  // Process mappings
  console.log('🔄 Processing mappings...\n');
  const mappings: RedirectMapping[] = [];
  let processed = 0;

  for (const oldUrl of urlsToProcess) {
    processed++;
    process.stdout.write(`\r  Progress: ${processed}/${urlsToProcess.length}`);
    
    const mapping = await mapOldUrl(
      oldUrl,
      existingCategories,
      existingBrands,
      existingRedirects,
      anthropic
    );
    
    mappings.push(mapping);

    // Rate limiting for AI calls (1 per second)
    if (mapping.method === 'ai-suggested') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n\n✅ Mapping complete!\n');

  // Identify missing categories
  const missingCategories = identifyMissingCategories(mappings, existingCategories);

  // Generate report
  const alreadyMapped = mappings.filter(m => m.method === 'exact-match').length;
  const newMappings = mappings.length - alreadyMapped;
  const unmappable = mappings.filter(m => m.to === '/').length;

  const report: AuditReport = {
    summary: {
      totalOldUrls: urlsToProcess.length,
      alreadyMapped,
      newMappings,
      unmappable,
      missingCategories: missingCategories.length
    },
    redirectMappings: mappings,
    missingCategories,
    stats: generateStats(mappings)
  };

  // Output results
  writeReport(report, MODE);
  printSummary(report);

  if (MODE === 'dry-run') {
    console.log('\n💡 Next steps:');
    console.log('  1. Review the generated CSV files in exports/');
    console.log('  2. Check AI-suggested mappings (medium/low confidence)');
    console.log('  3. Run full analysis: npm run audit:categories -- --full');
    console.log('  4. Apply changes: npm run audit:categories -- --apply');
  } else if (MODE === 'full') {
    console.log('\n💡 Next steps:');
    console.log('  1. Review all mappings in the generated CSV');
    console.log('  2. Manually adjust any incorrect mappings');
    console.log('  3. Run apply mode: npm run audit:categories -- --apply');
  } else {
    console.log('\n✅ Changes have been applied!');
    console.log('  Run the content generation script for new categories');
  }

  console.log('\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
