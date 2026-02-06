import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getGscOverview } from '@/lib/gsc/search-console';

const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
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

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get('days') || 28);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 180) : 28;
  const { startDate, endDate } = getDateRange(days);

  try {
    const overview = await getGscOverview({
      siteUrl,
      startDate,
      endDate,
      rowLimit: 10,
    });

    return NextResponse.json({
      status: 'ok',
      siteUrl,
      range: { startDate, endDate, days },
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
