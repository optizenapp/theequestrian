#!/usr/bin/env tsx
/**
 * Verify Redirect Coverage
 * 
 * Audits that every old URL from docs/all_collection_urls.csv
 * has a corresponding redirect in the adjusted redirects CSV
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

const OLD_URLS_CSV = path.join(process.cwd(), 'docs', 'all_collection_urls.csv');
const REDIRECTS_CSV = path.join(process.cwd(), 'exports', 'adjusted-full-audit-redirects-2026-02-09T02-29-58-449Z.csv');

function loadOldUrls(): string[] {
  const content = fs.readFileSync(OLD_URLS_CSV, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const urls = new Set<string>();
  for (const row of records) {
    const url = (row['OLD URLs'] || '').trim();
    if (url) {
      urls.add(url);
    }
  }

  return Array.from(urls).sort();
}

function loadRedirects(): Map<string, string> {
  const content = fs.readFileSync(REDIRECTS_CSV, 'utf-8');
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

  return map;
}

function main() {
  console.log('🔍 Redirect Coverage Audit\n');

  // Load data
  const oldUrls = loadOldUrls();
  const redirects = loadRedirects();

  console.log(`📊 Statistics:`);
  console.log(`  Old URLs in CSV: ${oldUrls.length}`);
  console.log(`  Redirects defined: ${redirects.size}\n`);

  // Find missing redirects
  const missing: string[] = [];
  const covered: string[] = [];

  for (const url of oldUrls) {
    if (redirects.has(url)) {
      covered.push(url);
    } else {
      missing.push(url);
    }
  }

  // Report
  console.log('='.repeat(80));
  console.log('📈 COVERAGE REPORT');
  console.log('='.repeat(80));

  console.log(`\n✅ Covered: ${covered.length}/${oldUrls.length} (${Math.round(covered.length / oldUrls.length * 100)}%)`);
  console.log(`❌ Missing: ${missing.length}/${oldUrls.length} (${Math.round(missing.length / oldUrls.length * 100)}%)`);

  if (missing.length > 0) {
    console.log('\n⚠️  URLs WITHOUT redirects:');
    console.log('='.repeat(80));
    for (const url of missing) {
      console.log(`  ${url}`);
    }
  } else {
    console.log('\n🎉 Perfect! All URLs have redirects defined.');
  }

  // Show sample redirects
  console.log('\n📋 Sample Redirects (first 10):');
  console.log('='.repeat(80));
  let count = 0;
  for (const [from, to] of redirects) {
    if (count >= 10) break;
    console.log(`  ${from} → ${to}`);
    count++;
  }

  console.log('\n' + '='.repeat(80));
  
  if (missing.length > 0) {
    console.log('\n❌ AUDIT FAILED: Some URLs are missing redirects');
    console.log('   Please add redirects for the missing URLs above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ AUDIT PASSED: All URLs have redirects\n');
    process.exit(0);
  }
}

main();
