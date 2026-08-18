import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateCache } from '@/lib/content/collections';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';
import { CATEGORY_PRODUCT_LISTINGS_CACHE_TAG } from '@/lib/config/collection-cache';
import { invalidateCategoryAllocationCaches } from '@/lib/db/product-allocations';

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  if (!configuredSecret) return false;
  return request.headers.get('x-revalidate-secret') === configuredSecret;
}

/**
 * Bust ISR + in-memory collection content after direct DB updates (e.g. run-page-seo-update.ts).
 * POST body: { "path": "/horse/rugs/winter" }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { path?: string };
    const raw = typeof body?.path === 'string' ? body.path.trim() : '';
    if (!raw || !raw.startsWith('/')) {
      return NextResponse.json({ error: 'body.path must be a path starting with /' }, { status: 400 });
    }

    invalidateCache();
    invalidateBrandContentCache();
    invalidateCategoryAllocationCaches();
    // Collection grids use unstable_cache tagged with CATEGORY_PRODUCT_LISTINGS_CACHE_TAG
    revalidateTag(CATEGORY_PRODUCT_LISTINGS_CACHE_TAG, 'max');
    revalidatePath(raw);
    revalidatePath(raw, 'page');

    return NextResponse.json({ ok: true, revalidated: raw, tag: CATEGORY_PRODUCT_LISTINGS_CACHE_TAG });
  } catch (error) {
    console.error('[internal-revalidate-collection]', error);
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
