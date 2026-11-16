import { NextRequest, NextResponse } from 'next/server';
import { getProductByHandle } from '@/lib/shopify/products';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'syd1';

export async function GET(request: NextRequest) {
  try {
    const handle = request.nextUrl.searchParams.get('handle')?.trim() || '';
    if (!handle) {
      return NextResponse.json({ error: 'handle required' }, { status: 400 });
    }

    const product = await getProductByHandle(handle);
    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const hrefs = await getCanonicalHrefByHandles([product.handle]);
    return NextResponse.json({
      product,
      productHref: hrefs[product.handle] ?? `/products/${product.handle}`,
    });
  } catch (error) {
    console.error('[api/products/quick-view]', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}