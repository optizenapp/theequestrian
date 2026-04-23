import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateCache } from '@/lib/content/collections';
import { invalidateBrandContentCache } from '@/lib/content/brand-content';

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
    revalidatePath(raw);

    return NextResponse.json({ ok: true, revalidated: raw });
  } catch (error) {
    console.error('[internal-revalidate-collection]', error);
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
