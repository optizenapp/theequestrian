import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateIso = startDate.toISOString();

    // Get total stats
    const totalStats = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(DISTINCT customer_email) as unique_recipients
      FROM review_email_sends
      WHERE created_at >= ${startDateIso}
    `;

    // Get recent sends (last 50)
    const recentSends = await sql`
      SELECT 
        id,
        order_id,
        order_number,
        customer_email,
        customer_name,
        product_title,
        scheduled_at,
        sent_at,
        cancelled_at,
        cancel_reason,
        status,
        error_message,
        created_at
      FROM review_email_sends
      WHERE created_at >= ${startDateIso}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Get stats by day for the last 30 days
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM review_email_sends
      WHERE created_at >= ${startDateIso}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return NextResponse.json({
      total: {
        sent: parseInt(totalStats.rows[0]?.sent_count || '0', 10),
        scheduled: parseInt(totalStats.rows[0]?.scheduled_count || '0', 10),
        cancelled: parseInt(totalStats.rows[0]?.cancelled_count || '0', 10),
        failed: parseInt(totalStats.rows[0]?.failed_count || '0', 10),
        total: parseInt(totalStats.rows[0]?.total_sent || '0', 10),
        uniqueRecipients: parseInt(totalStats.rows[0]?.unique_recipients || '0', 10),
      },
      recent: recentSends.rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        orderNumber: row.order_number,
        customerEmail: row.customer_email,
        customerName: row.customer_name,
        productTitle: row.product_title,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
        sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
        cancelReason: row.cancel_reason,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      daily: dailyStats.rows.map((row) => ({
        date: row.date,
        count: parseInt(row.count || '0', 10),
        sent: parseInt(row.sent || '0', 10),
        scheduled: parseInt(row.scheduled || '0', 10),
        cancelled: parseInt(row.cancelled || '0', 10),
        failed: parseInt(row.failed || '0', 10),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email stats' },
      { status: 500 }
    );
  }
}
