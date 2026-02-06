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

type GscCompareDelta = {
  diff: number;
  pct: number;
};

type GscCompare = {
  range: { startDate: string; endDate: string };
  totals: GscTotals;
  delta: {
    clicks: GscCompareDelta;
    impressions: GscCompareDelta;
    ctr: GscCompareDelta;
    position: GscCompareDelta;
  };
};

type GscResponse = {
  status: 'ok' | 'not_configured' | 'error';
  message?: string;
  siteUrl?: string;
  range?: { startDate: string; endDate: string; days: number };
  compare?: GscCompare | null;
  data?: GscOverview | null;
};

const formatNumber = (value: number, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '0';

const formatPercent = (value: number) =>
  Number.isFinite(value)
    ? `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
    : '0%';

const TrafficTrendChart = ({ rows }: { rows: Array<GscTotals & { date: string }> }) => {
  if (!rows.length) return null;
  const width = 520;
  const height = 140;
  const padding = 24;
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Math.max(row.clicks || 0, row.impressions || 0))
  );
  const xStep = rows.length > 1 ? (width - padding * 2) / (rows.length - 1) : 0;
  const toY = (value: number) =>
    padding + (height - padding * 2) * (1 - Math.min(value / maxValue, 1));

  const buildPath = (values: number[]) =>
    values
      .map((value, index) => {
        const x = padding + index * xStep;
        const y = toY(value);
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

  const clicksPath = buildPath(rows.map((row) => row.clicks || 0));
  const impressionsPath = buildPath(rows.map((row) => row.impressions || 0));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full rounded-xl border border-gray-100 bg-white"
        role="img"
        aria-label="Clicks and impressions trend"
      >
        <path d={impressionsPath} stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path d={clicksPath} stroke="#ec4899" strokeWidth="2.5" fill="none" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
        <span>{rows[0]?.date}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
            Clicks
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
            Impressions
          </span>
        </div>
        <span>{rows[rows.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default function AdminSeoPage() {
  const [data, setData] = useState<GscResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(28);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [pageFilter, setPageFilter] = useState('');
  const [queryFilter, setQueryFilter] = useState('');

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/gsc?days=${days}${compareEnabled ? '&compare=1' : ''}`
        );
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
  }, [days, compareEnabled]);

  const overview = data?.data ?? null;
  const compare = data?.compare ?? null;
  const totals = overview?.totals;
  const sortedTrend = useMemo(() => {
    const rows = overview?.byDate ? [...overview.byDate] : [];
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [overview]);

  const pageRows = useMemo(
    () => {
      const normalizedFilter = pageFilter.trim().toLowerCase();
      return (overview?.topPages ?? [])
        .filter((row) =>
          normalizedFilter ? row.page?.toLowerCase().includes(normalizedFilter) : true
        )
        .map((row, index) => ({
          id: `${index}`,
          page: row.page || '—',
          clicks: formatNumber(row.clicks),
          impressions: formatNumber(row.impressions),
          position: formatNumber(row.position, 1),
        }));
    },
    [overview, pageFilter]
  );

  const queryRows = useMemo(
    () => {
      const normalizedFilter = queryFilter.trim().toLowerCase();
      return (overview?.topQueries ?? [])
        .filter((row) =>
          normalizedFilter ? row.query?.toLowerCase().includes(normalizedFilter) : true
        )
        .map((row, index) => ({
          id: `${index}`,
          query: row.query || '—',
          clicks: formatNumber(row.clicks),
          ctr: formatPercent(row.ctr),
          position: formatNumber(row.position, 1),
        }));
    },
    [overview, queryFilter]
  );

  const formatDelta = (delta?: GscCompareDelta, invert = false) => {
    if (!delta) return undefined;
    const pctValue = invert ? -delta.pct : delta.pct;
    const sign = pctValue > 0 ? '+' : pctValue < 0 ? '-' : '';
    const pct = Math.abs(pctValue) * 100;
    return `${sign}${pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  };

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

      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1">
          <span>Range</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-full border border-gray-200 px-2 py-1 text-xs"
          >
            <option value={7}>Last 7 days</option>
            <option value={28}>Last 28 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(event) => setCompareEnabled(event.target.checked)}
            className="h-3 w-3"
          />
          Compare previous period
        </label>
        {data?.range ? (
          <span className="text-[11px] text-gray-400">
            {data.range.startDate} → {data.range.endDate}
            {compare?.range ? ` · Compare ${compare.range.startDate} → ${compare.range.endDate}` : ''}
          </span>
        ) : null}
      </div>

       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Clicks (${days} days)`}
          value={isLoading ? '—' : formatNumber(totals?.clicks ?? 0)}
          change={compareEnabled ? formatDelta(compare?.delta.clicks) : undefined}
          helper="GSC"
        />
        <StatCard
          label="Impressions"
          value={isLoading ? '—' : formatNumber(totals?.impressions ?? 0)}
          change={compareEnabled ? formatDelta(compare?.delta.impressions) : undefined}
          helper="GSC"
        />
        <StatCard
          label="Average CTR"
          value={isLoading ? '—' : formatPercent(totals?.ctr ?? 0)}
          change={compareEnabled ? formatDelta(compare?.delta.ctr) : undefined}
          helper="GSC"
        />
        <StatCard
          label="Avg. Position"
          value={isLoading ? '—' : formatNumber(totals?.position ?? 0, 1)}
          change={compareEnabled ? formatDelta(compare?.delta.position, true) : undefined}
          helper="Target < 5"
        />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <ChartWrapper title="Traffic trend" description="Clicks & impressions over time">
          {isLoading ? 'Loading trend...' : sortedTrend.length ? (
            <TrafficTrendChart rows={sortedTrend} />
          ) : (
            'No trend data available.'
          )}
         </ChartWrapper>
         <ChartWrapper title="Top performing categories" description="Clicks by category">
          Map category URLs to aggregate GSC clicks by category.
         </ChartWrapper>
       </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Filter pages
          </label>
          <input
            value={pageFilter}
            onChange={(event) => setPageFilter(event.target.value)}
            placeholder="/horse/halters"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Filter queries
          </label>
          <input
            value={queryFilter}
            onChange={(event) => setQueryFilter(event.target.value)}
            placeholder="search phrase"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
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
