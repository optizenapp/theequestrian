import { sql } from '@vercel/postgres';
import { getManualRedirect } from '@/lib/redirects/manual';
import { collectionRedirects } from '@/lib/redirects/maps';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';

type Suggestion = {
  to: string;
  type: string;
  reason: 'manual' | 'product' | 'collection' | 'category';
  confidence: number;
  status?: 'manual' | 'pending';
};

const normalizePath = (value: string) => {
  if (!value) return '/';
  const trimmed = value.trim();
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
};

const extractProductHandle = (path: string) => {
  const match = path.match(/\/products\/([^/?#]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
};

const getLastSegment = (value: string) => {
  const withoutQuery = value.split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/').filter(Boolean);
  return parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
};

const findBestCategoryMatch = async (segment: string) => {
  const result = await sql`
    SELECT url_path
    FROM collection_content
    WHERE url_path ILIKE ${`%/${segment}`}
       OR url_path ILIKE ${`/${segment}`}
    ORDER BY LENGTH(url_path) ASC
    LIMIT 1
  `;
  return result.rows[0]?.url_path ?? null;
};

export async function suggestRedirectForPath(path: string): Promise<Suggestion | null> {
  const normalized = normalizePath(path);
  const lower = normalized.toLowerCase();
  if (lower.includes('liquid error') || lower.includes('font_url')) {
    return null;
  }

  const manual = await getManualRedirect(normalized);
  if (manual) {
    return {
      to: manual.to,
      type: manual.type || '301',
      reason: 'manual',
      confidence: 1,
      status: 'manual',
    };
  }

  const productHandle = extractProductHandle(normalized);
  if (productHandle) {
    const product = await getProductByHandle(productHandle);
    if (product) {
      const canonical = await getProductCanonicalUrl(product);
      if (canonical.startsWith('/products/')) {
        return null;
      }
      return {
        to: canonical,
        type: '301',
        reason: 'product',
        confidence: 0.95,
      };
    }
  }

  if (normalized.startsWith('/collections/')) {
    const mapped = collectionRedirects[normalized];
    if (mapped) {
      return {
        to: mapped,
        type: '301',
        reason: 'collection',
        confidence: 0.85,
      };
    }
  }

  const lastSegment = getLastSegment(normalized);
  if (lastSegment) {
    const categoryMatch = await findBestCategoryMatch(lastSegment);
    if (categoryMatch) {
      return {
        to: categoryMatch,
        type: '301',
        reason: 'category',
        confidence: 0.65,
      };
    }
  }

  return null;
}
