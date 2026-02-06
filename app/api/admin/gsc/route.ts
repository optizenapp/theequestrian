import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getGscOverview, getGscTotals } from '@/lib/gsc/search-console';

const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const getPreviousDateRange = (startDate: string, days: number) => {
  const start = new Date(startDate);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return {
    startDate: prevStart.toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  };
};

const computeDelta = (current: number, previous: number) => {
  const diff = current - previous;
  if (!previous) {
    return { diff, pct: current ? 1 : 0 };
  }
  return { diff, pct: diff / previous };
};

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Missing GSC_SITE_URL environment variable.',
      data: null,
    });
  }
  if (!process.env.GSC_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Missing GSC_SERVICE_ACCOUNT_JSON environment variable.',
      data: null,
    });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get('days') || 28);
  const compareParam = searchParams.get('compare');
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 180) : 28;
  const { startDate, endDate } = getDateRange(days);
  const includeCompare = compareParam === '1' || compareParam === 'true';

  try {
    const overview = await getGscOverview({
      siteUrl,
      startDate,
      endDate,
      rowLimit: 10,
    });

    const compareRange = includeCompare
      ? getPreviousDateRange(startDate, days)
      : null;
    const compareTotals = includeCompare && compareRange
      ? await getGscTotals({ siteUrl, ...compareRange })
      : null;

    return NextResponse.json({
      status: 'ok',
      siteUrl,
      range: { startDate, endDate, days },
      compare: includeCompare && compareRange && compareTotals ? {
        range: compareRange,
        totals: compareTotals,
        delta: {
          clicks: computeDelta(overview.totals.clicks, compareTotals.clicks),
          impressions: computeDelta(overview.totals.impressions, compareTotals.impressions),
          ctr: computeDelta(overview.totals.ctr, compareTotals.ctr),
          position: computeDelta(overview.totals.position, compareTotals.position),
        },
      } : null,
      data: overview,
    });
  } catch (error) {
    console.error('[GSC] Failed to fetch data:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch GSC data.' },
      { status: 500 }
    );
  }
}
