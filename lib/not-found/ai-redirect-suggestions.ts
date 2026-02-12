import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { sql } from '@vercel/postgres';
import {
  RedirectSuggester,
  type RedirectCandidateTarget,
  type RedirectSuggestionModel,
} from '@/lib/ai/redirect-suggester';

export type SuggestionInputRow = {
  brokenPath: string;
  sourcePath?: string;
  count: number;
  isExternal?: boolean;
  originalInput?: string;
};

export type RedirectSuggestionOutputRow = {
  from: string;
  suggested_to: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  source_path: string;
  method: 'rule-existing' | 'ai';
  is_external?: boolean;
  review_note?: string;
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

function normalizePath(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '/';
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
  return withoutQuery;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSlugToken(value: string): string {
  return safeDecode(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isLikelyProductPath(pathValue: string): boolean {
  const segments = normalizePath(pathValue).split('/').filter(Boolean);
  if (segments.length >= 4) return true;
  const last = normalizeSlugToken(segments[segments.length - 1] || '');
  return last.length >= 10 && last.includes('-');
}

function parentCategoryFromCanonical(canonicalPath: string): string {
  const normalized = normalizePath(canonicalPath);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return `/${segments.slice(0, -1).join('/')}`;
}

function normalizeInputToPath(raw: string): string | null {
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

function getExternalUrl(raw: string, baseOrigin: string): string | null {
  const value = (raw || '').trim();
  if (!value || !/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== baseOrigin) return parsed.toString();
    return null;
  } catch {
    return null;
  }
}

function extractFirstPresent(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function parseSuggestionInput(payload: {
  csvText?: string;
  pastedText?: string;
  baseUrl?: string;
}): SuggestionInputRow[] {
  const byPath = new Map<string, SuggestionInputRow>();
  const baseOrigin = new URL(payload.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003')
    .origin;

  if (payload.csvText && payload.csvText.trim()) {
    const records = parse(payload.csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    for (const row of records) {
      const brokenRaw = extractFirstPresent(row, ['target', 'path', 'url', 'broken_url', 'from_path', '404_path', 'from']);
      const sourceRaw = extractFirstPresent(row, ['source', 'referrer', 'latest_referrer']);
      const externalUrl = getExternalUrl(brokenRaw, baseOrigin);
      if (externalUrl) {
        const existingExternal = byPath.get(externalUrl);
        if (existingExternal) {
          existingExternal.count += 1;
        } else {
          byPath.set(externalUrl, {
            brokenPath: externalUrl,
            sourcePath: normalizeInputToPath(sourceRaw || '') || undefined,
            count: 1,
            isExternal: true,
            originalInput: brokenRaw,
          });
        }
        continue;
      }
      const brokenPath = normalizeInputToPath(brokenRaw);
      const sourcePath = normalizeInputToPath(sourceRaw || '');
      if (!brokenPath) continue;

      const existing = byPath.get(brokenPath);
      if (existing) {
        existing.count += 1;
        if (!existing.sourcePath && sourcePath) existing.sourcePath = sourcePath;
      } else {
        byPath.set(brokenPath, {
          brokenPath,
          sourcePath: sourcePath || undefined,
          count: 1,
        });
      }
    }
  }

  if (payload.pastedText && payload.pastedText.trim()) {
    const lines = payload.pastedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const externalUrl = getExternalUrl(line, baseOrigin);
      if (externalUrl) {
        const existingExternal = byPath.get(externalUrl);
        if (existingExternal) {
          existingExternal.count += 1;
        } else {
          byPath.set(externalUrl, {
            brokenPath: externalUrl,
            count: 1,
            isExternal: true,
            originalInput: line,
          });
        }
        continue;
      }
      const brokenPath = normalizeInputToPath(line);
      if (!brokenPath) continue;
      const existing = byPath.get(brokenPath);
      if (existing) {
        existing.count += 1;
      } else {
        byPath.set(brokenPath, {
          brokenPath,
          count: 1,
        });
      }
    }
  }

  return Array.from(byPath.values()).sort((a, b) => b.count - a.count);
}

function loadCsvRedirects(fileName: string): Array<{ from: string; to: string }> {
  const filePath = path.join(process.cwd(), 'redirects', fileName);
  if (!fs.existsSync(filePath)) return [];
  const records = parse(fs.readFileSync(filePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ from?: string; to?: string }>;
  return records
    .filter((row) => row.from && row.to)
    .map((row) => ({ from: normalizePath(row.from as string), to: normalizePath(row.to as string) }));
}

async function loadExistingCategories(): Promise<ExistingCategory[]> {
  try {
    const result = await sql`
      SELECT url_path, COALESCE(h1_title, breadcrumb_label, '') AS title
      FROM collection_content
      WHERE status = 'published'
        AND url_path IS NOT NULL
      ORDER BY url_path
    `;
    return result.rows.map((row) => ({
      path: normalizePath(String(row.url_path || '/')),
      title: String(row.title || ''),
    }))
    .filter((row) => {
      const segments = row.path.split('/').filter(Boolean);
      // Keep seeded category hierarchy only: /top, /top/sub, /top/sub/subsub
      return segments.length >= 1 && segments.length <= 3;
    });
  } catch {
    return [];
  }
}

async function loadProductCandidates(): Promise<ProductCandidate[]> {
  try {
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
  } catch {
    return [];
  }
}

async function fetchPageContext(url: string): Promise<{
  status: number;
  title: string;
  description: string;
  text: string;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const html = await response.text();
    clearTimeout(timer);

    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
    const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);

    return { status: response.status, title, description, text };
  } catch {
    return { status: 0, title: '', description: '', text: '' };
  }
}

function scoreCandidate(pathValue: string, reason: string, score: number): RedirectCandidateTarget {
  return { path: normalizePath(pathValue), reason, score: Math.max(0, Math.min(1, score)) };
}

function buildCandidatesForPath(
  brokenPath: string,
  existingRedirectMap: Map<string, string>,
  categories: ExistingCategory[],
  products: ProductCandidate[],
  includeProducts: boolean
): RedirectCandidateTarget[] {
  const allowedCategoryPaths = new Set(categories.map((row) => row.path));
  const map = new Map<string, RedirectCandidateTarget>();
  const upsert = (candidate: RedirectCandidateTarget) => {
    if (
      candidate.path !== '/' &&
      !allowedCategoryPaths.has(candidate.path)
    ) {
      return;
    }
    const existing = map.get(candidate.path);
    if (!existing || candidate.score > existing.score) map.set(candidate.path, candidate);
  };

  const exact = existingRedirectMap.get(brokenPath);
  if (exact && allowedCategoryPaths.has(normalizePath(exact))) {
    upsert(scoreCandidate(exact, 'existing-redirect-exact', 0.99));
  }

  const segments = brokenPath.toLowerCase().split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const lastToken = normalizeSlugToken(last);
  const likelyProduct = isLikelyProductPath(brokenPath);

  if (likelyProduct && lastToken) {
    for (const product of products) {
      const handleToken = normalizeSlugToken(product.handle);
      if (!handleToken) continue;
      const isMatch =
        handleToken === lastToken ||
        (lastToken.length >= 6 && (handleToken.includes(lastToken) || lastToken.includes(handleToken)));
      if (!isMatch) continue;
      const parentCategory = parentCategoryFromCanonical(product.canonicalPath);
      if (allowedCategoryPaths.has(parentCategory)) {
        upsert(scoreCandidate(parentCategory, 'product-handle-to-parent-category', 0.995));
      }
    }
  }

  if (likelyProduct && segments.length >= 2) {
    const seedCandidates = [
      `/${segments.slice(0, 3).join('/')}`,
      `/${segments.slice(0, 2).join('/')}`,
      `/${segments.slice(0, 1).join('/')}`,
    ];
    for (const seedPath of seedCandidates) {
      const normalizedSeed = normalizePath(seedPath);
      if (allowedCategoryPaths.has(normalizedSeed)) {
        upsert(scoreCandidate(normalizedSeed, 'product-to-parent-category', 0.97));
      }
    }
  }

  if (last) {
    for (const category of categories) {
      const lower = category.path.toLowerCase();
      if (lower.endsWith(`/${last}`)) {
        upsert(scoreCandidate(category.path, 'category-exact-segment', 0.9));
      } else if (last.length >= 4 && lower.includes(last)) {
        upsert(scoreCandidate(category.path, 'category-fuzzy-segment', 0.72));
      }
    }

    if (includeProducts && !likelyProduct) {
      for (const product of products) {
        const handle = product.handle.toLowerCase();
        const handleToken = normalizeSlugToken(handle);
        if (!handleToken) continue;
        if (handleToken === lastToken && lastToken) {
          upsert(scoreCandidate(product.canonicalPath, 'product-handle', 0.93));
        } else if (
          lastToken.length >= 4 &&
          (handleToken.includes(lastToken) || lastToken.includes(handleToken))
        ) {
          upsert(scoreCandidate(product.canonicalPath, 'product-fuzzy', 0.7));
        } else if (lastToken.length >= 6) {
          const lastParts = new Set(lastToken.split('-').filter((part) => part.length >= 3));
          const handleParts = new Set(handleToken.split('-').filter((part) => part.length >= 3));
          let overlap = 0;
          for (const part of lastParts) {
            if (handleParts.has(part)) overlap += 1;
          }
          if (overlap >= 2) {
            upsert(scoreCandidate(product.canonicalPath, 'product-token-overlap', 0.62));
          }
        }
      }
    }
  }

  const candidates = Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 20);
  if (!candidates.length) {
    // Last resort if no seeded category match is found.
    candidates.push(scoreCandidate('/', 'fallback-home', 0.1));
  }
  return candidates;
}

export async function runAiRedirectSuggestions(params: {
  inputRows: SuggestionInputRow[];
  baseUrl: string;
  model: RedirectSuggestionModel;
  limit?: number;
  includeProducts?: boolean;
}): Promise<RedirectSuggestionOutputRow[]> {
  const rows = params.limit ? params.inputRows.slice(0, params.limit) : params.inputRows;
  const categories = await loadExistingCategories();
  const allowedCategoryPaths = new Set(categories.map((row) => row.path));
  const includeProducts = Boolean(params.includeProducts);
  const products = await loadProductCandidates();
  const defaultCategoryFallback =
    ['/horse', '/rider', '/clothing', '/pet', '/accessories'].find((pathValue) =>
      allowedCategoryPaths.has(pathValue)
    ) || Array.from(allowedCategoryPaths)[0] || '/';
  const redirectRows = [
    ...loadCsvRedirects('collections.csv'),
    ...loadCsvRedirects('blogs.csv'),
    ...loadCsvRedirects('pages.csv'),
  ];
  const redirectMap = new Map<string, string>();
  for (const row of redirectRows) {
    if (!redirectMap.has(row.from)) redirectMap.set(row.from, row.to);
  }

  const suggester = new RedirectSuggester(params.model);
  const contextCache = new Map<string, Awaited<ReturnType<typeof fetchPageContext>>>();
  const output: RedirectSuggestionOutputRow[] = [];

  for (const row of rows) {
    if (row.isExternal) {
      output.push({
        from: row.originalInput || row.brokenPath,
        suggested_to: '',
        confidence: 0,
        reasoning: 'External URL detected. Review manually.',
        alternatives: [],
        source_path: row.sourcePath || '',
        method: 'rule-existing',
        is_external: true,
        review_note: 'External URL detected - review manually.',
      });
      continue;
    }
    const sourcePath = row.sourcePath || '/';
    const brokenUrl = new URL(row.brokenPath, params.baseUrl).toString();
    const sourceUrl = new URL(sourcePath, params.baseUrl).toString();

    let brokenContext = contextCache.get(row.brokenPath);
    if (!brokenContext) {
      brokenContext = await fetchPageContext(brokenUrl);
      contextCache.set(row.brokenPath, brokenContext);
    }
    let sourceContext = contextCache.get(sourcePath);
    if (!sourceContext) {
      sourceContext = await fetchPageContext(sourceUrl);
      contextCache.set(sourcePath, sourceContext);
    }

    const likelyProduct = isLikelyProductPath(row.brokenPath);
    const candidates = buildCandidatesForPath(
      row.brokenPath,
      redirectMap,
      categories,
      products,
      includeProducts
    );
    const exactRule = candidates.find((candidate) => candidate.reason === 'existing-redirect-exact');
    if (exactRule) {
      output.push({
        from: row.brokenPath,
        suggested_to: exactRule.path,
        confidence: 99,
        reasoning: 'Matched an existing redirect exactly.',
        alternatives: candidates.slice(0, 3).map((entry) => entry.path).filter((entry) => entry !== exactRule.path),
        source_path: sourcePath,
        method: 'rule-existing',
      });
      continue;
    }

    const suggestion = await suggester.suggestRedirect({
      brokenPath: row.brokenPath,
      sourcePath,
      brokenPageStatus: brokenContext.status,
      brokenPageTitle: brokenContext.title,
      brokenPageDescription: brokenContext.description,
      brokenPageText: brokenContext.text,
      sourcePageTitle: sourceContext.title,
      sourcePageText: sourceContext.text,
      candidateTargets: candidates,
    });
    const target = normalizePath(suggestion.suggestedTo);
    const targetAllowed =
      target === '/' ||
      allowedCategoryPaths.has(target);
    const categorySafeTarget = targetAllowed
      ? target
      : candidates.find((candidate) => candidate.path !== '/')?.path || '/';
    const productFinalTarget =
      likelyProduct && categorySafeTarget === '/'
        ? candidates.find((candidate) => candidate.path !== '/')?.path || defaultCategoryFallback
        : categorySafeTarget;
    const productRuleReason = likelyProduct
      ? 'Likely product URL: redirecting to nearest seeded category path.'
      : '';
    output.push({
      from: row.brokenPath,
      suggested_to:
        productFinalTarget === row.brokenPath
          ? candidates.find((candidate) => candidate.path !== row.brokenPath)?.path || '/'
          : productFinalTarget,
      confidence: suggestion.confidence,
      reasoning: productRuleReason || suggestion.reasoning,
      alternatives: suggestion.alternatives,
      source_path: sourcePath,
      method: 'ai',
    });
  }

  return output;
}
