import { NextResponse } from 'next/server';
import { syncQueuedGa4PurchaseEvents } from '@/lib/analytics/ga4-sync';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[cron:ga4-sync] Start');
    const result = await syncQueuedGa4PurchaseEvents(200);

    console.log('[cron:ga4-sync] Complete', {
      attempted: result.attempted,
      synced: result.synced,
      failed: result.failedCount,
    });

    return NextResponse.json({
      ok: true,
      attempted: result.attempted,
      synced: result.synced,
      failed: result.failedCount,
    });
  } catch (error) {
    console.error('[cron:ga4-sync] Failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to sync GA4 events',
      },
      { status: 500 }
    );
  }
}

