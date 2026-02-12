#!/usr/bin/env tsx
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type CliOptions = {
  baseUrl: string;
  startPath: string;
  maxPages: number;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  outputBasePath: string;
  includeSitemap: boolean;
};

type PageQueueItem = {
  url: string;
  discoveredFrom: string;
};

type BrokenLink = {
  source: string;
  target: string;
  status: number;
};

type RequestError = {
  source: string;
  target: string;
  error: string;
};

const HELP_TEXT = `
Internal 404 audit crawler

Usage:
  npm run audit:404:internal -- [options]

Options:
  --base-url=<url>       Base URL to audit
                         (default: NEXT_PUBLIC_SITE_URL or http://localhost:3003)
  --start-path=<path>    Start path for crawl seed (default: /)
  --max-pages=<number>   Max internal pages to crawl (default: 400)
  --concurrency=<number> Concurrent link checks (default: 8)
  --timeout-ms=<number>  HTTP timeout per request in ms (default: 25000)
  --retries=<number>     Retries per request on network/timeout errors (default: 2)
  --out=<path>           Output file base path without extension
                         (default: exports/internal-404-audit-<timestamp>)
  --no-sitemap           Do not seed crawl from sitemap.xml
  --help                 Show this help
`;

function parseArgs(argv: string[]): CliOptions {
  if (argv.includes('--help')) {
    console.log(HELP_TEXT.trim());
    process.exit(0);
  }

  const defaultBase = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultOutputBasePath = resolve(process.cwd(), 'exports', `internal-404-audit-${timestamp}`);

  const getArgValue = (name: string): string | undefined => {
    const arg = argv.find((entry) => entry.startsWith(`${name}=`));
    return arg?.slice(name.length + 1);
  };

  const numberFromArg = (name: string, fallback: number): number => {
    const value = getArgValue(name);
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid value for ${name}: ${value}`);
    }
    return Math.floor(parsed);
  };

  const baseUrlRaw = getArgValue('--base-url') || defaultBase;
  const startPath = getArgValue('--start-path') || '/';
  const includeSitemap = !argv.includes('--no-sitemap');

  let baseUrl = baseUrlRaw.trim();
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  return {
    baseUrl,
    startPath: startPath.startsWith('/') ? startPath : `/${startPath}`,
    maxPages: numberFromArg('--max-pages', 400),
    concurrency: numberFromArg('--concurrency', 8),
    timeoutMs: numberFromArg('--timeout-ms', 25000),
    retries: numberFromArg('--retries', 2),
    outputBasePath: getArgValue('--out') || defaultOutputBasePath,
    includeSitemap,
  };
}

function normalizeInternalUrl(rawHref: string, baseUrl: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('javascript:')) return null;

  let resolved: URL;
  try {
    resolved = new URL(trimmed, baseUrl);
  } catch {
    return null;
  }

  const baseOrigin = new URL(baseUrl).origin;
  if (resolved.origin !== baseOrigin) return null;

  resolved.hash = '';
  return resolved.toString();
}

function isLikelyPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return !/\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|pdf|xml|json|txt|zip|mp4|webm|woff|woff2|ttf|eot)$/.test(path);
  } catch {
    return false;
  }
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const matches = html.matchAll(/href=["']([^"'<>]+)["']/gi);
  const links = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeInternalUrl(match[1], baseUrl);
    if (normalized) links.add(normalized);
  }

  return Array.from(links);
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
    });
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStatusWithTimeout(url: string, timeoutMs: number): Promise<number> {
  {
    const headController = new AbortController();
    const headTimer = setTimeout(() => headController.abort(), timeoutMs);
    try {
      const headResponse = await fetch(url, {
        method: 'HEAD',
        signal: headController.signal,
        redirect: 'manual',
      });

      if (headResponse.status !== 405 && headResponse.status !== 501) {
        return headResponse.status;
      }
    } finally {
      clearTimeout(headTimer);
    }
  }

  const getController = new AbortController();
  const getTimer = setTimeout(() => getController.abort(), timeoutMs);
  try {
    const getResponse = await fetch(url, {
      method: 'GET',
      signal: getController.signal,
      redirect: 'manual',
    });
    return getResponse.status;
  } finally {
    clearTimeout(getTimer);
  }
}

function shouldRetry(error: unknown): boolean {
  const message = (error as Error)?.message || '';
  return (
    message.includes('aborted') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('fetch failed')
  );
}

async function retry<T>(attempts: number, task: () => Promise<T>): Promise<T> {
  let lastError: unknown = null;

  for (let index = 0; index <= attempts; index += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (index >= attempts || !shouldRetry(error)) {
        throw error;
      }
      const backoffMs = 300 * (index + 1);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, backoffMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown retry failure');
}

async function loadSitemapUrls(baseUrl: string, timeoutMs: number): Promise<string[]> {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const { status, text } = await retry(1, () => fetchTextWithTimeout(sitemapUrl, timeoutMs));
  if (status >= 400) return [];

  const extractLocs = (xml: string) => Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  const locs = extractLocs(text);
  if (locs.length === 0) return [];

  if (!text.includes('sitemapindex')) {
    return locs.map((loc) => normalizeInternalUrl(loc, baseUrl)).filter((v): v is string => Boolean(v));
  }

  const nestedUrls: string[] = [];
  for (const loc of locs) {
    try {
      const normalized = normalizeInternalUrl(loc, baseUrl);
      if (!normalized) continue;
      const nested = await retry(1, () => fetchTextWithTimeout(normalized, timeoutMs));
      if (nested.status >= 400) continue;
      nestedUrls.push(...extractLocs(nested.text));
    } catch {
      // Ignore individual sitemap fetch failures.
    }
  }

  return nestedUrls
    .map((loc) => normalizeInternalUrl(loc, baseUrl))
    .filter((v): v is string => Boolean(v));
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function toCsvRow(values: string[]): string {
  return values
    .map((value) => {
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  console.log('🔎 Internal 404 audit');
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Start path: ${options.startPath}`);
  console.log(`Max pages: ${options.maxPages}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`Timeout ms: ${options.timeoutMs}`);
  console.log(`Retries: ${options.retries}`);
  console.log(`Sitemap seed: ${options.includeSitemap ? 'enabled' : 'disabled'}`);
  console.log('');

  const baseStartUrl = new URL(options.startPath, options.baseUrl).toString();
  const queue: PageQueueItem[] = [{ url: baseStartUrl, discoveredFrom: 'seed' }];
  const visitedPages = new Set<string>();
  const checkedLinks = new Set<string>();
  const brokenLinks: BrokenLink[] = [];
  const requestErrors: RequestError[] = [];

  if (options.includeSitemap) {
    try {
      const sitemapUrls = await loadSitemapUrls(options.baseUrl, options.timeoutMs);
      for (const sitemapUrl of sitemapUrls) {
        if (isLikelyPageUrl(sitemapUrl)) {
          queue.push({ url: sitemapUrl, discoveredFrom: 'sitemap.xml' });
        }
      }
      console.log(`Loaded ${sitemapUrls.length} URLs from sitemap.`);
    } catch (error) {
      console.warn(`Could not load sitemap URLs: ${(error as Error).message}`);
    }
  }

  while (queue.length > 0 && visitedPages.size < options.maxPages) {
    const current = queue.shift();
    if (!current) break;
    if (visitedPages.has(current.url)) continue;
    visitedPages.add(current.url);

    let pageStatus = 0;
    let html = '';
    try {
      const pageResponse = await retry(options.retries, () =>
        fetchTextWithTimeout(current.url, options.timeoutMs)
      );
      pageStatus = pageResponse.status;
      html = pageResponse.text;
    } catch (error) {
      requestErrors.push({
        source: current.discoveredFrom,
        target: current.url,
        error: (error as Error).message,
      });
      console.warn(`Request failed: ${current.url} (${(error as Error).message})`);
      continue;
    }

    if (pageStatus === 404) {
      brokenLinks.push({
        source: current.discoveredFrom,
        target: current.url,
        status: pageStatus,
      });
      continue;
    }

    if (pageStatus >= 400) {
      // Do not parse non-OK pages; this audit is focused on genuine 404 targets.
      continue;
    }

    const links = extractInternalLinks(html, options.baseUrl);
    const newPageTargets: PageQueueItem[] = [];
    const linksToCheck: string[] = [];

    for (const link of links) {
      if (!checkedLinks.has(link)) {
        checkedLinks.add(link);
        linksToCheck.push(link);
      }

      if (isLikelyPageUrl(link) && !visitedPages.has(link)) {
        newPageTargets.push({ url: link, discoveredFrom: current.url });
      }
    }

    queue.push(...newPageTargets);

    await withConcurrency(linksToCheck, options.concurrency, async (link) => {
      let status = 0;
      try {
        status = await retry(options.retries, () => fetchStatusWithTimeout(link, options.timeoutMs));
      } catch (error) {
        requestErrors.push({
          source: current.url,
          target: link,
          error: (error as Error).message,
        });
        return;
      }

      if (status === 404) {
        brokenLinks.push({
          source: current.url,
          target: link,
          status,
        });
      }
    });

    if (visitedPages.size % 25 === 0) {
      console.log(
        `Progress: pages=${visitedPages.size} links_checked=${checkedLinks.size} broken_404=${brokenLinks.length}`
      );
    }
  }

  const outputDir = resolve(options.outputBasePath, '..');
  await mkdir(outputDir, { recursive: true });

  const jsonPath = `${options.outputBasePath}.json`;
  const csvPath = `${options.outputBasePath}.csv`;

  const summary = {
    baseUrl: options.baseUrl,
    startPath: options.startPath,
    visitedPages: visitedPages.size,
    checkedLinks: checkedLinks.size,
    brokenCount: brokenLinks.length,
    requestErrorsCount: requestErrors.length,
    generatedAt: new Date().toISOString(),
    brokenLinks,
    requestErrors,
  };

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const csvLines = [
    toCsvRow(['source', 'target', 'status']),
    ...brokenLinks.map((entry) => toCsvRow([entry.source, entry.target, String(entry.status)])),
  ];
  await writeFile(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

  console.log('');
  console.log('Audit complete.');
  console.log(`Pages visited: ${summary.visitedPages}`);
  console.log(`Links checked: ${summary.checkedLinks}`);
  console.log(`Broken 404 links: ${summary.brokenCount}`);
  console.log(`Request errors: ${summary.requestErrorsCount}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`CSV report: ${csvPath}`);

  if (summary.brokenCount > 0) {
    console.log('\nTop 10 broken URLs:');
    for (const item of brokenLinks.slice(0, 10)) {
      console.log(`- [${item.status}] ${item.target} (from ${item.source})`);
    }
    process.exit(1);
  }

  if (summary.requestErrorsCount > 0) {
    console.log('\nNo 404s found, but some links had request errors. Check JSON for details.');
    process.exit(2);
  }
}

run().catch((error) => {
  console.error('Internal 404 audit failed:', error);
  process.exit(1);
});
