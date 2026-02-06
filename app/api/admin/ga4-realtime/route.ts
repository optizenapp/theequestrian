import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { isAdminRequest } from '@/lib/admin/auth';

const toNumber = (value?: string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const propertyId = process.env.GA4_PROPERTY_ID;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!propertyId || !serviceAccountKey) {
      return NextResponse.json({ error: 'GA4 credentials not configured' }, { status: 503 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: JSON.parse(serviceAccountKey),
    });
    const property = `properties/${propertyId}`;

    const [totalReport] = await client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
    });

    const [pagesReport] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    const [sourcesReport] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    });

    return NextResponse.json({
      activeUsers: toNumber(totalReport.rows?.[0]?.metricValues?.[0]?.value),
      topPages:
        pagesReport.rows?.map((row) => ({
          page: row.dimensionValues?.[0]?.value || '/',
          activeUsers: toNumber(row.metricValues?.[0]?.value),
        })) ?? [],
      topSources:
        sourcesReport.rows?.map((row) => ({
          source: row.dimensionValues?.[0]?.value || 'unknown',
          activeUsers: toNumber(row.metricValues?.[0]?.value),
        })) ?? [],
    });
  } catch (error) {
    console.error('GA4 realtime API error:', error);
    return NextResponse.json({ error: 'Failed to fetch GA4 realtime data' }, { status: 500 });
  }
}
