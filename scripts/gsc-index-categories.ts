/**
 * GSC Category URL Inspector & Indexer
 *
 * Uses Puppeteer to open Google Search Console URL Inspection for every
 * category and subcategory URL in exports/sitemap-current.csv, then
 * requests indexing for any URL that is not yet on Google.
 *
 * Usage:
 *   npm run gsc:index-categories
 *
 * First run:
 *   A real Chrome window opens. Log in to the Google account that has
 *   GSC access, then return to the terminal and press Enter.
 *   The session is saved to ~/.gsc-puppeteer-profile so you won't need
 *   to log in again on subsequent runs.
 *
 * Results are written to exports/gsc-indexing-results-<date>.csv.
 * Re-running on the same date resumes from where it left off (errors are retried).
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

// ─── Configuration ────────────────────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://www.theequestrian.com.au';

// The GSC property URL (with trailing slash as registered in Search Console)
const GSC_RESOURCE_ID = `${SITE_URL}/`;

const SITEMAP_CSV = path.join(process.cwd(), 'exports', 'sitemap-current.csv');
const RESULTS_DIR = path.join(process.cwd(), 'exports');
const PROFILE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '~',
  '.gsc-puppeteer-profile'
);

// Milliseconds to pause between URL inspections (be polite to GSC)
const DELAY_BETWEEN_URLS_MS = 4000;

// How long to wait for GSC to finish checking a URL
const STATUS_TIMEOUT_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type UrlStatus =
  | 'indexed'
  | 'not_indexed'
  | 'indexing_requested'
  | 'excluded'
  | 'quota_exceeded'
  | 'error'
  | 'skipped';

// Thrown when GSC tells us the daily indexing quota is exhausted
class QuotaExceededError extends Error {
  constructor() {
    super('GSC daily indexing quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

interface UrlResult {
  url: string;
  status: UrlStatus;
  detail: string;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForKeypress(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

// ─── URL Loading ──────────────────────────────────────────────────────────────

function loadCategoryUrls(): string[] {
  if (!fs.existsSync(SITEMAP_CSV)) {
    throw new Error(`Sitemap CSV not found: ${SITEMAP_CSV}\nRun: npm run export:sitemap`);
  }

  const lines = fs.readFileSync(SITEMAP_CSV, 'utf-8').trim().split('\n');
  const urls: string[] = [];

  // Header: Top Level,Subcategory,Sub-subcategory,Complete URL
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const rel = cols[3]?.trim();
    if (rel && rel.startsWith('/')) {
      urls.push(`${SITE_URL}${rel}`);
    }
  }

  if (urls.length === 0) {
    throw new Error('No URLs found in sitemap CSV. Check the file format.');
  }

  return urls;
}

// ─── Results File ─────────────────────────────────────────────────────────────

function getResultsFilePath(): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(RESULTS_DIR, `gsc-indexing-results-${dateStr}.csv`);
}

function loadExistingResults(file: string): Map<string, UrlResult> {
  const map = new Map<string, UrlResult>();
  if (!fs.existsSync(file)) return map;

  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').slice(1);
  for (const line of lines) {
    // url,status,detail,timestamp  (detail may be quoted)
    const m = line.match(/^([^,]+),([^,]+),"?([^"]*)"?,(.+)$/);
    if (m) {
      map.set(m[1], { url: m[1], status: m[2] as UrlStatus, detail: m[3], timestamp: m[4] });
    }
  }
  return map;
}

function ensureResultsHeader(file: string) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, 'URL,Status,Detail,Timestamp\n');
  }
}

function appendResult(file: string, result: UrlResult) {
  const line = `${result.url},${result.status},"${result.detail.replace(/"/g, "'")}",${result.timestamp}\n`;
  fs.appendFileSync(file, line);
}

// ─── GSC Page Interaction ─────────────────────────────────────────────────────

/**
 * Polls the page body text until GSC shows a coverage status.
 * Returns the status category and the detail text found.
 */
async function waitForCoverageStatus(
  page: Page,
  inspectUrl: string
): Promise<{ category: 'indexed' | 'not_indexed' | 'excluded'; detail: string }> {
  let deadline = Date.now() + STATUS_TIMEOUT_MS;

  // Phrases that indicate the URL IS on Google
  const INDEXED_PHRASES = ['URL is on Google'];

  // Phrases that indicate not indexed but can be requested
  const NOT_INDEXED_PHRASES = [
    'URL is not on Google',
    'Crawled - currently not indexed',
    'Discovered - currently not indexed',
    'Not found (404)',
    'Soft 404',
    'Page with redirect',
  ];

  // Phrases that indicate excluded (canonical issues etc.) — requesting won't help
  const EXCLUDED_PHRASES = [
    'Alternate page with proper canonical tag',
    'Duplicate without user-selected canonical',
    'Duplicate, Google chose different canonical',
    'Excluded by "noindex" tag',
    'Blocked by robots.txt',
    'Blocked due to access forbidden',
  ];

  while (Date.now() < deadline) {
    await sleep(1500);

    const bodyText: string = await page
      .evaluate(() => (document.body as HTMLElement).innerText)
      .catch(() => '');

    for (const phrase of INDEXED_PHRASES) {
      if (bodyText.includes(phrase)) {
        return { category: 'indexed', detail: phrase };
      }
    }

    for (const phrase of EXCLUDED_PHRASES) {
      if (bodyText.includes(phrase)) {
        return { category: 'excluded', detail: phrase };
      }
    }

    for (const phrase of NOT_INDEXED_PHRASES) {
      if (bodyText.includes(phrase)) {
        return { category: 'not_indexed', detail: phrase };
      }
    }
  }

  throw new Error(`Timed out (${STATUS_TIMEOUT_MS / 1000}s) waiting for GSC status`);
}

// Phrases GSC shows when the daily "Request Indexing" quota is exhausted
const QUOTA_PHRASES = [
  "You've reached today's limit",
  "You have reached today's limit",
  'daily limit',
  'quota exceeded',
  'Quota exceeded',
  'reached the limit',
  'try again tomorrow',
  'Try again tomorrow',
];

/**
 * Finds and clicks the "Request Indexing" button then waits for confirmation.
 * Throws QuotaExceededError if GSC reports the daily limit has been reached.
 */
async function clickRequestIndexing(page: Page): Promise<boolean> {
  // GSC renders its UI in shadow DOM / deeply nested divs; scan all buttons
  const clicked = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of allButtons) {
      const text = (btn as HTMLElement).innerText?.trim().toUpperCase();
      if (text?.includes('REQUEST INDEXING')) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) return false;

  // Wait for GSC to respond (dialog / progress spinner)
  await sleep(6000);

  // Check if GSC is showing a quota / rate-limit message
  const bodyText: string = await page
    .evaluate(() => (document.body as HTMLElement).innerText)
    .catch(() => '');

  for (const phrase of QUOTA_PHRASES) {
    if (bodyText.includes(phrase)) {
      throw new QuotaExceededError();
    }
  }

  // Dismiss any resulting "Indexing requested" confirmation dialog
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of btns) {
      const t = (btn as HTMLElement).innerText?.trim().toUpperCase();
      if (t === 'GOT IT' || t === 'OK' || t === 'CLOSE') {
        (btn as HTMLElement).click();
        return;
      }
    }
  });

  await sleep(1000);
  return true;
}

// ─── GSC Search Bar ───────────────────────────────────────────────────────────

/**
 * Types a URL into the GSC URL Inspection search bar and presses Enter.
 * This avoids navigating directly to the parameterised inspect URL, which
 * triggers a Google re-authentication challenge for automated browsers.
 */
async function submitUrlToInspectBar(page: Page, url: string): Promise<void> {
  // The inspect bar input selectors GSC has used historically
  const SELECTORS = [
    'input[aria-label*="Inspect"]',
    'input[aria-label*="inspect"]',
    'input[placeholder*="Inspect"]',
    'input[placeholder*="inspect"]',
    'input[jsname]',
    'form input[type="text"]',
    'form input:not([type="hidden"])',
  ];

  let input = null;
  for (const sel of SELECTORS) {
    input = await page.$(sel);
    if (input) break;
  }

  if (!input) {
    throw new Error('Could not find GSC URL inspection input bar');
  }

  // Clear current value, type the new URL, submit
  await input.click({ clickCount: 3 });
  await input.type(url, { delay: 30 });
  await input.press('Enter');
}

// ─── Core Inspector ───────────────────────────────────────────────────────────

async function inspectAndIndex(page: Page, url: string): Promise<UrlResult> {
  const timestamp = new Date().toISOString();

  // Build the inspect URL — used only as a fallback reference for the status poller
  const inspectUrl =
    `https://search.google.com/search-console/inspect` +
    `?resource_id=${encodeURIComponent(GSC_RESOURCE_ID)}` +
    `&id=${encodeURIComponent(url)}`;

  try {
    // Type the URL into the GSC search bar and press Enter — this is the same
    // action a human takes, avoids the direct-URL re-auth challenge
    await submitUrlToInspectBar(page, url);
    await sleep(2000); // let the navigation settle

    const { category, detail } = await waitForCoverageStatus(page, inspectUrl);

    if (category === 'indexed') {
      return { url, status: 'indexed', detail, timestamp };
    }

    if (category === 'excluded') {
      return { url, status: 'excluded', detail, timestamp };
    }

    // Not indexed — try to request indexing
    console.log(`    ↳ Not indexed (${detail}), requesting indexing...`);

    // QuotaExceededError is intentionally NOT caught here — let it bubble up
    // to main() so the whole run stops cleanly.
    const didRequest = await clickRequestIndexing(page);

    if (didRequest) {
      return {
        url,
        status: 'indexing_requested',
        detail: `Indexing requested. Was: ${detail}`,
        timestamp,
      };
    }

    return {
      url,
      status: 'not_indexed',
      detail: `Request button not found. Status: ${detail}`,
      timestamp,
    };
  } catch (err) {
    // Re-throw quota errors so main() can handle them
    if (err instanceof QuotaExceededError) throw err;

    return {
      url,
      status: 'error',
      detail: err instanceof Error ? err.message : String(err),
      timestamp,
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   GSC Category URL Inspector & Indexer           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Site:     ${SITE_URL}`);
  console.log(`Profile:  ${PROFILE_DIR}`);
  console.log('');

  // Load URLs
  const allUrls = loadCategoryUrls();
  console.log(`📋 Total category/subcategory URLs: ${allUrls.length}`);

  // Resume support
  const resultsFile = getResultsFilePath();
  const existing = loadExistingResults(resultsFile);

  const toProcess = allUrls.filter((url) => {
    const prev = existing.get(url);
    // Skip successfully processed; retry errors and quota_exceeded
    return !prev || prev.status === 'error' || prev.status === 'quota_exceeded';
  });

  const alreadyDone = allUrls.length - toProcess.length;
  console.log(`✅ Already processed (skipping): ${alreadyDone}`);
  console.log(`⏳ To inspect now:               ${toProcess.length}`);
  console.log(`📄 Results file: ${resultsFile}`);
  console.log('');

  if (toProcess.length === 0) {
    console.log('✨ Nothing left to process. Done!');
    return;
  }

  // Ensure results CSV has a header
  ensureResultsHeader(resultsFile);

  // Launch browser
  console.log('🌐 Launching Chrome (visible window)…\n');

  let browser: Browser | undefined;

  try {
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: PROFILE_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1440,900',
      ],
      defaultViewport: { width: 1440, height: 900 },
    });

    const page = await browser.newPage();

    // Remove automation fingerprints so Google doesn't detect Puppeteer
    // and force re-authentication on the inspect endpoint
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    // Use a realistic Chrome user-agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/120.0.0.0 Safari/537.36'
    );

    // ── Pre-flight: load the GSC URL Inspection page for this property ──
    // We navigate here ONCE and reuse the search bar for every URL.
    // This avoids the re-auth challenge that occurs when navigating directly
    // to the parameterised inspect URL in an automated browser.
    const gscInspectBase =
      `https://search.google.com/search-console/inspect` +
      `?resource_id=${encodeURIComponent(GSC_RESOURCE_ID)}`;

    console.log('🔐 Opening GSC URL Inspection tool…');
    await page.goto(gscInspectBase, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await sleep(3000);

    const loginCheck = async (): Promise<boolean> => {
      const url = page.url();
      const text: string = await page
        .evaluate(() => (document.body as HTMLElement).innerText.slice(0, 600))
        .catch(() => '');
      return (
        url.includes('accounts.google.com') ||
        url.includes('signin') ||
        text.includes('Email or phone') ||
        (text.includes('Sign in') && text.includes('Google'))
      );
    };

    if (await loginCheck()) {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║  🔐  Google login required                               ║');
      console.log('║                                                          ║');
      console.log('║  Please log in to Google in the browser window that     ║');
      console.log('║  just opened, then come back here and press Enter.      ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      await waitForKeypress('\nPress Enter once you are logged in → ');
      // Give the session a moment to settle
      await sleep(2000);
    }

    console.log('✅ Logged in — starting URL inspection\n');

    // Counters
    let cntIndexed = 0;
    let cntRequested = 0;
    let cntExcluded = 0;
    let cntErrors = 0;

    let quotaHit = false;

    for (let i = 0; i < toProcess.length; i++) {
      const url = toProcess[i];
      const pad = toProcess.length.toString().length;
      const tag = `[${String(i + 1).padStart(pad)}/${toProcess.length}]`;

      process.stdout.write(`${tag} ${url} … `);

      let result: UrlResult;

      try {
        result = await inspectAndIndex(page, url);
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          // Mark this URL and every remaining URL as quota_exceeded so they
          // are all retried tomorrow.
          const ts = new Date().toISOString();
          const remaining = toProcess.slice(i);

          console.log('');
          console.log('');
          console.log('╔══════════════════════════════════════════════════════════╗');
          console.log('║  ⛔  Daily GSC indexing quota reached                   ║');
          console.log('║                                                          ║');
          console.log('║  Google allows ~10 "Request Indexing" clicks per day    ║');
          console.log('║  per Search Console property.                           ║');
          console.log('║                                                          ║');
          console.log('║  The script has marked all remaining URLs as            ║');
          console.log('║  "quota_exceeded" and will automatically retry them     ║');
          console.log('║  the next time you run:                                 ║');
          console.log('║                                                          ║');
          console.log('║    npm run gsc:index-categories                         ║');
          console.log('║                                                          ║');
          console.log('╚══════════════════════════════════════════════════════════╝');
          console.log(`  URLs left to process tomorrow: ${remaining.length}`);
          console.log('');

          for (const remainingUrl of remaining) {
            const r: UrlResult = {
              url: remainingUrl,
              status: 'quota_exceeded',
              detail: 'Daily GSC indexing quota reached — will retry tomorrow',
              timestamp: ts,
            };
            appendResult(resultsFile, r);
          }

          quotaHit = true;
          break;
        }

        // Unexpected error — treat as a normal error result
        result = {
          url,
          status: 'error',
          detail: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
      }

      appendResult(resultsFile, result!);

      switch (result!.status) {
        case 'indexed':
          cntIndexed++;
          console.log('✅ indexed');
          break;
        case 'indexing_requested':
          cntRequested++;
          console.log('📤 indexing requested');
          break;
        case 'excluded':
          cntExcluded++;
          console.log(`⚠️  excluded — ${result!.detail}`);
          break;
        case 'not_indexed':
          console.log(`🔶 not indexed (no button found)`);
          break;
        case 'error':
          cntErrors++;
          console.log(`❌ error — ${result!.detail}`);
          break;
      }

      // Rate-limit pause (skip after the last URL)
      if (!quotaHit && i < toProcess.length - 1) {
        await sleep(DELAY_BETWEEN_URLS_MS);
      }
    }

    console.log('');
    console.log('══════════════ Summary ══════════════');
    console.log(`  ✅ Already indexed:      ${cntIndexed}`);
    console.log(`  📤 Indexing requested:   ${cntRequested}`);
    console.log(`  ⚠️  Excluded:             ${cntExcluded}`);
    console.log(`  ❌ Errors:               ${cntErrors}`);
    if (quotaHit) {
      const remaining = toProcess.length - cntIndexed - cntRequested - cntExcluded - cntErrors;
      console.log(`  ⛔ Quota exceeded:       ${remaining} URLs queued for tomorrow`);
      console.log('');
      console.log('  Run again tomorrow:  npm run gsc:index-categories');
    }
    console.log(`  📋 Results saved to:     ${resultsFile}`);
    console.log('═════════════════════════════════════');
  } finally {
    await browser?.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
