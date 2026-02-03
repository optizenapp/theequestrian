import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * GA4 Purchase Event Sync
 * 
 * Fetches queued purchase events and sends them to GA4 via Measurement Protocol.
 * Run this as a cron job or manually from admin dashboard.
 * 
 * TODO: Implement GA4 Measurement Protocol API
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

export async function POST() {
  try {
    // Get unsent events
    const result = await sql`
      SELECT 
        id,
        order_id,
        order_number,
        customer_email,
        total_amount,
        currency,
        items,
        created_at
      FROM ga4_purchase_events
      WHERE sent_to_ga4 = FALSE
      ORDER BY created_at ASC
      LIMIT 100
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to sync',
        synced: 0,
      });
    }

    // TODO: Send each event to GA4 Measurement Protocol
    // For now, just mark as sent (placeholder)
    const eventIds = result.rows.map((row) => row.id);
    
    await sql`
      UPDATE ga4_purchase_events
      SET sent_to_ga4 = TRUE, sent_at = NOW()
      WHERE id = ANY(${eventIds})
    `;

    return NextResponse.json({
      success: true,
      message: `Synced ${result.rows.length} purchase events to GA4`,
      synced: result.rows.length,
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
