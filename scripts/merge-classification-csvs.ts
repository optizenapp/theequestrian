/**
 * Merge and deduplicate classification CSVs
 * Combines backup and final classification runs into single review file
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';
import * as path from 'path';

interface ClassificationRow {
  shopify_id: string;
  handle: string;
  title: string;
  vendor: string;
  current_type: string;
  suggested_type: string;
  confidence: string;
  validation_status: string;
  reasoning: string;
  alternative_types: string;
  cat_title: string;
  cat_slug: string;
  current_canonical_url: string;
  proposed_canonical_url: string;
  redirect_required: string;
  redirect_from: string;
  redirect_to: string;
  tags: string;
  collections: string;
  model_used: string;
  vision_escalated: string;
  suggested_brand_handles: string;
}

async function mergeClassificationCSVs() {
  console.log('🔄 Merging classification CSVs...\n');

  const exportsDir = path.join(process.cwd(), 'exports');
  const backupFile = path.join(exportsDir, 'ai-classified-products-gpt-4o-2026-02-10-progress-backup-4750.csv');
  const finalFile = path.join(exportsDir, 'ai-classified-products-gpt-4o-2026-02-10.csv');
  const outputFile = path.join(exportsDir, 'ai-classified-products-gpt-4o-2026-02-10-FINAL.csv');

  // Read both CSV files
  console.log(`📖 Reading backup CSV: ${path.basename(backupFile)}`);
  const backupContent = fs.readFileSync(backupFile, 'utf-8');
  const backupRows = parse(backupContent, {
    columns: true,
    skip_empty_lines: true,
  }) as ClassificationRow[];
  console.log(`   ✓ Loaded ${backupRows.length} products from backup\n`);

  console.log(`📖 Reading final CSV: ${path.basename(finalFile)}`);
  const finalContent = fs.readFileSync(finalFile, 'utf-8');
  const finalRows = parse(finalContent, {
    columns: true,
    skip_empty_lines: true,
  }) as ClassificationRow[];
  console.log(`   ✓ Loaded ${finalRows.length} products from final run\n`);

  // Merge and deduplicate by shopify_id (keep latest = finalRows take precedence)
  const mergedMap = new Map<string, ClassificationRow>();

  // Add backup rows first
  for (const row of backupRows) {
    mergedMap.set(row.shopify_id, row);
  }

  // Add final rows (will overwrite duplicates)
  let duplicateCount = 0;
  for (const row of finalRows) {
    if (mergedMap.has(row.shopify_id)) {
      duplicateCount++;
    }
    mergedMap.set(row.shopify_id, row);
  }

  const mergedRows = Array.from(mergedMap.values());

  console.log('📊 Merge Statistics:');
  console.log(`   • Backup products: ${backupRows.length}`);
  console.log(`   • Final run products: ${finalRows.length}`);
  console.log(`   • Duplicates found: ${duplicateCount}`);
  console.log(`   • Total unique products: ${mergedRows.length}\n`);

  // Validation checks
  console.log('✅ Validation Checks:');
  
  const missingCatSlug = mergedRows.filter(row => !row.cat_slug || row.cat_slug.trim() === '');
  console.log(`   • Products missing cat_slug: ${missingCatSlug.length}`);
  
  const lowConfidence = mergedRows.filter(row => parseInt(row.confidence) < 70);
  console.log(`   • Low confidence (<70): ${lowConfidence.length}`);
  
  const needsReview = mergedRows.filter(row => row.validation_status === 'needs-review');
  console.log(`   • Needs manual review: ${needsReview.length}`);
  
  const redirectRequired = mergedRows.filter(row => row.redirect_required === 'yes');
  console.log(`   • Products requiring redirects: ${redirectRequired.length}\n`);

  // Write merged CSV
  console.log(`💾 Writing merged CSV: ${path.basename(outputFile)}`);
  const csvContent = stringify(mergedRows, {
    header: true,
    columns: Object.keys(mergedRows[0]),
  });
  fs.writeFileSync(outputFile, csvContent);
  console.log(`   ✓ Saved ${mergedRows.length} products\n`);

  // Generate validation report
  const reportFile = path.join(exportsDir, 'classification-validation-report.txt');
  const report = [
    '=' .repeat(60),
    'CLASSIFICATION VALIDATION REPORT',
    '='.repeat(60),
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'MERGE SUMMARY:',
    `  - Backup CSV: ${backupRows.length} products`,
    `  - Final CSV: ${finalRows.length} products`,
    `  - Duplicates: ${duplicateCount}`,
    `  - Total Unique: ${mergedRows.length}`,
    '',
    'VALIDATION RESULTS:',
    `  - Missing cat_slug: ${missingCatSlug.length}`,
    `  - Low confidence (<70): ${lowConfidence.length}`,
    `  - Needs review: ${needsReview.length}`,
    `  - Redirects required: ${redirectRequired.length}`,
    '',
  ];

  if (missingCatSlug.length > 0) {
    report.push('PRODUCTS MISSING CAT_SLUG:');
    missingCatSlug.slice(0, 20).forEach(row => {
      report.push(`  - ${row.shopify_id} | ${row.handle} | ${row.title}`);
    });
    if (missingCatSlug.length > 20) {
      report.push(`  ... and ${missingCatSlug.length - 20} more`);
    }
    report.push('');
  }

  if (lowConfidence.length > 0) {
    report.push('LOW CONFIDENCE PRODUCTS (sample):');
    lowConfidence.slice(0, 20).forEach(row => {
      report.push(`  - ${row.handle} | Confidence: ${row.confidence} | ${row.suggested_type}`);
    });
    if (lowConfidence.length > 20) {
      report.push(`  ... and ${lowConfidence.length - 20} more`);
    }
    report.push('');
  }

  report.push('='.repeat(60));

  fs.writeFileSync(reportFile, report.join('\n'));
  console.log(`📄 Validation report saved: ${path.basename(reportFile)}\n`);

  console.log('✅ Merge complete!');
  console.log(`\nNext steps:`);
  console.log(`  1. Review: ${path.basename(outputFile)}`);
  console.log(`  2. Check: ${path.basename(reportFile)}`);
  console.log(`  3. Run: npm run validate:categories`);
}

mergeClassificationCSVs().catch(console.error);
