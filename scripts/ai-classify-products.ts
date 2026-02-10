#!/usr/bin/env tsx

/**
 * AI Product Type Classifier
 *
 * Automatically classifies products without proper product types using AI.
 * Supports single-model runs or A/B dry-run comparison mode.
 *
 * Usage:
 *   npm run ai:classify-products -- --dry-run
 *   npm run ai:classify-products -- --model=gpt-5.2-codex --dry-run --limit=50 --export-csv
 *   npm run ai:classify-products -- --ab-test --limit=50 --export-csv
 *   npm run ai:classify-products -- --start=0 --limit=200 --model=gpt-4o
 *
 * Options:
 *   --dry-run                    Test mode, no DB writes
 *   --start=N                    Start at product index N
 *   --limit=N                    Process only N products
 *   --model=MODEL                gpt-4o | gpt-5.2-codex (default: gpt-4o)
 *   --ab-test                    Run two dry-run passes: gpt-4o and gpt-5.2-codex
 *   --export-csv                 Export CSV even during dry-run
 *   --all-products               Classify full inventory (not just missing types)
 *   --all-vendors                Disable vendor allowlist filtering
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

import { runClassification } from '../lib/ai/classify-products-runner';
import type { ClassificationModel } from '../lib/ai/product-classifier';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const abTest = args.includes('--ab-test');
const exportCsv = args.includes('--export-csv');
const includeAllProducts = args.includes('--all-products');
const includeAllVendors = args.includes('--all-vendors');
const startArg = args.find(arg => arg.startsWith('--start='));
const limitArg = args.find(arg => arg.startsWith('--limit='));
const modelArg = args.find(arg => arg.startsWith('--model='));

const startIndex = startArg ? parseInt(startArg.split('=')[1]) : 0;
const limitCount = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
const rawModel = modelArg ? modelArg.split('=')[1] : 'gpt-4o';
const model: ClassificationModel = rawModel === 'gpt-5.2-codex' ? 'gpt-5.2-codex' : 'gpt-4o';

console.log('🤖 AI Product Type Classifier\n');
console.log('='.repeat(60));

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No database writes\n');
}

if (abTest) {
  console.log('🧪 A/B TEST MODE - Running gpt-4o and gpt-5.2-codex on the same slice\n');
}
if (includeAllProducts) {
  console.log('📦 FULL INVENTORY MODE - Including products with existing product types\n');
}
if (includeAllVendors) {
  console.log('🏷️  ALL VENDORS MODE - Vendor filter disabled\n');
}

async function main() {
  try {
    const runSingle = async (selectedModel: ClassificationModel) => {
      console.log(`\n🚀 Running classification with model=${selectedModel}`);
      const result = await runClassification({
        start: startIndex,
        limit: limitCount,
        dryRun,
        saveCsv: exportCsv || !dryRun,
        saveDb: !dryRun,
        model: selectedModel,
        exportCsvInDryRun: exportCsv,
        includeAllProducts,
        includeAllVendors,
      });
      console.log(`✅ Completed model=${selectedModel} total=${result.total} saved=${result.saved}\n`);
      return result;
    };

    if (abTest) {
      if (!dryRun) {
        console.warn('⚠️  --ab-test is intended for dry-run. Forcing dry-run behavior.');
      }
      await runClassification({
        start: startIndex,
        limit: limitCount,
        dryRun: true,
        saveCsv: true,
        saveDb: false,
        model: 'gpt-4o',
        exportCsvInDryRun: true,
        includeAllProducts,
        includeAllVendors,
      });
      await runClassification({
        start: startIndex,
        limit: limitCount,
        dryRun: true,
        saveCsv: true,
        saveDb: false,
        model: 'gpt-5.2-codex',
        exportCsvInDryRun: true,
        includeAllProducts,
        includeAllVendors,
      });
      console.log('📊 A/B dry-run complete. Compare the two CSV exports in /exports.');
      return;
    }

    await runSingle(model);

    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Review classifications at: /admin/ai-classifications');
    console.log('2. Validate low-confidence and needs-review rows first');
    console.log('3. For A/B prompt testing: run with --ab-test --limit=50 --export-csv');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
