import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { syncQueuedGa4PurchaseEvents } from '@/lib/analytics/ga4-sync';

/**
 * GA4 Purchase Event Sync
 * 
 * Fetches queued purchase events and sends them to GA4 via Measurement Protocol.
 * Run this as a cron job or manually from admin dashboard.
 * 
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

export async function POST() {
  try {
    const syncResult = await syncQueuedGa4PurchaseEvents(100);
    if (syncResult.attempted === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to sync',
        synced: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResult.synced} purchase events to GA4`,
      synced: syncResult.synced,
      attempted: syncResult.attempted,
      failed: syncResult.failedCount,
    });
  } catch (error) {
    console.error('GA4 sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync GA4 events' },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET() {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE sent_to_ga4 = FALSE) as pending,
        COUNT(*) FILTER (WHERE sent_to_ga4 = TRUE) as sent,
        COUNT(*) as total
      FROM ga4_purchase_events
    `;

    return NextResponse.json({
      pending: parseInt(stats.rows[0].pending || '0'),
      sent: parseInt(stats.rows[0].sent || '0'),
      total: parseInt(stats.rows[0].total || '0'),
    });
  } catch (error) {
    console.error('GA4 stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get GA4 stats' },
      { status: 500 }
    );
  }
}
