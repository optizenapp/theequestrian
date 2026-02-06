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
      productsTotal: productsCount
      productsInStock: productsCount(query: $inStock)
      productsOutOfStock: productsCount(query: $outStock)
      customersTotal: customersCount
      customersReturning: customersCount(query: $returning)
    }
  `;
  return shopifyAdminFetch<{
    productsTotal: number;
    productsInStock: number;
    productsOutOfStock: number;
    customersTotal: number;
    customersReturning: number;
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

    const [ga4SummaryReport] = await client.runReport({
      property,
      dateRanges: [range],
      metrics: [{ name: 'sessions' }, { name: 'totalRevenue' }],
    });
    const ga4SummaryMetrics = ga4SummaryReport.rows?.[0]?.metricValues ?? [];

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

    const sessions = toNumber(ga4SummaryMetrics[0]?.value);
    const purchases = eventCounts.purchase ?? 0;
    const addToCarts = eventCounts.add_to_cart ?? 0;
    const conversionRate = sessions > 0 ? purchases / sessions : 0;
    const ga4 = {
      sessions,
      purchases,
      addToCarts,
      conversionRate,
      revenue: toNumber(ga4SummaryMetrics[1]?.value),
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
    };

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
    let orderSummary: {
      topProducts: Array<{ product: string; quantity: number; revenue: number }>;
      topVendors: Array<{ vendor: string; quantity: number; revenue: number }>;
      totalRevenue: number;
      ordersCount: number;
    } = { topProducts: [], topVendors: [], totalRevenue: 0, ordersCount: 0 };
    try {
      shopifyCounts = await getShopifyCountMetrics();
      abandonedCheckouts = await getAbandonedCheckoutsCount(range.startDate, range.endDate);
      orderSummary = await getOrderLineItemSummary(range.startDate, range.endDate);
    } catch (error) {
      shopifyError =
        error instanceof Error ? error.message : 'Failed to load Shopify summary.';
      console.error('Shopify summary error:', error);
    }

    let compare: any = null;
    if (compareRange) {
      const [compareReport] = await client.runReport({
        property,
        dateRanges: [compareRange],
        metrics: [{ name: 'sessions' }, { name: 'totalRevenue' }],
      });
      const compareMetrics = compareReport.rows?.[0]?.metricValues ?? [];

      const [compareEventReport] = await client.runReport({
        property,
        dateRanges: [compareRange],
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
      const compareEventCounts = compareEventReport.rows?.reduce<Record<string, number>>(
        (acc, row) => {
          const name = row.dimensionValues?.[0]?.value || '';
          acc[name] = toNumber(row.metricValues?.[0]?.value);
          return acc;
        },
        {}
      ) ?? {};

      const compareSessions = toNumber(compareMetrics[0]?.value);
      const comparePurchases = compareEventCounts.purchase ?? 0;
      const compareAddToCarts = compareEventCounts.add_to_cart ?? 0;
      const compareConversionRate = compareSessions > 0 ? comparePurchases / compareSessions : 0;

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
          purchases: calcDelta(ga4.purchases, comparePurchases),
          addToCarts: calcDelta(ga4.addToCarts, compareAddToCarts),
          conversionRate: calcDelta(ga4.conversionRate, compareConversionRate),
          revenue: calcDelta(ga4.revenue, toNumber(compareMetrics[1]?.value)),
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
        total: shopifyCounts?.customersTotal ?? null,
        returning: shopifyCounts?.customersReturning ?? null,
        abandonedCarts: abandonedCheckouts,
      },
      inventory: {
        totalProducts: shopifyCounts?.productsTotal ?? null,
        inStock: shopifyCounts?.productsInStock ?? null,
        outOfStock: shopifyCounts?.productsOutOfStock ?? null,
        topVendors: orderSummary.topVendors,
        revenueByVendor: orderSummary.topVendors,
      },
      orders: {
        totalRevenue: orderSummary.totalRevenue,
        totalOrders: orderSummary.ordersCount,
        topProducts: orderSummary.topProducts,
      },
      shopifyError,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard summary' }, { status: 500 });
  }
}
