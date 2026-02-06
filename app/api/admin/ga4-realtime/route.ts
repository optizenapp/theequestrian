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

    let pagesReport: any = null;
    let minutesReport: any = null;
    try {
      [pagesReport] = await client.runRealtimeReport({
        property,
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      });
    } catch (error) {
      console.error('GA4 realtime pages error:', error);
    }

    try {
      [minutesReport] = await client.runRealtimeReport({
        property,
        dimensions: [{ name: 'minutesAgo' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'minutesAgo' } }],
        limit: 30,
      });
    } catch (error) {
      console.error('GA4 realtime minutes error:', error);
    }

    return NextResponse.json({
      activeUsers: toNumber(totalReport.rows?.[0]?.metricValues?.[0]?.value),
      topPages:
        pagesReport?.rows?.map((row: any) => ({
          page: row.dimensionValues?.[0]?.value || 'Unknown',
          activeUsers: toNumber(row.metricValues?.[0]?.value),
        })) ?? [],
      activeUsersByMinute:
        minutesReport?.rows?.map((row: any) => ({
          minutesAgo: Number(row.dimensionValues?.[0]?.value ?? 0),
          activeUsers: toNumber(row.metricValues?.[0]?.value),
        })) ?? [],
    });
  } catch (error) {
    console.error('GA4 realtime API error:', error);
    return NextResponse.json({ error: 'Failed to fetch GA4 realtime data' }, { status: 500 });
  }
}
