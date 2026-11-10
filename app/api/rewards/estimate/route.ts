import { NextRequest, NextResponse } from 'next/server';
import { estimateCartRewards } from '@/lib/rewards/cart-estimate';
import { getRewardsSettings } from '@/lib/rewards/settings';

export const runtime = 'nodejs';
export const preferredRegion = 'syd1';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const CART_ID = /^gid:\/\/shopify\/Cart\/[A-Za-z0-9_-]+(\?key=[A-Za-z0-9]+)?$/;

export async function POST(request: NextRequest) {
  let cartId = '';
  try {
    const body = (await request.json()) as { cartId?: unknown };
    cartId = typeof body.cartId === 'string' ? body.cartId.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE });
  }
  if (!CART_ID.test(cartId)) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400, headers: NO_STORE });
  }

  try {
    const settings = await getRewardsSettings();
    if (!settings.estimateEnabled) {
      return NextResponse.json({ enabled: false }, { headers: NO_STORE });
    }
    const estimate = await estimateCartRewards(cartId, settings.rateBps);
    return NextResponse.json({ enabled: estimate !== null, estimate }, { headers: NO_STORE });
  } catch (error) {
    console.error('[rewards/estimate] Failed to estimate cart rewards:', error);
    return NextResponse.json({ error: 'Estimate unavailable' }, { status: 502, headers: NO_STORE });
  }
}
