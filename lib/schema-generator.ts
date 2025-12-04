import { ShopifyArticle } from '@/types/shopify';

/**
 * Generate advanced JSON-LD schema for blog articles
 * Based on Google's NLP patents (US9152623B2 and US8636497B2)
 * 
 * Features:
 * - articleSection: Extracted from H2 tags
 * - citation: External links
 * - mentions: Internal links
 * - keywords & about: Derived from tags and title
 * - speakable: For voice assistants
 */

export function generateArticleSchema(article: ShopifyArticle) {
  const siteUrl = 'https://theequestrian.com.au';
  const articleUrl = `${siteUrl}/news/${article.handle}`;

  // Parse contentHtml using regex (server-side compatible)
  const contentHtml = article.contentHtml;

  // Extract H2 tags for articleSection
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const h2Matches = [...contentHtml.matchAll(h2Regex)];
  const articleSections = h2Matches
    .map((match) => match[1].replace(/<[^>]*>/g, '').trim())
    .filter(Boolean);

  // Extract links for citation and mentions
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
  const linkMatches = [...contentHtml.matchAll(linkRegex)];
  const externalLinks: string[] = [];
  const internalLinks: string[] = [];

  linkMatches.forEach((match) => {
    const href = match[1];
    if (href) {
      if (href.startsWith('http') && !href.includes('theequestrian.com.au')) {
        externalLinks.push(href);
      } else if (href.startsWith('/') || href.includes('theequestrian.com.au')) {
        const fullUrl = href.startsWith('/') ? `${siteUrl}${href}` : href;
        internalLinks.push(fullUrl);
      }
    }
  });

  // Generate keywords from tags and title
  const titleWords = article.title
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 3);
  const keywords = [...new Set([...article.tags, ...titleWords])].join(', ');

  // Generate "about" entities from tags
  const aboutEntities = article.tags.map((tag) => ({
    '@type': 'Thing',
    name: tag,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt || article.seo?.description || '',
    image: article.image?.url || '',
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Equestrian',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    // Advanced NLP-based properties
    articleSection: articleSections.length > 0 ? articleSections : undefined,
    keywords: keywords,
    about: aboutEntities.length > 0 ? aboutEntities : undefined,
    citation: externalLinks.length > 0 ? externalLinks : undefined,
    mentions: internalLinks.length > 0 
      ? internalLinks.map((url) => ({
          '@type': 'Thing',
          url: url,
        }))
      : undefined,
    // Speakable for voice assistants
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.article-content h1', '.article-content h2'],
    },
  };

  // Remove undefined properties
  return JSON.parse(JSON.stringify(schema));
}

