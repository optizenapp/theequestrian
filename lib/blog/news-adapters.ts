import type { NewsArticleDetail, NewsArticleListItem } from '@/lib/articles/news-public';
import type { BlogCardArticle } from '@/components/blog/BlogCard';
import type { ArticleSchemaInput } from '@/lib/schema-generator';
import type { BlogCommerceArticleInput } from './article-commerce';

export function listItemToBlogCardArticle(item: NewsArticleListItem): BlogCardArticle {
  return {
    id: item.article_id,
    handle: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    publishedAt: item.published_at || new Date(0).toISOString(),
    author: { name: item.author_name?.trim() || 'The Equestrian' },
    image: item.featured_image_url
      ? {
          url: item.featured_image_url,
          altText: item.featured_image_alt,
        }
      : null,
  };
}

export function detailToCommerceInput(
  detail: NewsArticleDetail,
  embeddedRelatedHandlesRaw?: string | null,
  ctaPathHint: string | null = null
): BlogCommerceArticleInput {
  const mergedHandles = [
    ...new Set(
      [
        ...(detail.headless_related_handles || '')
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        ...(embeddedRelatedHandlesRaw || '')
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ].filter(Boolean)
    ),
  ];

  return {
    title: detail.title,
    tags: detail.tag_names,
    headless: {
      ctaPath: detail.headless_cta_path || ctaPathHint,
      ctaLabel: detail.headless_cta_label,
      relatedHandlesRaw: mergedHandles.length > 0 ? mergedHandles.join(', ') : null,
    },
  };
}

export function detailToArticleSchemaInput(
  detail: NewsArticleDetail,
  contentHtml: string
): ArticleSchemaInput {
  return {
    handle: detail.slug,
    title: detail.title,
    contentHtml,
    excerpt: detail.excerpt,
    publishedAt: detail.published_at || new Date(0).toISOString(),
    dateModified: detail.updated_at || detail.published_at || undefined,
    tags: detail.tag_names,
    author: { name: detail.author_name?.trim() || 'The Equestrian' },
    image: detail.featured_image_url
      ? {
          url: detail.featured_image_url,
          altText: detail.featured_image_alt,
        }
      : null,
    seo: {
      title: detail.meta_title ?? undefined,
      description: detail.meta_description ?? undefined,
    },
  };
}
