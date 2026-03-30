import { NextResponse } from 'next/server';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';

const MAX_HANDLES = 80;

/**
 * POST { handles: string[] } → { hrefs: Record<string, string> }
 * Used by client components (cart drawer, reviews) that only have handles.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { handles?: unknown };
    const raw = Array.isArray(body.handles) ? body.handles : [];
    const handles = raw
      .filter((h): h is string => typeof h === 'string' && h.length > 0)
      .map((h) => h.trim())
      .slice(0, MAX_HANDLES);

    if (handles.length === 0) {
      return NextResponse.json({ hrefs: {} });
    }

    const hrefs = await getCanonicalHrefByHandles(handles);
    return NextResponse.json({ hrefs });
  } catch (e) {
    console.error('[canonical-hrefs]', e);
    return NextResponse.json({ error: 'Failed to resolve product URLs' }, { status: 500 });
  }
}
