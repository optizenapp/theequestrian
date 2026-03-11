import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await sql`
      SELECT id, name, status
      FROM email_campaigns
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!campaign.rows[0]) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const totals = await sql`
      SELECT
        COUNT(*) FILTER (WHERE r.status IN ('sent', 'delivered', 'failed', 'cancelled'))::int AS sent_count,
        COUNT(*) FILTER (WHERE r.status = 'queued')::int AS remaining_queued,
        COUNT(*) FILTER (WHERE s.status = 'delivered')::int AS delivered_count,
        COUNT(*) FILTER (WHERE s.opened_at IS NOT NULL)::int AS unique_opened_count,
        COALESCE(SUM(s.open_count), 0)::int AS total_open_count,
        COUNT(*) FILTER (WHERE s.clicked_at IS NOT NULL)::int AS unique_clicked_count,
        COALESCE(SUM(s.click_count), 0)::int AS total_click_count
      FROM email_campaign_recipients r
      LEFT JOIN email_sends s ON s.campaign_recipient_id = r.id
      WHERE r.campaign_id = ${id}
    `;

    const topLinks = await sql`
      SELECT
        lc.clicked_url,
        COUNT(*)::int AS click_count
      FROM email_link_clicks lc
      JOIN email_sends s ON s.id = lc.send_id
      JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
      WHERE r.campaign_id = ${id}
      GROUP BY lc.clicked_url
      ORDER BY click_count DESC, lc.clicked_url ASC
      LIMIT 10
    `;

    const row = totals.rows[0] ?? {};
    const sentCount = toNumber(row.sent_count);
    const remainingQueued = toNumber(row.remaining_queued);
    const deliveredCount = toNumber(row.delivered_count);
    const uniqueOpenedCount = toNumber(row.unique_opened_count);
    const totalOpenCount = toNumber(row.total_open_count);
    const uniqueClickedCount = toNumber(row.unique_clicked_count);
    const totalClickCount = toNumber(row.total_click_count);

    return NextResponse.json({
      campaign: {
        id: campaign.rows[0].id as string,
        name: campaign.rows[0].name as string,
        status: campaign.rows[0].status as string,
      },
      stats: {
        sentCount,
        remainingQueued,
        deliveredCount,
        uniqueOpenedCount,
        totalOpenCount,
        uniqueClickedCount,
        totalClickCount,
        openRate: toRate(uniqueOpenedCount, deliveredCount || sentCount),
        clickRate: toRate(uniqueClickedCount, deliveredCount || sentCount),
        clickToOpenRate: toRate(uniqueClickedCount, uniqueOpenedCount),
      },
      topLinks: topLinks.rows.map((link) => ({
        url: link.clicked_url as string,
        clickCount: toNumber(link.click_count),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch campaign stats:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign stats' }, { status: 500 });
  }
}
