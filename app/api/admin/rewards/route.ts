import { NextRequest, NextResponse } from 'next/server';
import { getRecentRewardOrders, getRewardsSummary } from '@/lib/rewards/admin-report';
import { reconcileOrderRewards } from '@/lib/rewards/reconcile';
import { getRewardsSettings, updateRewardsSettings, type RewardsSettingsUpdate } from '@/lib/rewards/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settings, summary, orders] = await Promise.all([
      getRewardsSettings(),
      getRewardsSummary(),
      getRecentRewardOrders(50),
    ]);
    return NextResponse.json({ settings, summary, orders });
  } catch (error) {
    console.error('[admin/rewards] Failed to load report:', error);
    return NextResponse.json({ error: 'Failed to load rewards report' }, { status: 500 });
  }
}

function parseSettingsUpdate(body: unknown): RewardsSettingsUpdate | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  const update: RewardsSettingsUpdate = {};
  if (typeof input.recordingEnabled === 'boolean') update.recordingEnabled = input.recordingEnabled;
  if (typeof input.estimateEnabled === 'boolean') update.estimateEnabled = input.estimateEnabled;
  if (typeof input.issuanceEnabled === 'boolean') update.issuanceEnabled = input.issuanceEnabled;
  if (typeof input.rateBps === 'number') update.rateBps = input.rateBps;
  return Object.keys(update).length > 0 ? update : null;
}

export async function PATCH(request: NextRequest) {
  try {
    const update = parseSettingsUpdate(await request.json());
    if (!update) {
      return NextResponse.json({ error: 'No valid settings supplied' }, { status: 400 });
    }
    const settings = await updateRewardsSettings(update);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[admin/rewards] Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

/** Manually re-checks one order against Shopify, e.g. after a missed webhook. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: unknown };
    const raw = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const numeric = raw.replace(/^gid:\/\/shopify\/Order\//, '');
    if (!/^\d+$/.test(numeric)) {
      return NextResponse.json({ error: 'orderId must be a Shopify order ID' }, { status: 400 });
    }
    const outcome = await reconcileOrderRewards(`gid://shopify/Order/${numeric}`);
    return NextResponse.json({ outcome });
  } catch (error) {
    console.error('[admin/rewards] Manual reconcile failed:', error);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}
