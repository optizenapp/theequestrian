const DEFAULT_SITE_URL = 'https://www.theequestrian.com.au';

export interface FaqItem {
  question: string;
  answer: string;
}

interface WebPageSchemaInput {
  path: string;
  title: string;
  description: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'SearchResultsPage' | 'ProfilePage';
  lastReviewed?: string;
}

interface BlogListArticle {
  title: string;
  handle: string;
  excerpt?: string | null;
  publishedAt?: string;
  imageUrl?: string | null;
  authorName?: string | null;
}

interface BrandListItem {
  name: string;
  handle: string;
}

function getSiteUrl(siteUrl?: string): string {
  return (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function toAbsoluteUrl(path: string, siteUrl?: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl(siteUrl)}${normalizedPath}`;
}

function buildOrganizationEntity(siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  return {
    '@type': 'OnlineStore',
    '@id': `${baseUrl}#organization`,
    name: 'The Equestrian',
    legalName: 'Equine Marketplace Pty Ltd',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/logo.png`,
    },
    email: 'support@theequestrian.com.au',
    telephone: '+61 419 851 891',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '41B Luck St',
      addressLocality: 'Macclesfield',
      addressRegion: 'South Australia',
      postalCode: '5153',
      addressCountry: 'AU',
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      '@id': `${baseUrl}#return-policy`,
      applicableCountry: 'AU',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 30,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
      refundType: 'https://schema.org/FullRefund',
      returnPolicyCountry: 'AU',
    },
  };
}

function buildBreadcrumbSchema(path: string, label: string, siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  const pageUrl = toAbsoluteUrl(path, siteUrl);
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: pageUrl,
      },
    ],
  };
}

export function generateWebPageSchema(input: WebPageSchemaInput, siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  const pageUrl = toAbsoluteUrl(input.path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@type': input.type || 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.title,
    description: input.description,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${baseUrl}#website`,
      url: baseUrl,
      name: 'The Equestrian',
    },
    publisher: {
      '@id': `${baseUrl}#organization`,
    },
    inLanguage: 'en-AU',
    ...(input.lastReviewed ? { lastReviewed: input.lastReviewed } : {}),
  };
}

export function generatePolicyPageSchema(input: WebPageSchemaInput, siteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(input.path, input.title, siteUrl),
      generateWebPageSchema(input, siteUrl),
    ],
  };
}

export function generateFaqPageSchema(path: string, title: string, description: string, faqs: FaqItem[], siteUrl?: string) {
  const pageSchema = generateWebPageSchema(
    {
      path,
      title,
      description,
      type: 'WebPage',
    },
    siteUrl
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      pageSchema,
      {
        '@type': 'FAQPage',
        '@id': `${toAbsoluteUrl(path, siteUrl)}#faqpage`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export function generateAboutPageSchema(path: string, title: string, description: string, siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  const pageUrl = toAbsoluteUrl(path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      generateWebPageSchema(
        {
          path,
          title,
          description,
          type: 'AboutPage',
        },
        siteUrl
      ),
      {
        '@type': 'LocalBusiness',
        '@id': `${baseUrl}#localbusiness`,
        name: 'The Equestrian',
        url: baseUrl,
        image: `${baseUrl}/logo.png`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: '41B Luck St',
          addressLocality: 'Macclesfield',
          addressRegion: 'South Australia',
          postalCode: '5153',
          addressCountry: 'AU',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@theequestrian.com.au',
          telephone: '+61 419 851 891',
          areaServed: 'AU',
          availableLanguage: ['en'],
        },
        mainEntityOfPage: {
          '@id': `${pageUrl}#webpage`,
        },
      },
    ],
  };
}

export function generateContactPageSchema(path: string, title: string, description: string, siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      generateWebPageSchema(
        {
          path,
          title,
          description,
          type: 'ContactPage',
        },
        siteUrl
      ),
      {
        '@type': 'ContactPoint',
        '@id': `${toAbsoluteUrl(path, siteUrl)}#contactpoint`,
        contactType: 'customer support',
        email: 'support@theequestrian.com.au',
        telephone: '+61 419 851 891',
        areaServed: 'AU',
        availableLanguage: ['en'],
      },
      {
        '@type': 'PostalAddress',
        '@id': `${baseUrl}#postaladdress`,
        streetAddress: '41B Luck St',
        addressLocality: 'Macclesfield',
        addressRegion: 'South Australia',
        postalCode: '5153',
        addressCountry: 'AU',
      },
    ],
  };
}

export function generateBlogIndexSchema(path: string, title: string, description: string, articles: BlogListArticle[], siteUrl?: string) {
  const pageUrl = toAbsoluteUrl(path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      generateWebPageSchema(
        {
          path,
          title,
          description,
          type: 'CollectionPage',
        },
        siteUrl
      ),
      {
        '@type': 'Blog',
        '@id': `${pageUrl}#blog`,
        url: pageUrl,
        name: title,
        description,
        publisher: {
          '@id': `${getSiteUrl(siteUrl)}#organization`,
        },
        blogPost: articles.map((article) => ({
          '@type': 'BlogPosting',
          headline: article.title,
          url: toAbsoluteUrl(`/news/${article.handle}`, siteUrl),
          description: article.excerpt || undefined,
          image: article.imageUrl || undefined,
          datePublished: article.publishedAt || undefined,
          author: article.authorName
            ? {
                '@type': 'Person',
                name: article.authorName,
              }
            : undefined,
        })),
      },
    ],
  };
}

export function generateAuthorProfileSchema(
  path: string,
  authorName: string,
  description: string,
  articleHandles: string[],
  siteUrl?: string
) {
  const pageUrl = toAbsoluteUrl(path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, authorName, siteUrl),
      generateWebPageSchema(
        {
          path,
          title: `${authorName} | The Equestrian`,
          description,
          type: 'ProfilePage',
        },
        siteUrl
      ),
      {
        '@type': 'Person',
        '@id': `${pageUrl}#person`,
        name: authorName,
        worksFor: {
          '@id': `${getSiteUrl(siteUrl)}#organization`,
        },
        mainEntityOfPage: {
          '@id': `${pageUrl}#webpage`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#articles`,
        itemListElement: articleHandles.map((handle, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: toAbsoluteUrl(`/news/${handle}`, siteUrl),
        })),
      },
    ],
  };
}

export function generateBrandIndexSchema(path: string, title: string, description: string, brands: BrandListItem[], siteUrl?: string) {
  const pageUrl = toAbsoluteUrl(path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      generateWebPageSchema(
        {
          path,
          title,
          description,
          type: 'CollectionPage',
        },
        siteUrl
      ),
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#brands`,
        numberOfItems: brands.length,
        itemListElement: brands.map((brand, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Brand',
            name: brand.name,
            url: toAbsoluteUrl(`/brands/${brand.handle}`, siteUrl),
          },
        })),
      },
    ],
  };
}

export function generateSearchPageSchema(path: string, title: string, description: string, query?: string, siteUrl?: string) {
  const baseUrl = getSiteUrl(siteUrl);
  const pageUrl = query ? `${toAbsoluteUrl(path, siteUrl)}?q=${encodeURIComponent(query)}` : toAbsoluteUrl(path, siteUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      {
        '@type': 'SearchResultsPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}#website`,
          url: baseUrl,
          name: 'The Equestrian',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${toAbsoluteUrl(path, siteUrl)}?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        inLanguage: 'en-AU',
      },
    ],
  };
}

export function generateSimplePageSchema(path: string, title: string, description: string, siteUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationEntity(siteUrl),
      buildBreadcrumbSchema(path, title, siteUrl),
      generateWebPageSchema(
        {
          path,
          title,
          description,
          type: 'WebPage',
        },
        siteUrl
      ),
    ],
  };
}
