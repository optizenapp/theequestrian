import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const ensureNotFoundTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_events (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

const ensureNotFoundDailyTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS not_found_daily (
      day DATE PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const today = new Date();
    const defaultStart = addDays(today, -7);
    const dateRange =
      startDate && endDate && isIsoDate(startDate) && isIsoDate(endDate)
        ? { startDate, endDate }
        : { startDate: formatIsoDate(defaultStart), endDate: formatIsoDate(today) };

    await ensureNotFoundTable();
    await ensureNotFoundDailyTable();

    const internalTop = await sql`
      SELECT path,
             COUNT(*)::int as hits,
             MAX(created_at) as last_seen
      FROM not_found_events
      WHERE created_at >= ${dateRange.startDate}::date
        AND created_at < (${dateRange.endDate}::date + INTERVAL '1 day')
      GROUP BY path
      ORDER BY hits DESC
      LIMIT 20
    `;

    const internalTotal = await sql`
      SELECT COUNT(*)::int as total
      FROM not_found_events
      WHERE created_at >= ${dateRange.startDate}::date
        AND created_at < (${dateRange.endDate}::date + INTERVAL '1 day')
    `;

    const internalRecent = await sql`
      SELECT path,
             referrer,
             COUNT(*)::int as hits,
             MAX(created_at) as last_seen
      FROM not_found_events
      WHERE created_at >= ${dateRange.startDate}::date
        AND created_at < (${dateRange.endDate}::date + INTERVAL '1 day')
      GROUP BY path, referrer
      ORDER BY last_seen DESC
      LIMIT 50
    `;

    const dailyRollup = await sql`
      SELECT day, hits
      FROM not_found_daily
      WHERE day >= ${dateRange.startDate}::date
        AND day <= ${dateRange.endDate}::date
      ORDER BY day ASC
    `;

    const dailyFromEvents = await sql`
      SELECT DATE(created_at) as day, COUNT(*)::int as hits
      FROM not_found_events
      WHERE created_at >= ${dateRange.startDate}::date
        AND created_at < (${dateRange.endDate}::date + INTERVAL '1 day')
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    let ga4Top: Array<{ path: string; views: number; users: number }> = [];
    let ga4Total = 0;
    const propertyId = process.env.GA4_PROPERTY_ID;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (propertyId && serviceAccountKey) {
      const client = new BetaAnalyticsDataClient({
        credentials: JSON.parse(serviceAccountKey),
      });
      const property = `properties/${propertyId}`;
      const [ga4Report] = await client.runReport({
        property,
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'pageTitle',
                  stringFilter: { value: '404', matchType: 'CONTAINS' },
                },
              },
              {
                filter: {
                  fieldName: 'pageTitle',
                  stringFilter: { value: 'Not Found', matchType: 'CONTAINS' },
                },
              },
              {
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: { value: '/404', matchType: 'CONTAINS' },
                },
              },
            ],
          },
        },
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true,
          },
        ],
        limit: 50,
      });

      ga4Top =
        ga4Report.rows?.map((row) => {
          const path = row.dimensionValues?.[0]?.value || '/';
          const views = Number(row.metricValues?.[0]?.value || 0);
          const users = Number(row.metricValues?.[1]?.value || 0);
          return { path, views, users };
        }) ?? [];
      ga4Total = ga4Top.reduce((sum, row) => sum + row.views, 0);
    }

    return NextResponse.json({
      dateRange,
      internalTotal: internalTotal.rows[0]?.total ?? 0,
      internalTop: internalTop.rows,
      internalRecent: internalRecent.rows,
      internalDaily: dailyRollup.rows.length > 0 ? dailyRollup.rows : dailyFromEvents.rows,
      ga4Total,
      ga4Top,
    });
  } catch (error) {
    console.error('404 admin error:', error);
    return NextResponse.json({ error: 'Failed to load 404 data' }, { status: 500 });
  }
}
