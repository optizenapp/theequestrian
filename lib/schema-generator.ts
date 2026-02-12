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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au').replace(/\/+$/, '');
  const articleUrl = `${siteUrl}/news/${article.handle}`;
  const authorSlug = article.author.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

  const wordCount = article.contentHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'News', item: `${siteUrl}/news` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
      {
        '@type': 'BlogPosting',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: article.excerpt || article.seo?.description || '',
        image: article.image
          ? {
              '@type': 'ImageObject',
              url: article.image.url,
              width: article.image.width,
              height: article.image.height,
            }
          : undefined,
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
        wordCount,
        inLanguage: 'en-AU',
        author: {
          '@type': 'Person',
          '@id': `${siteUrl}/news/author/${authorSlug}#person`,
          name: article.author.name,
          url: `${siteUrl}/news/author/${authorSlug}`,
        },
        publisher: {
          '@id': `${siteUrl}#organization`,
        },
        isPartOf: { '@id': `${siteUrl}/news#blog` },
        mainEntityOfPage: articleUrl,
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
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['article h1', '.article-content h2'],
        },
      },
    ],
  };

  if (!(schema as any)['@graph'][1].image) {
    delete (schema as any)['@graph'][1].image;
  }

  if (!(schema as any)['@graph'][1].wordCount) {
    delete (schema as any)['@graph'][1].wordCount;
  }

  if (!(schema as any)['@graph'][1].mentions) {
    delete (schema as any)['@graph'][1].mentions;
  }

  if (!(schema as any)['@graph'][1].citation) {
    delete (schema as any)['@graph'][1].citation;
  }

  if (!(schema as any)['@graph'][1].about) {
    delete (schema as any)['@graph'][1].about;
  }

  if (!(schema as any)['@graph'][1].articleSection) {
    delete (schema as any)['@graph'][1].articleSection;
  }

  if (!(schema as any)['@graph'][1].keywords) {
    delete (schema as any)['@graph'][1].keywords;
  }

  if (!(schema as any)['@graph'][1].speakable) {
    delete (schema as any)['@graph'][1].speakable;
  }

  if (!(schema as any)['@graph'][1].description) {
    delete (schema as any)['@graph'][1].description;
  }

  if (!(schema as any)['@graph'][1].dateModified) {
    delete (schema as any)['@graph'][1].dateModified;
  }

  if (!(schema as any)['@graph'][1].datePublished) {
    delete (schema as any)['@graph'][1].datePublished;
  }

  if (!(schema as any)['@graph'][1].headline) {
    delete (schema as any)['@graph'][1].headline;
  }

  if (!(schema as any)['@graph'][1].mainEntityOfPage) {
    delete (schema as any)['@graph'][1].mainEntityOfPage;
  }

  if (!(schema as any)['@graph'][1].author) {
    delete (schema as any)['@graph'][1].author;
  }

  if (!(schema as any)['@graph'][1].publisher) {
    delete (schema as any)['@graph'][1].publisher;
  }

  if (!(schema as any)['@graph'][1].isPartOf) {
    delete (schema as any)['@graph'][1].isPartOf;
  }

  if (!(schema as any)['@graph'][1].inLanguage) {
    delete (schema as any)['@graph'][1].inLanguage;
  }

  if (!(schema as any)['@graph'][1]['@id']) {
    delete (schema as any)['@graph'][1]['@id'];
  }

  if (!(schema as any)['@graph'][1]['@type']) {
    delete (schema as any)['@graph'][1]['@type'];
  }

  if (!(schema as any)['@graph'][0].itemListElement?.length) {
    delete (schema as any)['@graph'][0];
  }

  if (!(schema as any)['@graph'][0]) {
    (schema as any)['@graph'] = (schema as any)['@graph'].slice(1);
  }

  if (!(schema as any)['@graph']?.length) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
    },
  };
  }

  return JSON.parse(JSON.stringify(schema));
}

