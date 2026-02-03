import { sql } from '@vercel/postgres';
import { upsertNotFoundRollup } from '@/lib/not-found/rollup-store';

const extractLocs = (xml: string) => {
  const locs: string[] = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(xml))) {
    locs.push(match[1]);
  }
  return locs;
};

const fetchText = async (url: string) => {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
};

const fetchSitemapUrls = async (baseUrl: string) => {
  const sitemapIndex = `${baseUrl.replace(/\/$/, '')}/sitemap.xml`;
  const indexXml = await fetchText(sitemapIndex);
  const locs = extractLocs(indexXml);
  const urls: string[] = [];

  if (locs.length === 0 || !indexXml.includes('sitemapindex')) {
    return extractLocs(indexXml);
  }

  for (const loc of locs) {
    const xml = await fetchText(loc);
    urls.push(...extractLocs(xml));
  }

  return urls;
};

const extractInternalLinks = (html: string, baseUrl: string) => {
  const links = new Set<string>();
  const regex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html))) {
    const href = match[1].trim();
    if (!href || href.startsWith('#')) continue;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('http')) {
      if (href.startsWith(baseUrl)) {
        links.add(href);
      }
      continue;
    }
    if (href.startsWith('/')) {
      links.add(`${baseUrl.replace(/\/$/, '')}${href}`);
    }
  }
  return Array.from(links);
};

const normalizePath = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
};

const withConcurrency = async <T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) => {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      await worker(item);
    }
  });
  await Promise.all(workers);
};

export async function scanNotFoundUrls(options?: {
  pageLimit?: number | null;
  linkLimit?: number | null;
  includeLinks?: boolean;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is not set.');
  }

  const { pageLimit = 300, linkLimit = 500, includeLinks = false } = options ?? {};
  const urls = await fetchSitemapUrls(baseUrl);
  const sample = pageLimit ? urls.slice(0, pageLimit) : urls;
  let scanned = 0;
  let notFound = 0;
  let linkScanned = 0;

  const discoveredLinks = new Map<string, string>();

  await withConcurrency(sample, 4, async (url) => {
    scanned += 1;
    const res = await fetch(url, { method: 'GET', redirect: 'manual' });
    if (res.status === 404) {
      notFound += 1;
      const path = normalizePath(url);
      await sql`
        INSERT INTO not_found_events (path, referrer, user_agent)
        VALUES (${path}, ${'site-scan'}, ${'scanner'})
      `;
      await upsertNotFoundRollup({
        path,
        referrer: 'site-scan',
        source: 'scan',
        hitIncrement: 1,
      });
      return;
    }
    if (includeLinks && res.ok) {
      const html = await res.text();
      const links = extractInternalLinks(html, baseUrl);
      for (const link of links) {
        if (linkLimit && discoveredLinks.size >= linkLimit) break;
        if (!discoveredLinks.has(link)) {
          discoveredLinks.set(link, normalizePath(url));
        }
      }
    }
  });

  const linkTargets = Array.from(discoveredLinks.entries());
  await withConcurrency(linkTargets, 8, async ([link, source]) => {
    linkScanned += 1;
    const res = await fetch(link, { method: 'GET', redirect: 'manual' });
    if (res.status === 404) {
      notFound += 1;
      const path = normalizePath(link);
      await sql`
        INSERT INTO not_found_events (path, referrer, user_agent)
        VALUES (${path}, ${source}, ${'link-scan'})
      `;
      await upsertNotFoundRollup({
        path,
        referrer: source,
        source: 'scan',
        hitIncrement: 1,
      });
    }
  });

  return { scanned, notFound, linkScanned };
}
