import { NextResponse } from 'next/server';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { sql } from '@vercel/postgres';

const normalizePath = (value: string) => {
  if (!value) return '/';
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return `/${trimmed}`;
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1);
  return trimmed;
};

const getLastSegment = (value: string) => {
  const withoutQuery = value.split('?')[0];
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body?.path === 'string' ? body.path : '';
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const lastSegment = getLastSegment(path);
    if (!lastSegment) {
      return NextResponse.json({ error: 'No slug found in path' }, { status: 400 });
    }

    const product = await getProductByHandle(lastSegment);
    if (!product) {
      const categoryMatch = await findBestCategoryMatch(lastSegment);
      if (!categoryMatch) {
        return NextResponse.json({ error: 'No matching product or category found' }, { status: 404 });
      }
      const from = normalizePath(path);
      const to = normalizePath(categoryMatch);
      if (from === to) {
        return NextResponse.json({ error: 'Already canonical' }, { status: 400 });
      }
      return NextResponse.json({
        redirect: { from, to, reason: 'category' },
      });
    }

    const canonical = await getProductCanonicalUrl(product);
    const from = normalizePath(path);
    const to = normalizePath(canonical);

    if (to.startsWith('/products/')) {
      return NextResponse.json(
        { error: 'Product is not mapped to a category yet' },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json({ error: 'Already canonical' }, { status: 400 });
    }

    return NextResponse.json({
      redirect: { from, to, reason: 'product' },
    });
  } catch (error) {
    console.error('Redirect attempt error:', error);
    return NextResponse.json({ error: 'Failed to attempt match' }, { status: 500 });
  }
}
