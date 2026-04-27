import { NextRequest, NextResponse } from 'next/server';
import { enforceAllPriceLocks } from '@/lib/inventory/price-locks/enforce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Watchdog: scans marketplace_price_locks every few minutes. Any locked
 * variant whose live Shopify price has drifted from the recorded value is
 * snapped back to the locked price via the Admin API.
 *
 * Authorization (any one):
 *  - Authorization: Bearer <CRON_SECRET>
 *  - x-cron-secret: <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    const headerSecret = request.headers.get('x-cron-secret')?.trim();
    if (bearer !== expected && headerSecret !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await enforceAllPriceLocks();
    if (result.reverted > 0) {
      console.log(
        `[cron:enforce-price-locks] reverted=${result.reverted} unchanged=${result.unchanged} errors=${result.errors}`
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron:enforce-price-locks] failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'enforce_failed',
      },
      { status: 500 }
    );
  }
}
