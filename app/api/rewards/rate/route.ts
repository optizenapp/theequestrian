import { NextResponse } from 'next/server';
import { getRewardsSettings } from '@/lib/rewards/settings';

export const runtime = 'nodejs';
export const preferredRegion = 'syd1';
export const dynamic = 'force-dynamic';

const CACHE = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

/** Public, CDN-cached: product pages only need to know whether to show the earn line and at what rate. */
export async function GET() {
  try {
    const settings = await getRewardsSettings();
    const enabled = settings.estimateEnabled && settings.rateBps > 0;
    return NextResponse.json({ enabled, rateBps: enabled ? settings.rateBps : 0 }, { headers: CACHE });
  } catch (error) {
    console.error('[rewards/rate] Failed to load rewards rate:', error);
    return NextResponse.json({ enabled: false, rateBps: 0 }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
