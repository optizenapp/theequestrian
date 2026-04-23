/**
 * Article helpers - site-specific URL and lookups
 * getArticleUrl uses this site's structure: /news/[slug]
 */

import type { Article, ArticleWithRelations } from './types';

export function getArticleUrl(
  article:
    | Article
    | ArticleWithRelations
    | { slug: string; article_type?: string; article_category?: { slug: string } | null; article_place?: unknown[] }
): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/+$/, '');
  return `${base}/news/${article.slug}`;
}
