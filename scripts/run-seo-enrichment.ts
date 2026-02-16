#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { log } from '@/lib/seo-enrichment/logger';
import { SeoEnrichmentWorker } from '@/lib/seo-enrichment/worker';

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const worker = new SeoEnrichmentWorker();
  const command = getArg('--command') || (hasFlag('--worker') ? 'worker' : 'once');

  log('info', 'Starting SEO enrichment command', {
    command,
    mode: seoEnrichmentConfig.mode,
  });

  if (command === 'select') {
    const selected = await worker.runSelection();
    log('info', 'Selection complete', { selected });
    return;
  }

  if (command === 'once') {
    const selected = await worker.runSelection();
    const processed = await worker.runOnce();
    log('info', 'One-shot run complete', { selected, processed });
    return;
  }

  if (command === 'process') {
    const processed = await worker.runOnce();
    log('info', 'Process complete (no selection)', { processed });
    return;
  }

  if (command === 'worker') {
    await worker.runLoop();
    return;
  }

  if (command === 'retry-failed') {
    const retried = await worker.retryFailed();
    log('info', 'Retry failed complete', { retried });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error('[seo-enrichment] fatal error:', error);
  process.exit(1);
});

