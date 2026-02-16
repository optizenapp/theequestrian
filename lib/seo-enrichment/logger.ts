import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function log(level: LogLevel, message: string, details?: Record<string, unknown>) {
  if (level === 'debug' && !seoEnrichmentConfig.logVerbose) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope: 'seo-enrichment',
    message,
    ...(details || {}),
  };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
}

