import { NextRequest, NextResponse } from 'next/server';
import { resolveCartUpsells } from '@/lib/cart-upsells/resolve';
import type { CartUpsellCartItem } from '@/lib/cart-upsells/types';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'syd1';

function parseCartItems(body: unknown): CartUpsellCartItem[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as { items?: unknown }).items;
  if (!Array.isArray(raw)) return [];
  const items: CartUpsellCartItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const handle = typeof r.handle === 'string' ? r.handle.trim() : '';
    if (!handle) continue;
    items.push({
      handle,
      productType: typeof r.productType === 'string' ? r.productType : '',
      vendor: typeof r.vendor === 'string' ? r.vendor : '',
      price: typeof r.price === 'number' ? r.price : parseFloat(String(r.price ?? '0')) || 0,
    });
  }
  return items;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = parseCartItems(body);
    const limit =
      typeof (body as { limit?: unknown }).limit === 'number'
        ? Math.min(6, Math.max(1, (body as { limit: number }).limit))
        : 3;

    const result = await resolveCartUpsells(items, limit);
    const productHrefByHandle = await getCanonicalHrefByHandles(
      result.products.map((p) => p.handle)
    );

    return NextResponse.json({ ...result, productHrefByHandle });
  } catch (error) {
    console.error('[api/cart/upsells]', error);
    return NextResponse.json(
      { products: [], headline: '', source: 'empty', offerId: null, productHrefByHandle: {} },
      { status: 200 }
    );
  }
}