import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export async function GET() {
  try {
    const [contacts, sends, campaigns, sequences] = await Promise.all([
      sql`
        SELECT
          COUNT(*) AS total_contacts,
          COUNT(*) FILTER (WHERE s.status = 'subscribed') AS subscribed_contacts,
          COUNT(*) FILTER (WHERE s.status = 'suppressed') AS suppressed_contacts
        FROM email_contacts c
        LEFT JOIN email_subscriptions s ON s.contact_id = c.id
      `,
      sql`
        SELECT
          (SELECT COUNT(*) FROM email_sends WHERE created_at >= NOW() - INTERVAL '30 days' AND status IN ('sent', 'delivered')) AS sent_count,
          (SELECT COUNT(*) FROM email_sends WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'failed') AS failed_count,
          (SELECT COUNT(*) FROM email_sends WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'scheduled') AS scheduled_count
      `,
      sql`
        SELECT id, name, status, scheduled_at, updated_at
        FROM email_campaigns
        ORDER BY updated_at DESC
        LIMIT 20
      `,
      sql`
        SELECT id, name, status, trigger_type, updated_at
        FROM email_sequences
        ORDER BY updated_at DESC
        LIMIT 20
      `,
    ]);

    return NextResponse.json({
      status: 'ok',
      summary: {
        contacts: Number(contacts.rows[0]?.total_contacts || 0),
        subscribed: Number(contacts.rows[0]?.subscribed_contacts || 0),
        suppressed: Number(contacts.rows[0]?.suppressed_contacts || 0),
        sent30d: Number(sends.rows[0]?.sent_count || 0),
        failed30d: Number(sends.rows[0]?.failed_count || 0),
        scheduled30d: Number(sends.rows[0]?.scheduled_count || 0),
      },
      campaigns: campaigns.rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        status: row.status as string,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at as string).toISOString() : null,
        updatedAt: new Date(row.updated_at as string).toISOString(),
      })),
      sequences: sequences.rows.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        status: row.status as string,
        triggerType: row.trigger_type as string,
        updatedAt: new Date(row.updated_at as string).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to load email platform summary:', error);
    return NextResponse.json({ error: 'Failed to load email platform summary' }, { status: 500 });
  }
}
