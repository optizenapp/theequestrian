import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { sql } from '@vercel/postgres';
import { isAdminRequest } from '@/lib/admin/auth';
import { getGscOverview, getGscTotals } from '@/lib/gsc/search-console';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

const toNumber = (value?: string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
};

const normalizeDate = (value?: string | null) => {
  if (!value) return '';
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
};

const buildRateSeries = (
  sessions: Array<{ date: string; value: number }>,
  purchases: Array<{ date: string; value: number }>
) => {
  const purchaseMap = new Map(purchases.map((row) => [row.date, row.value]));
  return sessions.map((row) => {
    const purchaseCount = purchaseMap.get(row.date) ?? 0;
    const rate = row.value > 0 ? purchaseCount / row.value : 0;
    return { date: row.date, value: rate };
  });
};

const calcDelta = (current: number, previous: number) => {
  const diff = current - previous;
  if (!previous) {
    return { diff, pct: current ? 1 : 0 };
  }
  return { diff, pct: diff / previous };
};

const getShopifyCountMetrics = async () => {
  const query = `
    query Counts($inStock: String!, $outStock: String!, $returning: String!) {
      productsTotal: productsCount {
        count
      }
      productsInStock: productsCount(query: $inStock) {
        count
      }
      productsOutOfStock: productsCount(query: $outStock) {
        count
      }
      customersTotal: customersCount {
        count
      }
      customersReturning: customersCount(query: $returning) {
        count
      }
    }
  `;
  return shopifyAdminFetch<{
    productsTotal: { count: number };
    productsInStock: { count: number };
    productsOutOfStock: { count: number };
    customersTotal: { count: number };
    customersReturning: { count: number };
  }>({
    query,
    variables: {
      inStock: 'inventory_total:>0',
      outStock: 'inventory_total:0',
      returning: 'orders_count:>1',
    },
  });
};

const getAbandonedCheckoutsCount = async (startDate: string, endDate: string) => {
  const query = `
    query Abandoned($first: Int!, $after: String, $query: String!) {
      abandonedCheckouts(first: $first, after: $after, query: $query) {
        edges { node { id } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const dateQuery = `created_at:>=${startDate} created_at:<=${endDate}`;
  let cursor: string | null = null;
  let total = 0;
  let page = 0;
  const maxPages = 10;
  while (page < maxPages) {
    const result: any = await shopifyAdminFetch<any>({
      query,
      variables: { first: 100, after: cursor, query: dateQuery },
    });
    const edges = result.abandonedCheckouts?.edges ?? [];
    total += edges.length;
    const pageInfo = result.abandonedCheckouts?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
    page += 1;
  }
  return total;
};

const getOrderLineItemSummary = async (startDate: string, endDate: string) => {
  const query = `
    query Orders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
        edges {
          node {
            id
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 100) {
              edges {
                node {
                  title
                  quantity
                  originalUnitPriceSet { shopMoney { amount } }
                  originalTotalSet { shopMoney { amount } }
                  variant { product { vendor } }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const dateQuery = `created_at:>=${startDate} created_at:<=${endDate}`;
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 5;
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const vendorMap = new Map<string, { revenue: number; quantity: number }>();
  let totalRevenue = 0;
  let ordersCount = 0;

  while (page < maxPages) {
    const result: any = await shopifyAdminFetch<any>({
      query,
      variables: { first: 100, after: cursor, query: dateQuery },
    });
    const edges = result.orders?.edges ?? [];
    ordersCount += edges.length;
    for (const edge of edges) {
      const node = edge.node;
      totalRevenue += Number(node.totalPriceSet?.shopMoney?.amount ?? 0);
      const lineItems = node.lineItems?.edges ?? [];
      for (const itemEdge of lineItems) {
        const item = itemEdge.node;
        const title = item.title || 'Unknown';
        const vendor = item.variant?.product?.vendor || 'Unknown';
        const quantity = Number(item.quantity ?? 0);
        const total =
          Number(item.originalTotalSet?.shopMoney?.amount ?? 0) ||
          Number(item.originalUnitPriceSet?.shopMoney?.amount ?? 0) * quantity;

        const existingProduct = productMap.get(title) ?? { quantity: 0, revenue: 0 };
        productMap.set(title, {
          quantity: existingProduct.quantity + quantity,
          revenue: existingProduct.revenue + total,
        });

        const existingVendor = vendorMap.get(vendor) ?? { quantity: 0, revenue: 0 };
        vendorMap.set(vendor, {
          quantity: existingVendor.quantity + quantity,
          revenue: existingVendor.revenue + total,
        });
      }
    }

    const pageInfo = result.orders?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
    page += 1;
  }

  const topProducts = Array.from(productMap.entries())
    .map(([product, stats]) => ({ product, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const topVendors = Array.from(vendorMap.entries())
    .map(([vendor, stats]) => ({ vendor, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { topProducts, topVendors, totalRevenue, ordersCount };
};

const getOrderDailySummary = async (startDate: string, endDate: string) => {
  const query = `
    query OrdersDaily($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
        edges {
          node {
            createdAt
            totalPriceSet { shopMoney { amount } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const dateQuery = `created_at:>=${startDate} created_at:<=${endDate}`;
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 5;
  const dailyMap = new Map<string, { orders: number; revenue: number }>();

  while (page < maxPages) {
    const result: any = await shopifyAdminFetch<any>({
      query,
      variables: { first: 100, after: cursor, query: dateQuery },
    });
    const edges = result.orders?.edges ?? [];
    for (const edge of edges) {
      const node = edge.node;
      const date = normalizeDate(node.createdAt?.slice(0, 10));
      const revenue = Number(node.totalPriceSet?.shopMoney?.amount ?? 0);
      const current = dailyMap.get(date) ?? { orders: 0, revenue: 0 };
      dailyMap.set(date, {
        orders: current.orders + 1,
        revenue: current.revenue + revenue,
      });
    }
    const pageInfo = result.orders?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
    page += 1;
  }

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    orders: stats.orders,
    revenue: stats.revenue,
  }));
};

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const compareStartParam = searchParams.get('compareStartDate');
    const compareEndParam = searchParams.get('compareEndDate');
    const range =
      startDateParam && endDateParam && isIsoDate(startDateParam) && isIsoDate(endDateParam)
        ? { startDate: startDateParam, endDate: endDateParam }
        : getDefaultRange();
    const compareRange =
      compareStartParam &&
      compareEndParam &&
      isIsoDate(compareStartParam) &&
      isIsoDate(compareEndParam)
        ? { startDate: compareStartParam, endDate: compareEndParam }
        : null;

    const propertyId = process.env.GA4_PROPERTY_ID;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!propertyId || !serviceAccountKey) {
      return NextResponse.json({ error: 'GA4 credentials not configured' }, { status: 503 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: JSON.parse(serviceAccountKey),
    });
    const property = `properties/${propertyId}`;

    const transactionalPathFilter = {
      orGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'EXACT' as const, value: '/' },
            },
          },
          {
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'BEGINS_WITH' as const, value: '/?' },
            },
          },
          {
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'BEGINS_WITH' as const, value: '/collections' },
            },
          },
          {
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'BEGINS_WITH' as const, value: '/products' },
            },
          },
        ],
      },
    };

    const ga4SessionsByDateResponse = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'date' }, { name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: transactionalPathFilter,
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    const ga4SessionsByDate = ga4SessionsByDateResponse[0];

    const [ga4EventReport] = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: ['add_to_cart', 'purchase'],
            caseSensitive: false,
          },
        },
      },
    });
    const eventCounts = ga4EventReport.rows?.reduce<Record<string, number>>((acc, row) => {
      const name = row.dimensionValues?.[0]?.value || '';
      acc[name] = toNumber(row.metricValues?.[0]?.value);
      return acc;
    }, {}) ?? {};


    const [ga4TrafficReport] = await client.runReport({
      property,
      dateRanges: [range],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    });

    let ga4TopProductsReport: any = null;
    try {
      [ga4TopProductsReport] = await client.runReport({
        property,
        dateRanges: [range],
        dimensions: [{ name: 'itemName' }],
        metrics: [{ name: 'itemPurchaseQuantity' }, { name: 'itemRevenue' }],
        orderBys: [{ metric: { metricName: 'itemPurchaseQuantity' }, desc: true }],
        limit: 10,
      });
    } catch (error) {
      console.error('[Dashboard] GA4 top products error:', error);
    }

    const gscSiteUrl = process.env.GSC_SITE_URL;
    const gscKey = process.env.GSC_SERVICE_ACCOUNT_JSON;
    let gsc: Awaited<ReturnType<typeof getGscOverview>> | null = null;
    if (gscSiteUrl && gscKey) {
      try {
        gsc = await getGscOverview({
          siteUrl: gscSiteUrl,
          startDate: range.startDate,
          endDate: range.endDate,
          rowLimit: 10,
        });
      } catch (error) {
        console.error('[Dashboard] GSC fetch failed:', error);
        gsc = null;
      }
    }

    const reviewsStats = await sql`
      SELECT 
        COUNT(*) as total_count,
        ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 2) as avg_rating,
        COUNT(*) FILTER (WHERE created_at >= ${range.startDate}::date AND created_at <= ${range.endDate}::date) as new_count
      FROM reviews
    `;

    const emailStats = await sql`
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count
      FROM review_email_sends
      WHERE created_at >= ${range.startDate}::date AND created_at <= ${range.endDate}::date
    `;

    let shopifyCounts: any = null;
    let abandonedCheckouts = 0;
    let shopifyError: string | null = null;
    let headlessCounts: { total: number; inStock: number; outOfStock: number } | null = null;
    let orderDaily: Array<{ date: string; orders: number; revenue: number }> = [];
    let orderSummary: {
      topProducts: Array<{ product: string; quantity: number; revenue: number }>;
      topVendors: Array<{ vendor: string; quantity: number; revenue: number }>;
      totalRevenue: number;
      ordersCount: number;
    } = { topProducts: [], topVendors: [], totalRevenue: 0, ordersCount: 0 };
    try {
      const headlessResult = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE available_for_sale = TRUE) as in_stock,
          COUNT(*) FILTER (WHERE available_for_sale = FALSE) as out_of_stock
        FROM products
      `;
      headlessCounts = {
        total: parseInt(headlessResult.rows[0]?.total || '0'),
        inStock: parseInt(headlessResult.rows[0]?.in_stock || '0'),
        outOfStock: parseInt(headlessResult.rows[0]?.out_of_stock || '0'),
      };
    } catch (error) {
      console.error('Headless inventory error:', error);
    }

    try {
      shopifyCounts = await getShopifyCountMetrics();
      abandonedCheckouts = await getAbandonedCheckoutsCount(range.startDate, range.endDate);
      orderSummary = await getOrderLineItemSummary(range.startDate, range.endDate);
      orderDaily = await getOrderDailySummary(range.startDate, range.endDate);
    } catch (error) {
      shopifyError =
        error instanceof Error ? error.message : 'Failed to load Shopify summary.';
      console.error('Shopify summary error:', error);
    }

    const ga4SessionsSeries = ga4SessionsByDate.rows?.reduce<
      Record<string, number>
    >((acc, row) => {
      const date = normalizeDate(row.dimensionValues?.[0]?.value);
      acc[date] = (acc[date] ?? 0) + toNumber(row.metricValues?.[0]?.value);
      return acc;
    }, {}) ?? {};
    const sessions = Object.values(ga4SessionsSeries).reduce((sum, value) => sum + value, 0);
    const purchases = orderSummary.ordersCount;
    const addToCarts = eventCounts.add_to_cart ?? 0;
    const conversionRate = sessions > 0 ? purchases / sessions : 0;
    const ga4SessionsSeriesRows = Object.entries(ga4SessionsSeries)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const ga4 = {
      sessions,
      addToCarts,
      conversionRate,
      revenue: 0,
      trafficBySource:
        ga4TrafficReport.rows?.map((row) => ({
          source: row.dimensionValues?.[0]?.value || 'unknown',
          sessions: toNumber(row.metricValues?.[0]?.value),
        })) ?? [],
      topProducts:
        ga4TopProductsReport?.rows?.map((row: any) => ({
          product: row.dimensionValues?.[0]?.value || 'Unknown',
          quantity: toNumber(row.metricValues?.[0]?.value),
          revenue: toNumber(row.metricValues?.[1]?.value),
        })) ?? [],
      series: {
        sessions: ga4SessionsSeriesRows,
      },
    };

    let compare: any = null;
    let compareSeries: any = null;
    if (compareRange) {
      const compareSessionsByDateResponse = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'date' }, { name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: transactionalPathFilter,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });
      const compareSessionsByDate = compareSessionsByDateResponse[0];

      const [compareEventReport] = await client.runReport({
        property,
        dateRanges: [compareRange],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['add_to_cart'],
              caseSensitive: false,
            },
          },
        },
      });
      const compareEventCounts = compareEventReport.rows?.reduce<Record<string, number>>(
        (acc, row) => {
          const name = row.dimensionValues?.[0]?.value || '';
          acc[name] = toNumber(row.metricValues?.[0]?.value);
          return acc;
        },
        {}
      ) ?? {};

      const compareSessionsSeriesMap = compareSessionsByDate.rows?.reduce<
        Record<string, number>
      >((acc, row) => {
        const date = normalizeDate(row.dimensionValues?.[0]?.value);
        acc[date] = (acc[date] ?? 0) + toNumber(row.metricValues?.[0]?.value);
        return acc;
      }, {}) ?? {};
      const compareSessions = Object.values(compareSessionsSeriesMap).reduce(
        (sum, value) => sum + value,
        0
      );
      const compareAddToCarts = compareEventCounts.add_to_cart ?? 0;
      const compareOrderDaily = await getOrderDailySummary(
        compareRange.startDate,
        compareRange.endDate
      );
      const compareOrdersCount = compareOrderDaily.reduce((sum, row) => sum + row.orders, 0);
      const compareRevenue = compareOrderDaily.reduce((sum, row) => sum + row.revenue, 0);
      const compareConversionRate =
        compareSessions > 0 ? compareOrdersCount / compareSessions : 0;

      const compareGscTotals =
        gscSiteUrl && gscKey && compareRange
          ? await getGscTotals({
              siteUrl: gscSiteUrl,
              startDate: compareRange.startDate,
              endDate: compareRange.endDate,
            }).catch((error) => {
              console.error('[Dashboard] GSC compare fetch failed:', error);
              return null;
            })
          : null;

      const compareGscOverview =
        gscSiteUrl && gscKey && compareRange
          ? await getGscOverview({
              siteUrl: gscSiteUrl,
              startDate: compareRange.startDate,
              endDate: compareRange.endDate,
              rowLimit: 10,
            }).catch((error) => {
              console.error('[Dashboard] GSC compare overview failed:', error);
              return null;
            })
          : null;

      const compareReviews = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= ${compareRange.startDate}::date AND created_at <= ${compareRange.endDate}::date) as new_count
        FROM reviews
      `;

      const compareEmails = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count
        FROM review_email_sends
        WHERE created_at >= ${compareRange.startDate}::date AND created_at <= ${compareRange.endDate}::date
      `;

      compare = {
        ga4: {
          sessions: calcDelta(ga4.sessions, compareSessions),
          addToCarts: calcDelta(ga4.addToCarts, compareAddToCarts),
        },
        orders: {
          totalOrders: calcDelta(orderSummary.ordersCount, compareOrdersCount),
          totalRevenue: calcDelta(orderSummary.totalRevenue, compareRevenue),
          conversionRate: calcDelta(conversionRate, compareConversionRate),
        },
        gsc: compareGscTotals
          ? {
              clicks: calcDelta(gsc?.totals.clicks ?? 0, compareGscTotals.clicks),
              impressions: calcDelta(gsc?.totals.impressions ?? 0, compareGscTotals.impressions),
            }
          : null,
        reviews: {
          newReviews: calcDelta(
            toNumber(reviewsStats.rows[0]?.new_count),
            toNumber(compareReviews.rows[0]?.new_count)
          ),
        },
        emails: {
          sent: calcDelta(
            toNumber(emailStats.rows[0]?.sent_count),
            toNumber(compareEmails.rows[0]?.sent_count)
          ),
        },
      };

      const compareSessionsSeries = Object.entries(compareSessionsSeriesMap)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const comparePurchasesSeries = compareOrderDaily.map((row) => ({
        date: row.date,
        value: row.orders,
      }));

      compareSeries = {
        orders: compareOrderDaily.map((row) => ({ date: row.date, value: row.orders })),
        revenue: compareOrderDaily.map((row) => ({ date: row.date, value: row.revenue })),
        sessions: compareSessionsSeries,
        purchases: comparePurchasesSeries,
        conversionRate: buildRateSeries(compareSessionsSeries, comparePurchasesSeries),
        gscClicks: compareGscOverview?.byDate?.map((row) => ({
          date: row.date,
          value: row.clicks,
        })) ?? [],
      };
    }

    return NextResponse.json({
      range,
      compareRange,
      compare,
      ga4,
      gsc: gsc
        ? {
            clicks: gsc.totals.clicks,
            impressions: gsc.totals.impressions,
            topQueries: gsc.topQueries,
            byDate: gsc.byDate,
          }
        : null,
      reviews: {
        total: toNumber(reviewsStats.rows[0]?.total_count),
        avgRating: toNumber(reviewsStats.rows[0]?.avg_rating),
        newReviews: toNumber(reviewsStats.rows[0]?.new_count),
      },
      emails: {
        sent: toNumber(emailStats.rows[0]?.sent_count),
        scheduled: toNumber(emailStats.rows[0]?.scheduled_count),
        failed: toNumber(emailStats.rows[0]?.failed_count),
        campaigns: [
          {
            name: 'Review Email',
            sent: toNumber(emailStats.rows[0]?.sent_count),
            scheduled: toNumber(emailStats.rows[0]?.scheduled_count),
            failed: toNumber(emailStats.rows[0]?.failed_count),
          },
        ],
      },
      customers: {
        total: shopifyCounts?.customersTotal?.count ?? null,
        returning: shopifyCounts?.customersReturning?.count ?? null,
        abandonedCarts: abandonedCheckouts,
      },
      inventory: {
        headless: headlessCounts,
        shopifyCatalog: {
          totalProducts: shopifyCounts?.productsTotal?.count ?? null,
          inStock: shopifyCounts?.productsInStock?.count ?? null,
          outOfStock: shopifyCounts?.productsOutOfStock?.count ?? null,
        },
        topVendors: orderSummary.topVendors,
        revenueByVendor: orderSummary.topVendors,
      },
      orders: {
        totalRevenue: orderSummary.totalRevenue,
        totalOrders: orderSummary.ordersCount,
        topProducts: orderSummary.topProducts,
      },
      series: {
        orders: orderDaily.map((row) => ({ date: row.date, value: row.orders })),
        revenue: orderDaily.map((row) => ({ date: row.date, value: row.revenue })),
        sessions: ga4.series.sessions,
        purchases: orderDaily.map((row) => ({ date: row.date, value: row.orders })),
        conversionRate: buildRateSeries(
          ga4.series.sessions,
          orderDaily.map((row) => ({ date: row.date, value: row.orders }))
        ),
        gscClicks: gsc?.byDate?.map((row) => ({ date: row.date, value: row.clicks })) ?? [],
      },
      compareSeries,
      shopifyError,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard summary' }, { status: 500 });
  }
}
