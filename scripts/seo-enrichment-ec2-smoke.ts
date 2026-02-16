#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function run(cmd: string) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd(), env: process.env });
}

function getArg(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
}

function requireAnyEnv(names: string[]) {
  if (!names.some((name) => Boolean(process.env[name]))) {
    throw new Error(`Missing required env. Set one of: ${names.join(', ')}`);
  }
}

async function main() {
  const mode = getArg('--mode') || 'dry-run';
  const includeApply = process.argv.includes('--include-apply');
  const dryBatchSize = getArg('--batch-size') || '20';

  requireAnyEnv(['POSTGRES_URL', 'DATABASE_URL']);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY missing; generation will fallback in dry-run mode.');
  }

  process.env.SEO_ENRICHMENT_DAILY_BATCH_SIZE = process.env.SEO_ENRICHMENT_DAILY_BATCH_SIZE || dryBatchSize;
  process.env.SEO_ENRICHMENT_MIN_BATCH_SIZE = process.env.SEO_ENRICHMENT_MIN_BATCH_SIZE || dryBatchSize;
  process.env.SEO_ENRICHMENT_MAX_BATCH_SIZE = process.env.SEO_ENRICHMENT_MAX_BATCH_SIZE || dryBatchSize;
  process.env.SEO_ENRICHMENT_SELECTION_CANDIDATE_MULTIPLIER =
    process.env.SEO_ENRICHMENT_SELECTION_CANDIDATE_MULTIPLIER || '2';
  process.env.SEO_ENRICHMENT_SELECTION_HARD_CAP =
    process.env.SEO_ENRICHMENT_SELECTION_HARD_CAP || '60';

  console.log('SEO enrichment EC2 smoke test starting...');
  console.log(`Mode: ${mode}`);
  console.log(`Batch size: ${process.env.SEO_ENRICHMENT_DAILY_BATCH_SIZE}`);

  run('npm run seo:enrichment:init');
  run('npm run seo:enrichment:select');

  if (mode === 'dry-run') {
    run('npm run seo:enrichment:dry');
  } else if (mode === 'shadow') {
    run('npm run seo:enrichment:shadow');
  } else if (mode === 'apply') {
    run('npm run seo:enrichment:apply');
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  if (includeApply && mode !== 'apply') {
    run('npm run seo:enrichment:apply');
  }

  console.log('\nEC2 smoke test finished.');
}

main().catch((error) => {
  console.error('[seo-enrichment ec2 smoke] failed:', error);
  process.exit(1);
});

