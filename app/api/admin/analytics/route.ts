import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

/**
 * GA4 Analytics API
 * 
 * Fetches analytics data from GA4 Data API and purchase event sync status.
 * 
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 * 
 * Required env vars:
 * - GA4_PROPERTY_ID
 * - GOOGLE_SERVICE_ACCOUNT_KEY (JSON)
 */

const toNumber = (value?: string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const diffDays = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};
const normalizeDate = (value?: string | null) => {
  if (!value || value.length !== 8) return value || '';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const compareMode = searchParams.get('compare');
    const today = new Date();
    const defaultStart = addDays(today, -7);
    const dateRange =
      startDate && endDate && isIsoDate(startDate) && isIsoDate(endDate)
        ? { startDate, endDate }
        : { startDate: formatIsoDate(defaultStart), endDate: formatIsoDate(today) };

    const propertyId = process.env.GA4_PROPERTY_ID;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!propertyId || !serviceAccountKey) {
      return NextResponse.json(
        { error: 'GA4 credentials not configured' },
        { status: 503 }
      );
    }

    const client = new BetaAnalyticsDataClient({
      credentials: JSON.parse(serviceAccountKey),
    });
    const property = `properties/${propertyId}`;

    // Get purchase event sync status
    const purchaseStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE sent_to_ga4 = FALSE) as pending,
        COUNT(*) FILTER (WHERE sent_to_ga4 = TRUE) as sent,
        COUNT(*) as total
      FROM ga4_purchase_events
    `;

    const [overviewReport] = await client.runReport({
      property,
      dateRanges: [dateRange],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'totalRevenue' },
      ],
    });

    const overviewRow = overviewReport.rows?.[0];
    const overviewMetrics = overviewRow?.metricValues ?? [];
    const bounceRateRaw = toNumber(overviewMetrics[3]?.value);

    const [topPagesReport] = await client.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 8,
    });

    const [topEventsReport] = await client.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [
        {
          metric: { metricName: 'eventCount' },
          desc: true,
        },
      ],
      limit: 8,
    });

    const [trafficReport] = await client.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      orderBys: [
        {
          dimension: { dimensionName: 'date' },
        },
      ],
    });

    const [funnelReport] = await client.runReport({
      property,
      dateRanges: [dateRange],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: ['add_to_cart', 'begin_checkout', 'purchase'],
            caseSensitive: false,
          },
        },
      },
    });

    const funnelCounts = funnelReport.rows?.reduce<Record<string, number>>((acc, row) => {
      const name = row.dimensionValues?.[0]?.value || '';
      acc[name] = toNumber(row.metricValues?.[0]?.value);
      return acc;
    }, {}) ?? {};

    const compareRange = (() => {
      if (compareMode !== 'previous') return null;
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      const days = diffDays(start, end) + 1;
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -(days - 1));
      return {
        startDate: formatIsoDate(previousStart),
        endDate: formatIsoDate(previousEnd),
      };
    })();

const calcChange = (current: number, previous: number) => {
      if (!Number.isFinite(previous) || previous === 0) {
        return current === 0 ? 0 : 100;
      }
      return ((current - previous) / previous) * 100;
    };

const formatChange = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0.0%';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
};

    let changes: Record<string, number> | null = null;
    let compareTopPagesMap: Record<string, { views: number; users: number; avgTime: number }> | null =
      null;
    let compareTopEventsMap: Record<string, { count: number; users: number }> | null = null;
    let compareTrafficTrend: { date: string; users: number; sessions: number }[] | null = null;
    let compareFunnelCounts: Record<string, number> | null = null;
    if (compareRange) {
      const [compareOverview] = await client.runReport({
        property,
        dateRanges: [compareRange],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'totalRevenue' },
        ],
      });
      const compareOverviewRow = compareOverview.rows?.[0];
      const compareMetrics = compareOverviewRow?.metricValues ?? [];
      const compareBounce = toNumber(compareMetrics[3]?.value);

      const [compareFunnel] = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['add_to_cart', 'begin_checkout', 'purchase'],
              caseSensitive: false,
            },
          },
        },
      });
      const compareFunnelCountsLocal = compareFunnel.rows?.reduce<Record<string, number>>(
        (acc, row) => {
          const name = row.dimensionValues?.[0]?.value || '';
          acc[name] = toNumber(row.metricValues?.[0]?.value);
          return acc;
        },
        {}
      ) ?? {};
      compareFunnelCounts = compareFunnelCountsLocal;

      const [compareTopPages] = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true,
          },
        ],
        limit: 50,
      });

      compareTopPagesMap =
        compareTopPages.rows?.reduce<Record<string, { views: number; users: number; avgTime: number }>>(
          (acc, row) => {
            const page = row.dimensionValues?.[0]?.value || '/';
            acc[page] = {
              views: toNumber(row.metricValues?.[0]?.value),
              users: toNumber(row.metricValues?.[1]?.value),
              avgTime: toNumber(row.metricValues?.[2]?.value),
            };
            return acc;
          },
          {}
        ) ?? {};

      const [compareTopEvents] = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [
          {
            metric: { metricName: 'eventCount' },
            desc: true,
          },
        ],
        limit: 50,
      });

      compareTopEventsMap =
        compareTopEvents.rows?.reduce<Record<string, { count: number; users: number }>>(
          (acc, row) => {
            const eventName = row.dimensionValues?.[0]?.value || 'unknown';
            acc[eventName] = {
              count: toNumber(row.metricValues?.[0]?.value),
              users: toNumber(row.metricValues?.[1]?.value),
            };
            return acc;
          },
          {}
        ) ?? {};

      const [compareTraffic] = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
        orderBys: [
          {
            dimension: { dimensionName: 'date' },
          },
        ],
      });

      compareTrafficTrend =
        compareTraffic.rows?.map((row) => ({
          date: normalizeDate(row.dimensionValues?.[0]?.value),
          users: toNumber(row.metricValues?.[0]?.value),
          sessions: toNumber(row.metricValues?.[1]?.value),
        })) ?? [];

      changes = {
        users: calcChange(toNumber(overviewMetrics[0]?.value), toNumber(compareMetrics[0]?.value)),
        sessions: calcChange(
          toNumber(overviewMetrics[1]?.value),
          toNumber(compareMetrics[1]?.value)
        ),
        pageviews: calcChange(
          toNumber(overviewMetrics[2]?.value),
          toNumber(compareMetrics[2]?.value)
        ),
        bounceRate: calcChange(bounceRateRaw, compareBounce),
        revenue: calcChange(
          toNumber(overviewMetrics[4]?.value),
          toNumber(compareMetrics[4]?.value)
        ),
        purchaseEvents: calcChange(
          funnelCounts.purchase ?? 0,
          compareFunnelCounts.purchase ?? 0
        ),
      };
    }

    const responseData = {
      dateRange,
      compareRange,
      overview: {
        users: toNumber(overviewMetrics[0]?.value),
        sessions: toNumber(overviewMetrics[1]?.value),
        pageviews: toNumber(overviewMetrics[2]?.value),
        bounceRate: Math.round(bounceRateRaw * 1000) / 10,
        revenue: toNumber(overviewMetrics[4]?.value),
        purchaseEvents: funnelCounts.purchase ?? 0,
      },
      changes,
      topPages:
        topPagesReport.rows?.map((row, index) => {
          const dimensions = row.dimensionValues ?? [];
          const metrics = row.metricValues ?? [];
          const page = dimensions[0]?.value || '/';
          const views = toNumber(metrics[0]?.value);
          const users = toNumber(metrics[1]?.value);
          const avgTime = toNumber(metrics[2]?.value);
          const compare = compareTopPagesMap?.[page];
          return {
            id: String(index + 1),
            page,
            views: views.toLocaleString(),
            viewsChange: compare ? formatChange(calcChange(views, compare.views)) : '',
            users: users.toLocaleString(),
            usersChange: compare ? formatChange(calcChange(users, compare.users)) : '',
            avgTime: formatDuration(avgTime),
            avgTimeChange: compare ? formatChange(calcChange(avgTime, compare.avgTime)) : '',
          };
        }) ?? [],
      topEvents:
        topEventsReport.rows?.map((row, index) => {
          const dimensions = row.dimensionValues ?? [];
          const metrics = row.metricValues ?? [];
          const eventName = dimensions[0]?.value || 'unknown';
          const count = toNumber(metrics[0]?.value);
          const users = toNumber(metrics[1]?.value);
          const compare = compareTopEventsMap?.[eventName];
          return {
            id: String(index + 1),
            event: eventName,
            count: count.toLocaleString(),
            countChange: compare ? formatChange(calcChange(count, compare.count)) : '',
            users: users.toLocaleString(),
            usersChange: compare ? formatChange(calcChange(users, compare.users)) : '',
          };
        }) ?? [],
      trafficTrend:
        trafficReport.rows?.map((row) => {
          const dimensions = row.dimensionValues ?? [];
          const metrics = row.metricValues ?? [];
          return {
            date: normalizeDate(dimensions[0]?.value),
            users: toNumber(metrics[0]?.value),
            sessions: toNumber(metrics[1]?.value),
          };
        }) ?? [],
      compareTrafficTrend: compareTrafficTrend ?? [],
      conversionFunnel: [
        { step: 'Add to cart', count: funnelCounts.add_to_cart ?? 0 },
        { step: 'Begin checkout', count: funnelCounts.begin_checkout ?? 0 },
        { step: 'Purchase', count: funnelCounts.purchase ?? 0 },
      ],
      compareConversionFunnel: compareFunnelCounts
        ? [
            { step: 'Add to cart', count: compareFunnelCounts.add_to_cart ?? 0 },
            { step: 'Begin checkout', count: compareFunnelCounts.begin_checkout ?? 0 },
            { step: 'Purchase', count: compareFunnelCounts.purchase ?? 0 },
          ]
        : [],
      purchaseEvents: {
        pending: parseInt(purchaseStats.rows[0]?.pending || '0'),
        sent: parseInt(purchaseStats.rows[0]?.sent || '0'),
        total: parseInt(purchaseStats.rows[0]?.total || '0'),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
