import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export const maxDuration = 30;

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

    // Recipient counts stay on recipients (avoids inflation when a contact has multiple sends).
    // Open/click/delivered counts come from email_sends for the campaign.
    const totals = await sql`
      SELECT
        (SELECT COUNT(*)::int
           FROM email_campaign_recipients r
          WHERE r.campaign_id = ${id}
            AND r.status IN ('sent', 'delivered', 'failed', 'cancelled')) AS sent_count,
        (SELECT COUNT(*)::int
           FROM email_campaign_recipients r
          WHERE r.campaign_id = ${id}
            AND r.status = 'queued') AS remaining_queued,
        (SELECT COUNT(*)::int
           FROM email_sends s
           JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
          WHERE r.campaign_id = ${id}
            AND s.status = 'delivered') AS delivered_count,
        (SELECT COUNT(*)::int
           FROM email_sends s
           JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
          WHERE r.campaign_id = ${id}
            AND s.opened_at IS NOT NULL) AS unique_opened_count,
        (SELECT COALESCE(SUM(s.open_count), 0)::int
           FROM email_sends s
           JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
          WHERE r.campaign_id = ${id}) AS total_open_count,
        (SELECT COUNT(*)::int
           FROM email_sends s
           JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
          WHERE r.campaign_id = ${id}
            AND s.clicked_at IS NOT NULL) AS unique_clicked_count,
        (SELECT COALESCE(SUM(s.click_count), 0)::int
           FROM email_sends s
           JOIN email_campaign_recipients r ON r.id = s.campaign_recipient_id
          WHERE r.campaign_id = ${id}) AS total_click_count
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
