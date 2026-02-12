import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { ensureNotFoundRollupTable, upsertNotFoundRollup } from '@/lib/not-found/rollup-store';

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

const ensureGa4RollupTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS ga4_404_rollup (
      path TEXT PRIMARY KEY,
      views INTEGER NOT NULL DEFAULT 0,
      users INTEGER NOT NULL DEFAULT 0,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

const parseServiceAccountCredentials = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is empty');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Common env format stores newlines as escaped "\\n"
    const normalized = trimmed.replace(/\\n/g, '\n');
    return JSON.parse(normalized);
  }
};

export async function GET(request: Request) {
  try {
    const today = new Date();
    const defaultStart = addDays(today, -30);
    const dateRange = {
      startDate: formatIsoDate(defaultStart),
      endDate: formatIsoDate(today),
    };

    await ensureNotFoundTable();
    await ensureNotFoundDailyTable();
    await ensureNotFoundRollupTable();
    await ensureGa4RollupTable();

    const rollupTotals = await sql`
      SELECT COUNT(*)::int as total,
             COALESCE(SUM(hit_count), 0)::int as hits
      FROM not_found_rollup
      WHERE status NOT IN ('auto_applied', 'manual', 'ignored')
    `;

    const rollupRows = await sql`
      SELECT path,
             source,
             hit_count,
             ga4_views,
             first_seen,
             last_seen,
             latest_referrer,
             suggested_to,
             suggested_type,
             confidence,
             suggested_reason,
             status
      FROM not_found_rollup
      ORDER BY last_seen DESC
      LIMIT 500
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

    let ga4Total = 0;
    const propertyId = process.env.GA4_PROPERTY_ID;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (propertyId && serviceAccountKey) {
      try {
        const client = new BetaAnalyticsDataClient({
          credentials: parseServiceAccountCredentials(serviceAccountKey),
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

        const ga4Top =
          ga4Report.rows?.map((row) => {
            const path = row.dimensionValues?.[0]?.value || '/';
            const views = Number(row.metricValues?.[0]?.value || 0);
            const users = Number(row.metricValues?.[1]?.value || 0);
            return { path, views, users };
          }) ?? [];
        ga4Total = ga4Top.reduce((sum, row) => sum + row.views, 0);
        await Promise.all(
          ga4Top.map((row) =>
            upsertNotFoundRollup({
              path: row.path,
              referrer: 'ga4',
              source: 'ga4',
              hitIncrement: 0,
              ga4Views: row.views,
            })
          )
        );
        await Promise.all(
          ga4Top.map((row) =>
            sql`
              INSERT INTO ga4_404_rollup (
                path,
                views,
                users,
                first_seen,
                last_seen,
                updated_at
              )
              VALUES (
                ${row.path},
                ${row.views},
                ${row.users},
                NOW(),
                NOW(),
                NOW()
              )
              ON CONFLICT (path) DO UPDATE
              SET views = EXCLUDED.views,
                  users = EXCLUDED.users,
                  last_seen = NOW(),
                  updated_at = NOW()
            `
          )
        );
      } catch (ga4Error) {
        console.error('404 admin GA4 sync skipped:', ga4Error);
      }
    }

    const ga4RollupTotals = await sql`
      SELECT COUNT(*)::int as total,
             COALESCE(SUM(views), 0)::int as views
      FROM ga4_404_rollup
    `;
    const ga4RollupRows = await sql`
      SELECT path, views, users, last_seen
      FROM ga4_404_rollup
      ORDER BY views DESC
      LIMIT 500
    `;
    ga4Total = ga4RollupTotals.rows[0]?.views ?? ga4Total;

    return NextResponse.json({
      rollupTotal: rollupTotals.rows[0]?.total ?? 0,
      rollupHits: rollupTotals.rows[0]?.hits ?? 0,
      rollup: rollupRows.rows,
      internalDaily: dailyRollup.rows.length > 0 ? dailyRollup.rows : dailyFromEvents.rows,
      ga4Total,
      ga4Rows: ga4RollupRows.rows,
    });
  } catch (error) {
    console.error('404 admin error:', error);
    return NextResponse.json({ error: 'Failed to load 404 data' }, { status: 500 });
  }
}
