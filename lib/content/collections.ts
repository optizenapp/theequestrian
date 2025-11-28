/**
 * Content Management for Collections and Subcollections
 * 
 * Handles rich content from Shopify metafields with fallback to basic descriptions
 */

import type { CollectionWithParent } from '@/types/shopify';

export interface CollectionContent {
  html: string | null;
  seoDescription: string | null;
  featuredLinks: Array<{
    type: 'product' | 'collection';
    handle: string;
    text: string;
  }>;
}

/**
 * Extract content from collection metafields
 * Priority: page_content metafield > description > null
 */
export function getCollectionContent(
  collection: CollectionWithParent
): CollectionContent {
  // Get page content (rich HTML)
  const pageContent = collection.pageContent || 
    (collection.metafields?.find(
      m => m.namespace === 'custom' && m.key === 'page_content'
    )?.value) ||
    null;

  // Get SEO description
  const seoDescription = collection.seoDescription ||
    (collection.metafields?.find(
      m => m.namespace === 'custom' && m.key === 'seo_description'
    )?.value) ||
    collection.description ||
    null;

  // Get featured links
  const featuredLinksJson = collection.featuredLinks ||
    (collection.metafields?.find(
      m => m.namespace === 'custom' && m.key === 'featured_links'
    )?.value);

  let featuredLinks: CollectionContent['featuredLinks'] = [];
  
  if (Array.isArray(featuredLinksJson)) {
    // Already parsed
    featuredLinks = featuredLinksJson;
  } else if (typeof featuredLinksJson === 'string') {
    // Parse JSON string
    try {
      featuredLinks = JSON.parse(featuredLinksJson);
    } catch (e) {
      console.error('Error parsing featured links:', e);
      featuredLinks = [];
    }
  }

  // Fallback: use description as HTML if no page content
  const html = pageContent || (collection.description ? `<p>${collection.description}</p>` : null);

  return {
    html,
    seoDescription,
    featuredLinks,
  };
}

/**
 * Sanitize HTML content (basic XSS protection)
 * In production, consider using DOMPurify or similar
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Process internal links in HTML content
 * Converts relative URLs to proper Next.js links
 */
export function processInternalLinks(html: string): string {
  // This is a placeholder - in a real implementation, you might want to:
  // 1. Parse HTML
  // 2. Find all <a> tags with relative URLs
  // 3. Ensure they're properly formatted
  // For now, we'll just return the HTML as-is
  // The Next.js Link component will handle relative URLs correctly
  
  return html;
}
