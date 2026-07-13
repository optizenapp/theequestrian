#!/usr/bin/tsx
/**
 * Batch brand-page SEO pipeline: inventory → research → generate → validate → apply.
 * See docs/BRAND-AND-CATEGORY-PAGE-UPDATE-PIPELINE.md (Batch pipeline).
 */
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

import { createSql } from './brand-page-pipeline/db';
import { inventoryBrand } from './brand-page-pipeline/inventory';
import { countRuleMatches, proposeRules } from './brand-page-pipeline/rules';
import { researchBrand } from './brand-page-pipeline/research';
import { generateBrandContent } from './brand-page-pipeline/generate';
import { writeBrandModule } from './brand-page-pipeline/write-module';
import { validateBrandContent } from './brand-page-pipeline/validate';
import type { BrandSEOContent, PipelineFlags } from './brand-page-pipeline/types';

function parseFlags(argv: string[]): PipelineFlags {
  const brandsIdx = argv.indexOf('--brands');
  const fileIdx = argv.indexOf('--brands-file');
  let brands: string[] = [];
  if (brandsIdx !== -1 && argv[brandsIdx + 1]) {
    brands = argv[brandsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  } else if (fileIdx !== -1 && argv[fileIdx + 1]) {
    brands = readFileSync(resolve(process.cwd(), argv[fileIdx + 1]), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }
  if (!brands.length) throw new Error('Provide --brands a,b,c or --brands-file path.txt');
  return {
    brands,
    dryRun: argv.includes('--dry-run'),
    floralProd: argv.includes('--floral-prod'),
    skipGenerate: argv.includes('--skip-generate'),
    overwrite: argv.includes('--overwrite'),
    skipExisting: argv.includes('--skip-existing'),
    skipRevalidate: argv.includes('--skip-revalidate'),
  };
}

function modulePath(handle: string): string {
  return resolve(process.cwd(), 'scripts', 'brand-seo-pages', `${handle}.ts`);
}

async function loadExistingModule(handle: string): Promise<BrandSEOContent> {
  return ((await import(modulePath(handle))) as { default: BrandSEOContent }).default;
}

function runApply(handle: string, flags: PipelineFlags, floralProd: boolean): Promise<void> {
  const args = ['tsx', 'scripts/run-brand-seo-update.ts', '--brand', handle];
  if (floralProd) args.push('--floral-prod');
  if (flags.skipRevalidate) args.push('--skip-revalidate');
  return new Promise((ok, fail) => {
    spawn('npx', args, { stdio: 'inherit', cwd: process.cwd() }).on('exit', (code) => {
      if (code === 0) ok();
      else fail(new Error(`run-brand-seo-update exited ${code} for ${handle}`));
    });
  });
}

async function processBrand(handle: string, flags: PipelineFlags): Promise<void> {
  console.log(`\n=== ${handle} ===`);
  const sql = createSql(false);
  const inventory = await inventoryBrand(sql, handle);
  console.log(`[inventory] ${inventory.totalCount} matches; display="${inventory.displayName}"`, inventory.brandCounts);

  const proposedRules = proposeRules(inventory);
  const existing = existsSync(modulePath(handle));
  let content: BrandSEOContent;

  if (flags.skipExisting && existing && !flags.overwrite) {
    console.log('[skip] module already exists — skipping');
    return;
  }

  if (flags.skipGenerate) {
    if (!existing) throw new Error(`No module at scripts/brand-seo-pages/${handle}.ts`);
    content = await loadExistingModule(handle);
    console.log('[generate] skipped — loaded existing module');
  } else {
    if (existing && !flags.overwrite) {
      throw new Error(`Module exists for ${handle}. Use --overwrite, --skip-generate, or --skip-existing.`);
    }
    const research = await researchBrand(inventory);
    console.log('[research]', research.serpSummary.slice(0, 160).replace(/\s+/g, ' '));
    content = await generateBrandContent({ inventory, rules: proposedRules, research });
    console.log(`[write] ${writeBrandModule(content)}`);
  }

  const matchCount = await countRuleMatches(sql, content.rules || proposedRules);
  console.log(`[rules] match count=${matchCount}`, content.rules || proposedRules);
  const validation = validateBrandContent(content, handle, matchCount);
  if (!validation.ok) throw new Error(`Validation failed:\n- ${validation.errors.join('\n- ')}`);
  console.log('[validate] ok');

  if (flags.dryRun) {
    console.log('[dry-run] Skipping DB apply');
    return;
  }
  await runApply(handle, flags, false);
  if (flags.floralProd) await runApply(handle, flags, true);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  console.log('Brand page pipeline', flags);
  const failed: string[] = [];
  for (const handle of flags.brands) {
    try {
      await processBrand(handle, flags);
    } catch (e) {
      console.error(`[fail] ${handle}:`, e instanceof Error ? e.message : e);
      failed.push(handle);
    }
  }
  console.log(`\n=== Summary ===\nok: ${flags.brands.length - failed.length}, failed: ${failed.length}`);
  if (failed.length) {
    console.log('failed brands:', failed.join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
