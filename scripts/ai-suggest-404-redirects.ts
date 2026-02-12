#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@vercel/postgres';
import {
  RedirectSuggester,
  type RedirectCandidateTarget,
  type RedirectSuggestionModel,
} from '@/lib/ai/redirect-suggester';

type CliOptions = {
  inputCsvPath: string;
  baseUrl: string;
  start: number;
  limit?: number;
  model: RedirectSuggestionModel;
  timeoutMs: number;
  retries: number;
  minConfidence: number;
  outputBasePath: string;
  dryRun: boolean;
};

type BrokenLinkEntry = {
  from: string;
  sources: string[];
  count: number;
  statuses: string[];
};

type ExistingCategory = {
  path: string;
  title: string;
};

type ProductCandidate = {
  canonicalPath: string;
  handle: string;
  title: string;
};

type ExistingRedirect = {
  from: string;
  to: string;
};

type PageContext = {
  status: number;
  title: string;
  description: string;
  h1: string;
  text: string;
};

type SuggestionRow = {
  from: string;
  suggestedTo: string;
  confidence: number;
  method: 'rule-existing' | 'ai';
  reasoning: string;
  alternatives: string[];
  sourcePath: string;
  brokenStatus: number;
  candidateCount: number;
  candidateSample: string[];
};

const HELP_TEXT = `
AI 404 redirect suggester

Usage:
  npm run audit:404:suggest -- --input=<csv> [options]

Options:
  --input=<path>            Input CSV containing broken URLs/paths
  --base-url=<url>          Site origin for fetching page context
                            (default: NEXT_PUBLIC_SITE_URL or http://localhost:3003)
  --start=<number>          Start at row index N (default: 0)
  --limit=<number>          Process only N unique broken paths
  --model=<model>           gpt-4o | gpt-5.2-codex (default: gpt-4o)
  --timeout-ms=<number>     Request timeout in ms (default: 20000)
  --retries=<number>        Retries for page fetches (default: 2)
  --min-confidence=<number> Minimum confidence for redirects CSV (default: 40)
  --out=<path>              Output base path without extension
                            (default: exports/internal-404-ai-suggestions-<timestamp>)
  --dry-run                 Runs normally but prints dry-run label
  --help                    Show this help
`;

function getArgValue(args: string[], name: string): string | undefined {
  const arg = args.find((entry) => entry.startsWith(`${name}=`));
  return arg?.slice(name.length + 1);
}

function parseNumberArg(args: string[], name: string, fallback: number): number {
  const value = getArgValue(args, name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid value for ${name}: ${value}`);
  return Math.max(0, Math.floor(parsed));
}

function normalizePath(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '/';
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
  return withoutQuery;
}

function normalizeInputUrlToPath(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return normalizePath(parsed.pathname);
    } catch {
      return null;
    }
  }
  return normalizePath(value);
}

function parseArgs(args: string[]): CliOptions {
  if (args.includes('--help')) {
    console.log(HELP_TEXT.trim());
    process.exit(0);
  }

  const defaultBase = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003').replace(/\/$/, '');
  const baseUrlRaw = getArgValue(args, '--base-url') || defaultBase;
  const baseUrl = /^https?:\/\//i.test(baseUrlRaw) ? baseUrlRaw : `https://${baseUrlRaw}`;
  const modelArg = getArgValue(args, '--model') || 'gpt-4o';
  const model: RedirectSuggestionModel = modelArg === 'gpt-5.2-codex' ? 'gpt-5.2-codex' : 'gpt-4o';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputBasePath = getArgValue(args, '--out') || path.join(process.cwd(), 'exports', `internal-404-ai-suggestions-${timestamp}`);
  const inputCsvPath = getArgValue(args, '--input');

  if (!inputCsvPath) {
    throw new Error('Missing required --input=<csv> argument');
  }

  return {
    inputCsvPath: path.isAbsolute(inputCsvPath) ? inputCsvPath : path.resolve(process.cwd(), inputCsvPath),
    baseUrl: baseUrl.replace(/\/$/, ''),
    start: parseNumberArg(args, '--start', 0),
    limit: getArgValue(args, '--limit') ? parseNumberArg(args, '--limit', 0) : undefined,
    model,
    timeoutMs: parseNumberArg(args, '--timeout-ms', 20000),
    retries: parseNumberArg(args, '--retries', 2),
    minConfidence: parseNumberArg(args, '--min-confidence', 40),
    outputBasePath,
    dryRun: args.includes('--dry-run'),
  };
}

function extractFirstPresent(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseBrokenCsv(filePath: string, baseUrl: string): BrokenLinkEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input CSV not found: ${filePath}`);
  }
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const byPath = new Map<string, BrokenLinkEntry>();

  for (const row of records) {
    const brokenRaw = extractFirstPresent(row, ['target', 'path', 'url', 'broken_url', 'from_path', '404_path']);
    const sourceRaw = extractFirstPresent(row, ['source', 'referrer', 'latest_referrer']);
    const statusRaw = extractFirstPresent(row, ['status', 'http_status']);
    const brokenPath = normalizeInputUrlToPath(brokenRaw);
    const sourcePath = normalizeInputUrlToPath(sourceRaw);
    if (!brokenPath) continue;

    const existing = byPath.get(brokenPath);
    if (!existing) {
      byPath.set(brokenPath, {
        from: brokenPath,
        sources: sourcePath ? [sourcePath] : [],
        count: 1,
        statuses: statusRaw ? [statusRaw] : [],
      });
    } else {
      existing.count += 1;
      if (sourcePath && !existing.sources.includes(sourcePath)) existing.sources.push(sourcePath);
      if (statusRaw && !existing.statuses.includes(statusRaw)) existing.statuses.push(statusRaw);
    }
  }

  return Array.from(byPath.values()).sort((a, b) => b.count - a.count);
}

async function loadExistingCategories(): Promise<ExistingCategory[]> {
  const result = await sql`
    SELECT url_path, COALESCE(h1_title, breadcrumb_label, '') as title
    FROM collection_content
    WHERE status = 'published'
    ORDER BY url_path
  `;
  return result.rows.map((row) => ({
    path: normalizePath(String(row.url_path)),
    title: String(row.title || ''),
  }));
}

function loadCsvRedirects(fileName: string): ExistingRedirect[] {
  const csvPath = path.join(process.cwd(), 'redirects', fileName);
  if (!fs.existsSync(csvPath)) return [];
  const records = parse(fs.readFileSync(csvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ from?: string; to?: string }>;
  return records
    .filter((row) => row.from && row.to)
    .map((row) => ({ from: normalizePath(row.from as string), to: normalizePath(row.to as string) }));
}

async function loadProductCandidates(): Promise<ProductCandidate[]> {
  const result = await sql`
    SELECT
      pca.canonical_path,
      pca.product_handle,
      COALESCE(p.title, pca.product_handle) AS title
    FROM product_category_assignments pca
    LEFT JOIN products p ON p.handle = pca.product_handle
    ORDER BY pca.canonical_path
    LIMIT 12000
  `;
  return result.rows.map((row) => ({
    canonicalPath: normalizePath(String(row.canonical_path || '/')),
    handle: String(row.product_handle || ''),
    title: String(row.title || ''),
  }));
}

async function fetchPageContext(url: string, timeoutMs: number, retries: number): Promise<PageContext> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      const html = await response.text();
      clearTimeout(timer);

      const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
      const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
      const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3500);

      return {
        status: response.status,
        title,
        description,
        h1,
        text,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * (attempt + 1)));
    }
  }

  return {
    status: 0,
    title: '',
    description: '',
    h1: '',
    text: `Failed to fetch page context: ${(lastError as Error)?.message || 'unknown error'}`,
  };
}

function scoreCandidate(
  candidatePath: string,
  reason: string,
  baseScore: number,
  sourcePath: string
): RedirectCandidateTarget {
  let score = baseScore;
  const sourceTopLevel = sourcePath.split('/').filter(Boolean)[0] || '';
  const candidateTopLevel = candidatePath.split('/').filter(Boolean)[0] || '';
  if (sourceTopLevel && sourceTopLevel === candidateTopLevel) {
    score += 0.05;
  }
  return { path: normalizePath(candidatePath), reason, score: Math.min(1, score) };
}

function buildCandidatesForPath(
  brokenPath: string,
  sourcePath: string,
  existingRedirectMap: Map<string, string>,
  categories: ExistingCategory[],
  productCandidates: ProductCandidate[]
): RedirectCandidateTarget[] {
  const allowedCategoryPaths = new Set(
    categories
      .map((row) => normalizePath(row.path))
      .filter((value) => {
        const segments = value.split('/').filter(Boolean);
        return segments.length >= 1 && segments.length <= 3;
      })
  );
  const collected = new Map<string, RedirectCandidateTarget>();
  const upsert = (candidate: RedirectCandidateTarget) => {
    if (candidate.path !== '/' && !allowedCategoryPaths.has(candidate.path)) return;
    const existing = collected.get(candidate.path);
    if (!existing || candidate.score > existing.score) {
      collected.set(candidate.path, candidate);
    }
  };

  const exactRedirect = existingRedirectMap.get(brokenPath);
  if (exactRedirect && allowedCategoryPaths.has(normalizePath(exactRedirect))) {
    upsert(scoreCandidate(exactRedirect, 'existing-redirect-exact', 0.99, sourcePath));
  }

  const segments = brokenPath.toLowerCase().split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';

  if (brokenPath.startsWith('/collections/')) {
    const collectionRoot = `/collections/${lastSegment}`;
    const redirect = existingRedirectMap.get(collectionRoot);
    if (redirect) {
      upsert(scoreCandidate(redirect, 'collection-root-redirect', 0.95, sourcePath));
    }
  }

  if (lastSegment) {
    for (const category of categories) {
      const candidateLower = category.path.toLowerCase();
      if (candidateLower === brokenPath.toLowerCase()) continue;
      if (candidateLower.endsWith(`/${lastSegment}`)) {
        upsert(scoreCandidate(category.path, `category-exact-segment:${category.title || lastSegment}`, 0.9, sourcePath));
      } else if (candidateLower.includes(lastSegment) && lastSegment.length >= 4) {
        upsert(scoreCandidate(category.path, `category-fuzzy-segment:${category.title || lastSegment}`, 0.72, sourcePath));
      }
    }

    for (const product of productCandidates) {
      const handle = product.handle.toLowerCase();
      if (!handle) continue;
      if (handle === lastSegment) {
        upsert(scoreCandidate(product.canonicalPath, `product-handle:${product.title || product.handle}`, 0.93, sourcePath));
      } else if (lastSegment.length >= 4 && (handle.includes(lastSegment) || lastSegment.includes(handle))) {
        upsert(scoreCandidate(product.canonicalPath, `product-fuzzy:${product.title || product.handle}`, 0.7, sourcePath));
      }
    }
  }

  const sorted = Array.from(collected.values()).sort((a, b) => b.score - a.score).slice(0, 20);
  if (!sorted.length) {
    sorted.push({ path: '/', reason: 'fallback-home', score: 0.1 });
  }
  return sorted;
}

function chooseRuleBasedCandidate(candidates: RedirectCandidateTarget[]): RedirectCandidateTarget | null {
  const exact = candidates.find((candidate) => candidate.reason === 'existing-redirect-exact');
  return exact || null;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const inputRows = parseBrokenCsv(options.inputCsvPath, options.baseUrl);
  const rowsToProcess = options.limit
    ? inputRows.slice(options.start, options.start + options.limit)
    : inputRows.slice(options.start);

  if (rowsToProcess.length === 0) {
    throw new Error('No rows to process after --start/--limit filtering.');
  }

  console.log('🤖 AI 404 Redirect Suggester');
  console.log(`Input: ${options.inputCsvPath}`);
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Model: ${options.model}`);
  console.log(`Rows: ${rowsToProcess.length}`);
  console.log(`Dry run: ${options.dryRun ? 'yes' : 'no'}`);
  console.log('');

  const categories = await loadExistingCategories();
  const redirects = [
    ...loadCsvRedirects('collections.csv'),
    ...loadCsvRedirects('blogs.csv'),
    ...loadCsvRedirects('pages.csv'),
  ];
  const existingRedirectMap = new Map<string, string>();
  for (const redirect of redirects) {
    if (!existingRedirectMap.has(redirect.from)) {
      existingRedirectMap.set(redirect.from, redirect.to);
    }
  }

  const productCandidates = await loadProductCandidates();
  const suggester = new RedirectSuggester(options.model);
  const contextCache = new Map<string, PageContext>();
  const suggestions: SuggestionRow[] = [];

  for (let index = 0; index < rowsToProcess.length; index += 1) {
    const row = rowsToProcess[index];
    const sourcePath = row.sources[0] || '/';
    const brokenUrl = new URL(row.from, options.baseUrl).toString();
    const sourceUrl = new URL(sourcePath, options.baseUrl).toString();

    process.stdout.write(`\rProcessing ${index + 1}/${rowsToProcess.length} ${row.from}      `);

    let brokenContext = contextCache.get(row.from);
    if (!brokenContext) {
      brokenContext = await fetchPageContext(brokenUrl, options.timeoutMs, options.retries);
      contextCache.set(row.from, brokenContext);
    }

    let sourceContext = contextCache.get(sourcePath);
    if (!sourceContext && sourcePath && sourcePath !== row.from) {
      sourceContext = await fetchPageContext(sourceUrl, options.timeoutMs, options.retries);
      contextCache.set(sourcePath, sourceContext);
    }

    const candidates = buildCandidatesForPath(
      row.from,
      sourcePath,
      existingRedirectMap,
      categories,
      productCandidates
    );

    const ruleCandidate = chooseRuleBasedCandidate(candidates);
    if (ruleCandidate) {
      suggestions.push({
        from: row.from,
        suggestedTo: ruleCandidate.path,
        confidence: 99,
        method: 'rule-existing',
        reasoning: 'Matched an existing redirect exactly.',
        alternatives: candidates.slice(0, 3).map((candidate) => candidate.path).filter((entry) => entry !== ruleCandidate.path),
        sourcePath,
        brokenStatus: brokenContext.status,
        candidateCount: candidates.length,
        candidateSample: candidates.slice(0, 5).map((candidate) => candidate.path),
      });
      continue;
    }

    const suggestion = await suggester.suggestRedirect({
      brokenPath: row.from,
      sourcePath,
      brokenPageStatus: brokenContext.status,
      brokenPageTitle: brokenContext.title,
      brokenPageDescription: brokenContext.description,
      brokenPageText: brokenContext.text,
      sourcePageTitle: sourceContext?.title,
      sourcePageText: sourceContext?.text,
      candidateTargets: candidates,
    });

    const normalizedTarget = normalizePath(suggestion.suggestedTo);
    const finalTarget = normalizedTarget === row.from ? candidates[0]?.path || '/' : normalizedTarget;
    suggestions.push({
      from: row.from,
      suggestedTo: finalTarget,
      confidence: suggestion.confidence,
      method: 'ai',
      reasoning: suggestion.reasoning,
      alternatives: suggestion.alternatives,
      sourcePath,
      brokenStatus: brokenContext.status,
      candidateCount: candidates.length,
      candidateSample: candidates.slice(0, 5).map((candidate) => candidate.path),
    });

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
  }

  console.log('\n');

  const outputDir = path.dirname(options.outputBasePath);
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = `${options.outputBasePath}.json`;
  const csvPath = `${options.outputBasePath}.csv`;
  const redirectsCsvPath = `${options.outputBasePath}-redirects.csv`;

  const summary = {
    generatedAt: new Date().toISOString(),
    inputCsvPath: options.inputCsvPath,
    baseUrl: options.baseUrl,
    model: options.model,
    totalSuggestions: suggestions.length,
    exportedRedirectRows: suggestions.filter((row) => row.confidence >= options.minConfidence && row.suggestedTo !== row.from).length,
    minConfidence: options.minConfidence,
    suggestions,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const suggestionsCsv = stringify(
    suggestions.map((row) => ({
      from: row.from,
      suggested_to: row.suggestedTo,
      confidence: row.confidence,
      method: row.method,
      source_path: row.sourcePath,
      broken_status: row.brokenStatus,
      reasoning: row.reasoning,
      alternatives: row.alternatives.join('; '),
      candidate_count: row.candidateCount,
      candidate_sample: row.candidateSample.join('; '),
    })),
    { header: true }
  );
  fs.writeFileSync(csvPath, suggestionsCsv, 'utf8');

  const redirectRows = suggestions
    .filter((row) => row.confidence >= options.minConfidence)
    .filter((row) => row.suggestedTo !== row.from)
    .map((row) => ({ from: row.from, to: row.suggestedTo }));

  const redirectsCsv = stringify(redirectRows, { header: true });
  fs.writeFileSync(redirectsCsvPath, redirectsCsv, 'utf8');

  console.log('✅ Complete');
  console.log(`JSON: ${jsonPath}`);
  console.log(`Suggestions CSV: ${csvPath}`);
  console.log(`Redirects CSV (import-ready): ${redirectsCsvPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Review low-confidence rows in suggestions CSV.');
  console.log('2. Upload redirects CSV in admin redirects import, or merge into redirects/*.csv.');
  console.log('3. Run npm run redirects:generate to refresh map file.');
}

run().catch((error) => {
  console.error('❌ AI 404 redirect suggestion failed:', error);
  process.exit(1);
});
