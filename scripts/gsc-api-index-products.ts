/**
 * Google Indexing API — URL Submitter (Categories + Products)
 *
 * Submits category and product URLs to the Google Indexing API in prioritised
 * batches, respecting the daily quota and tracking every submission so runs
 * are idempotent and resumable.
 *
 * Priority tiers (processed in order):
 *   0. Categories        — all /cat, /cat/subcat, /cat/subcat/subsubcat pages (233 URLs)
 *   1. New arrivals      — shopify_created_at within last 30 days
 *   2. Recent updates    — updated in last 14 days but not new
 *   3. Available stock   — available_for_sale = true
 *   4. Everything else   — out of stock / older products
 *
 * Usage:
 *   npm run gsc:index-products          ← submit today's batch
 *   npm run gsc:index-products -- --dry-run  ← preview without submitting
 *   npm run gsc:index-products -- --limit 50 ← override daily limit
 *
 * Prerequisites:
 *   1. Enable the "Web Search Indexing API" in Google Cloud Console
 *   2. Add the service account as an OWNER in GSC
 *      (Settings → Users & permissions → Add user → Owner)
 *   3. Run: npm run db:sync  (to ensure products table is up to date)
 *
 * Quota:
 *   Default 200 URLs/day. Request an increase at:
 *   console.cloud.google.com → APIs → Indexing API → Quotas
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { JWT } from 'google-auth-library';
import { sql } from '@/lib/db/client';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ────────────────────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://www.theequestrian.com.au';

// Daily quota — default 200, increase via GCP Console
const DAILY_QUOTA = parseInt(process.env.INDEXING_API_DAILY_QUOTA || '200', 10);

// How many URLs to send per HTTP batch request (Google max = 100)
const BATCH_SIZE = 100;

// Milliseconds between batch submissions (be gentle on the API)
const DELAY_BETWEEN_BATCHES_MS = 2000;

// Re-submit a URL after this many days (in case content changed)
const RESUBMIT_AFTER_DAYS = 30;

// Paths
const QUEUE_DIR = path.join(process.cwd(), 'exports');
const QUEUE_FILE = path.join(QUEUE_DIR, 'indexing-queue.json');
const LOG_DIR = path.join(QUEUE_DIR, 'indexing-logs');

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueEntry {
  url: string;
  priority: 0 | 1 | 2 | 3 | 4;
  priorityLabel: string;
  firstQueued: string;
  lastSubmitted: string | null;
  submitCount: number;
  lastStatus: 'pending' | 'submitted' | 'error';
  lastError?: string;
}

interface IndexingQueue {
  generatedAt: string;
  totalUrls: number;
  entries: QueueEntry[];
}

interface DailyLog {
  date: string;
  submitted: number;
  errors: number;
  skipped: number;
  urls: Array<{ url: string; status: 'ok' | 'error'; detail?: string }>;
}

// ─── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.find((a) => a.startsWith('--limit'));
const DAILY_LIMIT = LIMIT_ARG
  ? parseInt(LIMIT_ARG.split('=')[1] || args[args.indexOf(LIMIT_ARG) + 1], 10)
  : DAILY_QUOTA;

// ─── Google Auth ──────────────────────────────────────────────────────────────

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';

function parseServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    const parsed = trimmed.startsWith('{')
      ? JSON.parse(trimmed)
      : JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
    return parsed;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  const account = parseServiceAccount();
  if (!account?.client_email || !account?.private_key) {
    throw new Error(
      'Missing GSC_SERVICE_ACCOUNT_JSON in .env.local\n' +
      'The service account also needs OWNER access in GSC:\n' +
      'Settings → Users & permissions → Add user → Owner'
    );
  }
  const auth = new JWT({
    email: account.client_email,
    key: account.private_key.replace(/\\n/g, '\n'),
    scopes: [INDEXING_SCOPE],
  });
  const tokenResponse = await auth.getAccessToken();
  const token =
    typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error('Failed to obtain access token from service account');
  return token;
}

// ─── Queue Management ─────────────────────────────────────────────────────────

function loadQueue(): IndexingQueue | null {
  if (!fs.existsSync(QUEUE_FILE)) return null;
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')) as IndexingQueue;
}

function saveQueue(queue: IndexingQueue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function getQueueEntry(queue: IndexingQueue, url: string): QueueEntry | undefined {
  return queue.entries.find((e) => e.url === url);
}

// ─── Category URLs from Sitemap CSV ──────────────────────────────────────────

function loadCategoryUrls(): string[] {
  const csvPath = path.join(process.cwd(), 'exports', 'sitemap-current.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  sitemap-current.csv not found — skipping categories (run: npm run export:sitemap)`);
    return [];
  }
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  const urls: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const rel = cols[3]?.trim();
    if (rel && rel.startsWith('/')) {
      urls.push(`${SITE_URL}${rel}`);
    }
  }
  return urls;
}

// ─── Product URLs from DB ─────────────────────────────────────────────────────

interface ProductRow {
  handle: string;
  primary_collection: string | null;
  shopify_created_at: string | null;
  updated_at: string | null;
  available_for_sale: boolean;
}

async function fetchProductsFromDb(): Promise<ProductRow[]> {
  // neon() HTTP client returns rows directly as an array (not { rows: [] })
  const rows = await sql`
    SELECT
      p.handle,
      pca.canonical_path AS primary_collection,
      p.shopify_created_at,
      p.updated_at,
      p.available_for_sale
    FROM products p
    LEFT JOIN (
      SELECT DISTINCT ON (product_id) product_id, canonical_path
      FROM product_category_assignments
      ORDER BY product_id, created_at DESC
    ) pca ON p.id = pca.product_id
    ORDER BY p.shopify_created_at DESC NULLS LAST
  `;
  return rows as unknown as ProductRow[];
}

function buildProductUrl(product: ProductRow): string {
  if (product.primary_collection) {
    // canonical_path already contains the full path including the product handle
    // e.g. "clothing/womens/tops/product-handle" or "/clothing/womens/tops/product-handle"
    const cleanPath = product.primary_collection.replace(/^\/+/, '');
    return `${SITE_URL}/${cleanPath}`;
  }
  return `${SITE_URL}/products/${product.handle}`;
}

function getPriority(product: ProductRow): { priority: 1 | 2 | 3 | 4; label: string } {  // eslint-disable-line
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const createdAt = product.shopify_created_at
    ? new Date(product.shopify_created_at).getTime()
    : 0;
  const updatedAt = product.updated_at
    ? new Date(product.updated_at).getTime()
    : 0;

  if (createdAt > thirtyDaysAgo) {
    return { priority: 1, label: 'New arrival (< 30 days)' };
  }
  if (updatedAt > fourteenDaysAgo) {
    return { priority: 2, label: 'Recently updated (< 14 days)' };
  }
  if (product.available_for_sale) {
    return { priority: 3, label: 'In stock' };
  }
  return { priority: 4, label: 'Out of stock / older' };
}

// ─── Build / Refresh Queue ────────────────────────────────────────────────────

async function buildQueue(): Promise<IndexingQueue> {
  const existingQueue = loadQueue();
  const existingMap = new Map<string, QueueEntry>(
    existingQueue?.entries.map((e) => [e.url, e]) ?? []
  );

  // ── P0: Categories ──────────────────────────────────────────────────────────
  const categoryUrls = loadCategoryUrls();
  console.log(`   Found ${categoryUrls.length} category URLs (P0)`);

  const categoryEntries: QueueEntry[] = categoryUrls.map((url) => {
    const existing = existingMap.get(url);
    return {
      url,
      priority: 0 as const,
      priorityLabel: 'Category / subcategory page',
      firstQueued: existing?.firstQueued ?? new Date().toISOString(),
      lastSubmitted: existing?.lastSubmitted ?? null,
      submitCount: existing?.submitCount ?? 0,
      lastStatus: existing?.lastStatus ?? 'pending',
      lastError: existing?.lastError,
    };
  });

  // ── P1–P4: Products ─────────────────────────────────────────────────────────
  console.log('📦 Fetching products from database…');
  const products = await fetchProductsFromDb();
  console.log(`   Found ${products.length} products (P1–P4)`);

  const productEntries: QueueEntry[] = products.map((product) => {
    const url = buildProductUrl(product);
    const { priority, label } = getPriority(product);
    const existing = existingMap.get(url);

    return {
      url,
      priority,
      priorityLabel: label,
      firstQueued: existing?.firstQueued ?? new Date().toISOString(),
      lastSubmitted: existing?.lastSubmitted ?? null,
      submitCount: existing?.submitCount ?? 0,
      lastStatus: existing?.lastStatus ?? 'pending',
      lastError: existing?.lastError,
    };
  });

  const entries = [...categoryEntries, ...productEntries];

  // Sort by priority then by firstQueued (oldest first within a tier)
  entries.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.firstQueued).getTime() - new Date(b.firstQueued).getTime();
  });

  const queue: IndexingQueue = {
    generatedAt: new Date().toISOString(),
    totalUrls: entries.length,
    entries,
  };

  saveQueue(queue);
  console.log(`✅ Queue saved → ${QUEUE_FILE}`);
  return queue;
}

// ─── Select Today's Batch ─────────────────────────────────────────────────────

function selectBatch(queue: IndexingQueue, limit: number): QueueEntry[] {
  const now = Date.now();
  const resubmitThreshold = now - RESUBMIT_AFTER_DAYS * 24 * 60 * 60 * 1000;

  return queue.entries
    .filter((entry) => {
      // Never submitted — include
      if (!entry.lastSubmitted) return true;
      // Error on last attempt — retry
      if (entry.lastStatus === 'error') return true;
      // Old submission — resubmit to refresh
      if (new Date(entry.lastSubmitted).getTime() < resubmitThreshold) return true;
      // Recently submitted OK — skip
      return false;
    })
    .slice(0, limit);
}

// ─── Google Indexing API ──────────────────────────────────────────────────────

interface BatchResult {
  url: string;
  status: 'ok' | 'error';
  detail?: string;
}

/**
 * Submits up to 100 URLs in a single HTTP batch request.
 * See: https://developers.google.com/search/apis/indexing-api/v3/using-api#batch_requests
 */
async function submitBatch(urls: string[], token: string): Promise<BatchResult[]> {
  const BOUNDARY = 'indexing_batch_boundary';
  const INDEXING_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

  // Build multipart body — each part is one URL notification
  const parts = urls.map(
    (url, i) =>
      `--${BOUNDARY}\r\n` +
      `Content-Type: application/http\r\n` +
      `Content-ID: <item-${i}>\r\n` +
      `\r\n` +
      `POST ${INDEXING_ENDPOINT}\r\n` +
      `Content-Type: application/json\r\n` +
      `\r\n` +
      JSON.stringify({ url, type: 'URL_UPDATED' }) +
      `\r\n`
  );

  const body = parts.join('') + `--${BOUNDARY}--`;

  // NOTE: www.googleapis.com/batch was deprecated in 2020.
  // The correct endpoint is the API-specific batch URL.
  const response = await fetch('https://indexing.googleapis.com/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/mixed; boundary=${BOUNDARY}`,
    },
    body,
  });

  const responseText = await response.text();

  // If the top-level request failed, mark all URLs as error
  if (!response.ok && response.status !== 207) {
    // Try to extract a useful error message
    let detail = `API error HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(responseText);
      if (errJson?.error?.message) detail = errJson.error.message;
    } catch { /* ignore */ }
    return urls.map((url) => ({ url, status: 'error' as const, detail }));
  }

  // Parse each part of the multipart response
  // Google responds with Content-ID: <response-item-N> for each submitted item
  const results: BatchResult[] = urls.map((url, i) => {
    // Match this item's response block
    const partRegex = new RegExp(
      `Content-ID:\\s*<response-item-${i}>[\\s\\S]*?HTTP\\/1\\.1\\s+(\\d+)[^\\n]*\\n([\\s\\S]*?)(?=--${BOUNDARY}|$)`,
      'i'
    );
    const match = responseText.match(partRegex);

    if (!match) {
      // Part not found — treat as OK if the overall response was 200
      return response.ok
        ? { url, status: 'ok' as const }
        : { url, status: 'error' as const, detail: 'Could not parse batch response part' };
    }

    const statusCode = parseInt(match[1], 10);
    if (statusCode >= 200 && statusCode < 300) {
      return { url, status: 'ok' as const };
    }

    // Try to extract the error message from the JSON body of this part
    let errDetail = `HTTP ${statusCode}`;
    try {
      const bodyStart = match[2].indexOf('{');
      if (bodyStart !== -1) {
        const parsed = JSON.parse(match[2].slice(bodyStart));
        if (parsed?.error?.message) errDetail = parsed.error.message;
      }
    } catch { /* ignore */ }

    return { url, status: 'error' as const, detail: errDetail };
  });

  return results;
}

// ─── Daily Log ────────────────────────────────────────────────────────────────

function initDailyLog(): DailyLog {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  return { date, submitted: 0, errors: 0, skipped: 0, urls: [] };
}

function saveDailyLog(log: DailyLog) {
  const file = path.join(LOG_DIR, `indexing-log-${log.date}.json`);
  fs.writeFileSync(file, JSON.stringify(log, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Google Indexing API — Product Submitter        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Site:       ${SITE_URL}`);
  console.log(`Daily limit: ${DAILY_LIMIT} URLs`);
  console.log(`Batch size:  ${BATCH_SIZE} URLs per request`);
  console.log(`Resubmit:   After ${RESUBMIT_AFTER_DAYS} days`);
  if (DRY_RUN) console.log('⚠️  DRY RUN — no URLs will be submitted');
  console.log('');

  // Step 1: Build / refresh the queue from DB
  const queue = await buildQueue();

  // Step 2: Select today's batch
  const batch = selectBatch(queue, DAILY_LIMIT);

  if (batch.length === 0) {
    console.log('✨ Nothing to submit — all URLs are up to date.');
    console.log(`   Next resubmit cycle in ${RESUBMIT_AFTER_DAYS} days.`);
    return;
  }

  // Step 3: Show breakdown by priority
  const byPriority = batch.reduce<Record<number, number>>((acc, e) => {
    acc[e.priority] = (acc[e.priority] || 0) + 1;
    return acc;
  }, {});

  console.log(`📋 Submitting ${batch.length} URLs today:`);
  for (const [p, count] of Object.entries(byPriority)) {
    const labels: Record<string, string> = {
      '0': 'Categories & subcategories',
      '1': 'New arrivals',
      '2': 'Recently updated',
      '3': 'In stock',
      '4': 'Out of stock / older',
    };
    console.log(`   Priority ${p} (${labels[p]}): ${count} URLs`);
  }

  const totalRemaining = queue.entries.filter(
    (e) => !e.lastSubmitted || e.lastStatus === 'error'
  ).length - batch.length;
  if (totalRemaining > 0) {
    const daysLeft = Math.ceil(totalRemaining / DAILY_LIMIT);
    console.log(`   Remaining after today: ${totalRemaining} URLs (~${daysLeft} more days)`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('── DRY RUN: would submit these URLs ──');
    batch.slice(0, 20).forEach((e, i) =>
      console.log(`  [${i + 1}] [P${e.priority}] ${e.url}`)
    );
    if (batch.length > 20) console.log(`  … and ${batch.length - 20} more`);
    return;
  }

  // Step 4: Get auth token
  console.log('🔐 Authenticating with Google…');
  const token = await getAccessToken();
  console.log('✅ Authenticated\n');

  // Step 5: Submit in batches of BATCH_SIZE
  const log = initDailyLog();
  const chunks: QueueEntry[][] = [];
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    chunks.push(batch.slice(i, i + BATCH_SIZE));
  }

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const chunkTag = `[Batch ${c + 1}/${chunks.length}]`;
    console.log(`${chunkTag} Submitting ${chunk.length} URLs…`);

    let results: BatchResult[];
    try {
      results = await submitBatch(chunk.map((e) => e.url), token);
    } catch (err) {
      console.error(`${chunkTag} ❌ Network error: ${err}`);
      // Mark all as error
      results = chunk.map((e) => ({
        url: e.url,
        status: 'error' as const,
        detail: err instanceof Error ? err.message : String(err),
      }));
    }

    // Update queue entries with results
    const now = new Date().toISOString();
    for (const result of results) {
      const entry = getQueueEntry(queue, result.url);
      if (!entry) continue;

      entry.lastSubmitted = now;
      entry.submitCount += 1;
      entry.lastStatus = result.status === 'ok' ? 'submitted' : 'error';
      entry.lastError = result.detail;

      log.urls.push({ url: result.url, status: result.status, detail: result.detail });

      if (result.status === 'ok') {
        log.submitted++;
        process.stdout.write('.');
      } else {
        log.errors++;
        process.stdout.write('✗');
        console.log(`\n   ❌ ${result.url} — ${result.detail}`);
      }
    }
    console.log('');

    // Save queue after every batch so progress is never lost
    saveQueue(queue);
    saveDailyLog(log);

    // Pause between batches
    if (c < chunks.length - 1) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Step 6: Summary
  console.log('');
  console.log('══════════════ Summary ══════════════');
  console.log(`  ✅ Submitted OK:  ${log.submitted}`);
  console.log(`  ❌ Errors:        ${log.errors}`);
  console.log(`  📄 Queue:         ${QUEUE_FILE}`);
  console.log(`  📋 Log:           ${path.join(LOG_DIR, `indexing-log-${log.date}.json`)}`);

  if (totalRemaining > 0) {
    console.log('');
    console.log(`  ⏳ ${totalRemaining} URLs still pending — run again tomorrow.`);
  } else {
    console.log('');
    console.log('  🎉 All products submitted! Run monthly to refresh.');
  }
  console.log('═════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
