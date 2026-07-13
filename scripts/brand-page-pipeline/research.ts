import { SerpAnalyzer } from '@/lib/seo-enrichment/serp';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import type { BrandInventory, ResearchContext } from './types';

function clusterProductLines(titles: string[]): string[] {
  const tokens = new Map<string, number>();
  for (const title of titles) {
    const cleaned = title
      .replace(/\b\d+(\.\d+)?\s?(kg|g|ml|l|oz|pack|pk)\b/gi, '')
      .replace(/\b(the|and|for|with|horse|horses)\b/gi, ' ');
    for (const part of cleaned.split(/[\s/|&,-]+/).filter((w) => w.length > 3)) {
      const key = part.toLowerCase();
      tokens.set(key, (tokens.get(key) ?? 0) + 1);
    }
  }
  return [...tokens.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

function summarizeSerp(analysis: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [query, value] of Object.entries(analysis)) {
    if (!value || typeof value !== 'object') continue;
    const rec = value as {
      results?: Array<{ title?: string; snippet?: string }>;
      summary?: string;
    };
    if (typeof rec.summary === 'string' && rec.summary.trim()) {
      parts.push(`${query}: ${rec.summary.trim().slice(0, 400)}`);
      continue;
    }
    const snippets = (rec.results || [])
      .slice(0, 3)
      .map((r) => `${r.title || ''}: ${r.snippet || ''}`.trim())
      .filter(Boolean);
    if (snippets.length) parts.push(`${query}\n- ${snippets.join('\n- ')}`);
  }
  return parts.join('\n\n').slice(0, 2500);
}

/** Catalog clusters + optional SERP brand-history context. */
export async function researchBrand(inventory: BrandInventory): Promise<ResearchContext> {
  const productLineHints = clusterProductLines(inventory.sampleTitles);
  const catalogSummary = [
    `Brand handle: ${inventory.handle}`,
    `Display name: ${inventory.displayName}`,
    `Inventory matches: ${inventory.totalCount}`,
    `Brand field values: ${JSON.stringify(inventory.brandCounts)}`,
    `Category paths: ${inventory.categoryPaths.join(', ') || '(none)'}`,
    `Sample titles:\n- ${inventory.sampleTitles.slice(0, 25).join('\n- ')}`,
    `Product-line token hints: ${productLineHints.join(', ') || '(none)'}`,
  ].join('\n');

  let serpSummary = '';
  if (seoEnrichmentConfig.enableSerpAnalysis) {
    const serp = new SerpAnalyzer();
    try {
      const queries = [
        `${inventory.displayName} equestrian brand history`,
        `${inventory.displayName} horse products`,
      ];
      const analysis = await serp.analyzeQueries(queries);
      serpSummary = summarizeSerp(analysis);
    } catch (e) {
      serpSummary = `SERP failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      await serp.close();
    }
  } else {
    serpSummary =
      'SERP disabled (set SEO_ENRICHMENT_ENABLE_SERP=true to enable). Use catalog grounding only.';
  }

  return { catalogSummary, serpSummary, productLineHints };
}
