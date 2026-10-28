import { NextRequest, NextResponse } from 'next/server';
import { applyCollectivePriceResync, planCollectivePriceResync } from '@/lib/collective/price-resync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Leave headroom under maxDuration for the response. */
const APPLY_BUDGET_MS = 270_000;

function authorizeCron(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) return true;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return token === envSecret || headerSecret === envSecret;
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/**
 * Daily: set every Shopify Collective variant price to the supplier's retail price
 * (Collective cost ÷ vendor margin). `?dryRun=1` plans without writing.
 */
async function handle(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const startedAt = Date.now();
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const { rows, summary } = await planCollectivePriceResync();
    const planned = rows.filter((r) => r.action === 'update');
    const result = dryRun
      ? { applied: 0, failed: 0, remaining: planned.length, errors: [] as string[] }
      : await applyCollectivePriceResync(rows, { deadline: startedAt + APPLY_BUDGET_MS });

    if (result.failed > 0 || result.remaining > 0) {
      console.warn('[collective-price-sync]', { planned: planned.length, ...result, errors: result.errors.slice(0, 10) });
    }
    return NextResponse.json({
      ok: result.failed === 0,
      dryRun,
      planned: planned.length,
      applied: result.applied,
      failed: result.failed,
      remaining: result.remaining,
      errors: result.errors.slice(0, 20),
      changes: planned.slice(0, 200).map((r) => ({
        vendor: r.vendor,
        handle: r.handle,
        variantId: r.variantId,
        from: r.currentPrice,
        to: r.targetPrice,
      })),
      summary,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('[collective-price-sync] failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Collective price sync failed' },
      { status: 500 }
    );
  }
}
