import { NextRequest } from 'next/server';
import {
  listAllPublishedNewsArticlesForSitemap,
  type NewsArticleSitemapEntry,
} from '@/lib/articles/news-public';
import {
  entityTag,
  ifModifiedSinceNotModified,
  ifNoneMatchSatisfied,
  notModifiedResponse,
} from '@/lib/http/conditional-response';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au'
).replace(/\/$/, '');

/** CDATA-safe: break any accidental `]]>` in source text. */
function cdata(text: string): string {
  return `<![CDATA[${text.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function latestFeedModified(articles: NewsArticleSitemapEntry[]): Date {
  let maxMs = 0;
  for (const a of articles) {
    const raw = a.updated_at || a.published_at;
    const t = raw ? new Date(raw).getTime() : 0;
    if (Number.isFinite(t) && t > maxMs) maxMs = t;
  }
  return maxMs > 0 ? new Date(maxMs) : new Date();
}

const RSS_CACHE_CONTROL =
  'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600';

/**
 * Site-wide RSS 2.0 for news & articles (Neon `article` table, same as /news).
 * Path is `/rss.xml` (not `.rss`) so middleware does not return 410 for legacy `.rss` URLs.
 */
export async function GET(request: NextRequest) {
  const articles = await listAllPublishedNewsArticlesForSitemap();
  const selfUrl = `${SITE_URL}/rss.xml`;
  const now = new Date().toUTCString();

  const itemsXml = articles
    .map((article) => {
      const link = `${SITE_URL}/news/${article.slug}`;
      const pubDate = new Date(article.published_at || article.updated_at || Date.now()).toUTCString();
      const desc = article.excerpt?.trim() || article.title;

      return `    <item>
      <title>${cdata(article.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${cdata(desc)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata('The Equestrian')}</title>
    <link>${SITE_URL}</link>
    <description>${cdata('News, guides, and updates from The Equestrian — horse, rider, and pet gear in Australia.')}</description>
    <language>en-au</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  const lastModified = latestFeedModified(articles);
  const lastModifiedStr = lastModified.toUTCString();
  const etag = entityTag(xml);
  const validators = {
    ETag: etag,
    'Last-Modified': lastModifiedStr,
    'Cache-Control': RSS_CACHE_CONTROL,
  };
  if (
    ifNoneMatchSatisfied(request.headers.get('if-none-match'), etag) ||
    ifModifiedSinceNotModified(request.headers.get('if-modified-since'), lastModified)
  ) {
    return notModifiedResponse(validators);
  }

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      ...validators,
    },
  });
}

export const maxDuration = 60;
