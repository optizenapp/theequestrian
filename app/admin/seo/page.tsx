'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';
import { ChartWrapper } from '@/components/admin/ChartWrapper';

type GscTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscOverview = {
  totals: GscTotals;
  byDate: Array<GscTotals & { date: string }>;
  topPages: Array<GscTotals & { page: string }>;
  topQueries: Array<GscTotals & { query: string }>;
};

type GscResponse = {
  status: 'ok' | 'not_configured' | 'error';
  message?: string;
  siteUrl?: string;
  range?: { startDate: string; endDate: string; days: number };
  data?: GscOverview | null;
};

const formatNumber = (value: number, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '0';

const formatPercent = (value: number) =>
  Number.isFinite(value)
    ? `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
    : '0%';

export default function AdminSeoPage() {
  const [data, setData] = useState<GscResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const days = 28;

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/gsc?days=${days}`);
        const payload = (await response.json()) as GscResponse;
        if (active) {
          setData(payload);
        }
      } catch (error) {
        console.error('Failed to load GSC data:', error);
        if (active) {
          setData({ status: 'error', message: 'Failed to load GSC data.' });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [days]);

  const overview = data?.data ?? null;
  const totals = overview?.totals;
  const sortedTrend = useMemo(() => {
    const rows = overview?.byDate ? [...overview.byDate] : [];
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [overview]);

  const pageRows = useMemo(
    () =>
      (overview?.topPages ?? []).map((row, index) => ({
        id: `${index}`,
        page: row.page || '—',
        clicks: formatNumber(row.clicks),
        impressions: formatNumber(row.impressions),
        position: formatNumber(row.position, 1),
      })),
    [overview]
  );

  const queryRows = useMemo(
    () =>
      (overview?.topQueries ?? []).map((row, index) => ({
        id: `${index}`,
        query: row.query || '—',
        clicks: formatNumber(row.clicks),
        ctr: formatPercent(row.ctr),
        position: formatNumber(row.position, 1),
      })),
    [overview]
  );

   return (
     <AdminLayout
       title="SEO & Analytics"
       subtitle="Google Search Console insights and AI recommendations"
     >
      {data?.status === 'error' ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {data.message || 'Failed to load Google Search Console data.'}
        </div>
      ) : null}
      {data?.status === 'not_configured' ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Google Search Console is not connected.</p>
          <p className="mt-1">
            Add `GSC_SITE_URL` and `GSC_SERVICE_ACCOUNT_JSON` (or
            `GOOGLE_SERVICE_ACCOUNT_JSON`) to enable data loading.
          </p>
          {data.message ? <p className="mt-1 text-xs">{data.message}</p> : null}
        </div>
      ) : null}

       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Clicks (${days} days)`}
          value={isLoading ? '—' : formatNumber(totals?.clicks ?? 0)}
          helper="GSC"
        />
        <StatCard
          label="Impressions"
          value={isLoading ? '—' : formatNumber(totals?.impressions ?? 0)}
          helper="GSC"
        />
        <StatCard
          label="Average CTR"
          value={isLoading ? '—' : formatPercent(totals?.ctr ?? 0)}
          helper="GSC"
        />
        <StatCard
          label="Avg. Position"
          value={isLoading ? '—' : formatNumber(totals?.position ?? 0, 1)}
          helper="Target < 5"
        />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <ChartWrapper title="Traffic trend" description="Clicks & impressions over time">
          {isLoading ? (
            'Loading trend...'
          ) : sortedTrend.length ? (
            <div className="w-full px-3 text-left text-[11px] text-gray-500">
              {sortedTrend.slice(-7).map((row) => (
                <div key={row.date} className="flex items-center justify-between">
                  <span>{row.date}</span>
                  <span>
                    {formatNumber(row.clicks)} clicks · {formatNumber(row.impressions)} impressions
                  </span>
                </div>
              ))}
            </div>
          ) : (
            'No trend data available.'
          )}
         </ChartWrapper>
         <ChartWrapper title="Top performing categories" description="Clicks by category">
          Map category URLs to aggregate GSC clicks by category.
         </ChartWrapper>
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <DataTable
           title="Top pages"
           columns={[
             { key: 'page', header: 'Page' },
             { key: 'clicks', header: 'Clicks' },
             { key: 'impressions', header: 'Impressions' },
             { key: 'position', header: 'Avg. Position' },
           ]}
          rows={pageRows}
          emptyState={isLoading ? 'Loading pages...' : 'No page data yet.'}
         />
         <DataTable
           title="Top queries"
           columns={[
             { key: 'query', header: 'Query' },
             { key: 'clicks', header: 'Clicks' },
             { key: 'ctr', header: 'CTR' },
             { key: 'position', header: 'Avg. Position' },
           ]}
          rows={queryRows}
          emptyState={isLoading ? 'Loading queries...' : 'No query data yet.'}
         />
       </div>

       <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
         <h3 className="text-sm font-semibold text-gray-900">AI recommendations</h3>
         <p className="mt-2 text-sm text-gray-600">
           LLM analysis will surface pages needing title tweaks, content expansion, or internal link
           improvements. Add GSC API credentials to activate.
         </p>
         <ul className="mt-4 space-y-2 text-sm text-gray-600">
           <li>Prioritize updating meta titles for top 10 pages with CTR below 3%.</li>
           <li>Refresh FAQs on high-impression pages to boost rich results.</li>
           <li>Detect cannibalized queries and consolidate category copy.</li>
         </ul>
       </div>
     </AdminLayout>
   );
 }
