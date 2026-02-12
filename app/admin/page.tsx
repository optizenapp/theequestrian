'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

const KpiChartCard = dynamic(
  () => import('@/components/admin/KpiChartCard').then((mod) => mod.KpiChartCard),
  {
    ssr: false,
  }
);

const KpiChartModal = dynamic(
  () => import('@/components/admin/KpiChartModal').then((mod) => mod.KpiChartModal),
  {
    ssr: false,
  }
);

type DashboardDelta = { diff: number; pct: number };

type DashboardData = {
  range: { startDate: string; endDate: string };
  compareRange?: { startDate: string; endDate: string } | null;
  compare?: {
    ga4?: {
      sessions: DashboardDelta;
      addToCarts: DashboardDelta;
    };
    orders?: {
      totalOrders: DashboardDelta;
      totalRevenue: DashboardDelta;
      conversionRate: DashboardDelta;
    };
    gsc?: { clicks: DashboardDelta; impressions: DashboardDelta } | null;
    reviews?: { newReviews: DashboardDelta };
    emails?: { sent: DashboardDelta };
  } | null;
  ga4: {
    sessions: number;
    addToCarts: number;
    conversionRate: number;
    revenue: number;
    trafficBySource: Array<{ source: string; sessions: number }>;
    topProducts: Array<{ product: string; quantity: number; revenue: number }>;
  };
  gsc?: {
    clicks: number;
    impressions: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  } | null;
  reviews: { total: number; avgRating: number; newReviews: number };
  emails: {
    sent: number;
    scheduled: number;
    failed: number;
    campaigns: Array<{ name: string; sent: number; scheduled: number; failed: number }>;
  };
  customers: { total: number | null; returning: number | null; abandonedCarts: number };
  inventory: {
    headless: {
      total: number;
      inStock: number;
      outOfStock: number;
    } | null;
    shopifyCatalog: {
      totalProducts: number | null;
      inStock: number | null;
      outOfStock: number | null;
    };
    topVendors: Array<{ vendor: string; revenue: number; quantity: number }>;
  };
  orders: {
    totalRevenue: number;
    totalOrders: number;
    topProducts: Array<{ product: string; revenue: number; quantity: number }>;
  };
  series: {
    orders: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
    purchases: Array<{ date: string; value: number }>;
    conversionRate: Array<{ date: string; value: number }>;
    sessions: Array<{ date: string; value: number }>;
    gscClicks: Array<{ date: string; value: number }>;
  };
  compareSeries?: {
    orders: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
    purchases: Array<{ date: string; value: number }>;
    conversionRate: Array<{ date: string; value: number }>;
    sessions: Array<{ date: string; value: number }>;
    gscClicks: Array<{ date: string; value: number }>;
  } | null;
  shopifyError?: string | null;
};

type RealtimeData = {
  activeUsers: number;
  topPages: Array<{ page: string; activeUsers: number }>;
  activeUsersByMinute: Array<{ minutesAgo: number; activeUsers: number }>;
};

const formatNumber = (value: number, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '0';

const formatCurrency = (value: number) =>
  value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const formatPercent = (value: number) =>
  `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

const formatDelta = (delta?: DashboardDelta, invert = false) => {
  if (!delta) return undefined;
  const pctValue = invert ? -delta.pct : delta.pct;
  const sign = pctValue > 0 ? '+' : pctValue < 0 ? '-' : '';
  const pct = Math.abs(pctValue) * 100;
  return `${sign}${pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
};

const PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '6m', label: 'Last 6 months', days: 182 },
  { id: '12m', label: 'Last 12 months', days: 365 },
  { id: '16m', label: 'Last 16 months', days: 487 },
];

const applyPreset = (presetId: string) => {
  const preset = PRESETS.find((item) => item.id === presetId);
  if (!preset) return { startDate: '', endDate: '' };
  const end = new Date();
  const start = new Date();
  if (preset.id === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else {
    start.setDate(start.getDate() - preset.days);
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftYear = (date: Date, years: number) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const compareModes = [
  { id: 'prev-24h', label: 'Compare last 24 hours to previous period' },
  { id: 'wow-24h', label: 'Compare last 24 hours week over week' },
  { id: 'prev-7d', label: 'Compare last 7 days to previous period' },
  { id: 'yoy-7d', label: 'Compare last 7 days year over year' },
  { id: 'prev-28d', label: 'Compare last 28 days to previous period' },
  { id: 'yoy-28d', label: 'Compare last 28 days year over year' },
  { id: 'prev-3m', label: 'Compare last 3 months to previous period' },
  { id: 'yoy-3m', label: 'Compare last 3 months year over year' },
  { id: 'prev-6m', label: 'Compare last 6 months to previous period' },
  { id: 'custom', label: 'Custom' },
];

const buildRange = (days: number) => {
  const end = new Date();
  const start = shiftDate(end, -days);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

const buildCompareRange = (range: { startDate: string; endDate: string }, mode: string) => {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  if (mode === 'prev-24h') {
    const compareEnd = shiftDate(start, -1);
    const compareStart = compareEnd;
    return { startDate: toIsoDate(compareStart), endDate: toIsoDate(compareEnd) };
  }
  if (mode === 'wow-24h') {
    const compareEnd = shiftDate(end, -7);
    const compareStart = compareEnd;
    return { startDate: toIsoDate(compareStart), endDate: toIsoDate(compareEnd) };
  }
  if (mode === 'prev-7d' || mode === 'prev-28d' || mode === 'prev-3m' || mode === 'prev-6m') {
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    const compareEnd = shiftDate(start, -1);
    const compareStart = shiftDate(compareEnd, -diffDays);
    return { startDate: toIsoDate(compareStart), endDate: toIsoDate(compareEnd) };
  }
  if (mode === 'yoy-7d' || mode === 'yoy-28d' || mode === 'yoy-3m') {
    const compareStart = shiftYear(start, -1);
    const compareEnd = shiftYear(end, -1);
    return { startDate: toIsoDate(compareStart), endDate: toIsoDate(compareEnd) };
  }
  return { startDate: range.startDate, endDate: range.endDate };
};

const mergeSeries = (
  current: Array<{ date: string; value: number }>,
  compare?: Array<{ date: string; value: number }>
) => {
  const compareMap = new Map(compare?.map((row) => [row.date, row.value]));
  return current.map((row) => ({
    date: row.date,
    current: row.value,
    compare: compareMap.get(row.date) ?? null,
  }));
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [realtimeExpanded, setRealtimeExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [preset, setPreset] = useState('7d');
  const [compareMode, setCompareMode] = useState('prev-7d');
  const [compareStartDate, setCompareStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date.toISOString().slice(0, 10);
  });
  const [compareEndDate, setCompareEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });

  const fetchDashboard = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (compareEnabled) {
        params.set('compareStartDate', compareStartDate);
        params.set('compareEndDate', compareEndDate);
      }
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setErrorMessage(payload?.error || 'Failed to load dashboard data.');
        setData(null);
        return;
      }
      const payload = (await res.json()) as DashboardData;
      setData(payload);
    } catch (error) {
      setErrorMessage('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await fetch('/api/admin/ga4-realtime');
      if (!res.ok) return;
      const payload = (await res.json()) as RealtimeData;
      setRealtime(payload);
    } catch {
      // Ignore realtime errors for now
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, []);

  const compare = data?.compare ?? null;
  const series = data?.series;
  const compareSeries = data?.compareSeries ?? null;

  const kpiCharts = useMemo(() => {
    const fallbackSeries = {
      orders: [],
      revenue: [],
      purchases: [],
      conversionRate: [],
      sessions: [],
      gscClicks: [],
    } as DashboardData['series'];
    const activeSeries = series ?? fallbackSeries;
    const activeCompare = compareSeries ?? null;
    return [
      {
        key: 'orders',
        title: 'Orders',
        data: mergeSeries(activeSeries.orders, activeCompare?.orders || undefined),
        lines: [
          { key: 'current', label: 'Orders', color: '#ec4899' },
          { key: 'compare', label: 'Compare', color: '#94a3b8' },
        ],
      },
      {
        key: 'revenue',
        title: 'Revenue',
        data: mergeSeries(activeSeries.revenue, activeCompare?.revenue || undefined),
        lines: [
          { key: 'current', label: 'Revenue', color: '#ec4899' },
          { key: 'compare', label: 'Compare', color: '#94a3b8' },
        ],
      },
      {
        key: 'cr',
        title: 'Conversion rate',
        data: mergeSeries(activeSeries.conversionRate, activeCompare?.conversionRate || undefined),
        lines: [
          { key: 'current', label: 'Conversion rate', color: '#ec4899' },
          { key: 'compare', label: 'Compare', color: '#94a3b8' },
        ],
      },
      {
        key: 'sessions',
        title: 'GA Sessions',
        data: mergeSeries(activeSeries.sessions, activeCompare?.sessions || undefined),
        lines: [
          { key: 'current', label: 'Sessions', color: '#ec4899' },
          { key: 'compare', label: 'Compare', color: '#94a3b8' },
        ],
      },
      {
        key: 'gsc',
        title: 'GSC Clicks',
        data: mergeSeries(activeSeries.gscClicks, activeCompare?.gscClicks || undefined),
        lines: [
          { key: 'current', label: 'Clicks', color: '#ec4899' },
          { key: 'compare', label: 'Compare', color: '#94a3b8' },
        ],
      },
    ];
  }, [series, compareSeries]);

  const [activeChart, setActiveChart] = useState<null | (typeof kpiCharts)[number]>(null);
  const [chartPreset, setChartPreset] = useState('7d');
  const [chartComparePreset, setChartComparePreset] = useState('7d');
  const [chartSeries, setChartSeries] = useState<{
    current: Array<{ date: string; value: number }>;
    compare: Array<{ date: string; value: number }>;
  } | null>(null);

  const openChart = async (chart: (typeof kpiCharts)[number]) => {
    setActiveChart(chart);
    setChartPreset(preset);
    setChartComparePreset(preset);
    const range = applyPreset(preset);
    const compareRange = compareEnabled ? applyPreset(preset) : null;
    try {
      const params = new URLSearchParams({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      if (compareEnabled && compareRange) {
        params.set('compareStartDate', compareRange.startDate);
        params.set('compareEndDate', compareRange.endDate);
      }
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (!res.ok) {
        return;
      }
      const payload = (await res.json()) as DashboardData;
      const seriesMap = payload.series;
      const compareMap = payload.compareSeries;
      const mapKey =
        chart.key === 'orders'
          ? 'orders'
          : chart.key === 'revenue'
          ? 'revenue'
          : chart.key === 'cr'
          ? 'conversionRate'
          : chart.key === 'sessions'
          ? 'sessions'
          : 'gscClicks';
      setChartSeries({
        current: seriesMap[mapKey],
        compare: compareMap?.[mapKey] ?? [],
      });
    } catch {
      // ignore
    }
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Unified performance summary">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Date range</h3>
            <p className="text-xs text-gray-500">Apply filters and compare periods.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-medium text-gray-600">
              Preset
              <select
                value={preset}
                onChange={(event) => {
                  const next = event.target.value;
                  setPreset(next);
                  const range = applyPreset(next);
                  setStartDate(range.startDate);
                  setEndDate(range.endDate);
                  if (compareMode !== 'custom') {
                    const nextCompare = buildCompareRange(range, compareMode);
                    setCompareStartDate(nextCompare.startDate);
                    setCompareEndDate(nextCompare.endDate);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              >
                {PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(event) => setCompareEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-action"
              />
              Compare
            </label>
            <label className="text-xs font-medium text-gray-600">
              Compare
              <select
                value={compareMode}
                onChange={(event) => {
                  const next = event.target.value;
                  setCompareMode(next);
                  setCompareEnabled(true);
                  if (next === 'custom') return;
                  let baseRange = { startDate, endDate };
                  if (next === 'prev-24h' || next === 'wow-24h') {
                    baseRange = buildRange(1);
                    setPreset('today');
                    setStartDate(baseRange.startDate);
                    setEndDate(baseRange.endDate);
                  } else if (next === 'prev-7d' || next === 'yoy-7d') {
                    baseRange = buildRange(7);
                    setPreset('7d');
                    setStartDate(baseRange.startDate);
                    setEndDate(baseRange.endDate);
                  } else if (next === 'prev-28d' || next === 'yoy-28d') {
                    baseRange = buildRange(28);
                    setPreset('30d');
                    setStartDate(baseRange.startDate);
                    setEndDate(baseRange.endDate);
                  } else if (next === 'prev-3m' || next === 'yoy-3m') {
                    baseRange = buildRange(90);
                    setPreset('90d');
                    setStartDate(baseRange.startDate);
                    setEndDate(baseRange.endDate);
                  } else if (next === 'prev-6m') {
                    baseRange = buildRange(182);
                    setPreset('6m');
                    setStartDate(baseRange.startDate);
                    setEndDate(baseRange.endDate);
                  }
                  const compareRange = buildCompareRange(baseRange, next);
                  setCompareStartDate(compareRange.startDate);
                  setCompareEndDate(compareRange.endDate);
                }}
                disabled={!compareEnabled}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:opacity-60"
              >
                {compareModes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Compare start
              <input
                type="date"
                value={compareStartDate}
                onChange={(event) => {
                  setCompareMode('custom');
                  setCompareStartDate(event.target.value);
                }}
                disabled={!compareEnabled || compareMode !== 'custom'}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:opacity-60"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Compare end
              <input
                type="date"
                value={compareEndDate}
                onChange={(event) => {
                  setCompareMode('custom');
                  setCompareEndDate(event.target.value);
                }}
                disabled={!compareEnabled || compareMode !== 'custom'}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:opacity-60"
              />
            </label>
            <button
              type="button"
              onClick={fetchDashboard}
              className="h-10 self-end rounded-lg bg-action px-4 text-sm font-semibold text-white hover:bg-pink-600"
            >
              Apply
            </button>
          </div>
        </div>
        {data?.range ? (
          <p className="mt-3 text-xs text-gray-500">
            Showing {data.range.startDate} to {data.range.endDate}.
          </p>
        ) : null}
        {compareEnabled && data?.compareRange ? (
          <p className="mt-1 text-xs text-gray-400">
            Comparing to {data.compareRange.startDate} to {data.compareRange.endDate}.
          </p>
        ) : null}
        {errorMessage ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      {data?.shopifyError ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Shopify data error: {data.shopifyError}
        </div>
      ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Orders"
          value={data ? formatNumber(data.orders.totalOrders) : '—'}
          helper="Shopify orders"
        />
        <StatCard
          label="Revenue"
          value={data ? formatCurrency(data.orders.totalRevenue) : '—'}
          change={compareEnabled ? formatDelta(compare?.orders?.totalRevenue) : undefined}
          helper="Shopify orders"
        />
        <StatCard
          label="Conversion rate"
          value={data ? formatPercent(data.ga4.conversionRate) : '—'}
          change={compareEnabled ? formatDelta(compare?.orders?.conversionRate) : undefined}
          helper="GA4"
        />
        <StatCard
          label="GA Sessions"
          value={data ? formatNumber(data.ga4.sessions) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.sessions) : undefined}
          helper="GA4"
        />
        <StatCard
          label="GSC Clicks"
          value={data?.gsc ? formatNumber(data.gsc.clicks) : '—'}
          change={compareEnabled ? formatDelta(compare?.gsc?.clicks) : undefined}
          helper="GSC"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpiCharts.map((chart) => (
          <KpiChartCard
            key={chart.key}
            title={chart.title}
            subtitle={data?.range ? `${data.range.startDate} → ${data.range.endDate}` : undefined}
            data={chart.data}
            lines={chart.lines}
            onOpen={() => openChart(chart)}
          />
        ))}
      </div>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Realtime</h3>
            <p className="mt-1 text-xs text-gray-500">Active users in the last few minutes.</p>
          </div>
          <button
            type="button"
            onClick={() => setRealtimeExpanded((prev) => !prev)}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
          >
            {realtimeExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active users"
            value={realtime ? formatNumber(realtime.activeUsers) : '—'}
            helper="GA4 realtime"
          />
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <DataTable
              title="Top pages"
              columns={[
                { key: 'page', header: 'Page' },
                { key: 'activeUsers', header: 'Users' },
              ]}
              rows={(realtime?.topPages ?? [])
                .slice(0, realtimeExpanded ? undefined : 5)
                .map((row, index) => ({
                id: String(index),
                page: row.page,
                activeUsers: formatNumber(row.activeUsers),
              }))}
              emptyState="No realtime data."
            />
            <DataTable
              title="Top users"
              columns={[
                { key: 'label', header: 'Minute' },
                { key: 'activeUsers', header: 'Users' },
              ]}
              rows={(realtime?.activeUsersByMinute ?? [])
                .slice(0, realtimeExpanded ? undefined : 5)
                .map((row, index) => ({
                id: String(index),
                label: `${row.minutesAgo}m ago`,
                activeUsers: formatNumber(row.activeUsers),
              }))}
              emptyState="No realtime data."
            />
          </div>
        </div>
      </div>

      <KpiChartModal
        open={Boolean(activeChart)}
        title={activeChart?.title || ''}
        subtitle="Detailed view"
        data={
          chartSeries
            ? mergeSeries(chartSeries.current, chartSeries.compare)
            : activeChart?.data || []
        }
        lines={
          activeChart
            ? [
                { key: 'current', label: activeChart.title, color: '#ec4899' },
                { key: 'compare', label: 'Compare', color: '#94a3b8' },
              ]
            : []
        }
        controls={
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
              <span>Preset</span>
              <select
                value={chartPreset}
                onChange={(event) => setChartPreset(event.target.value)}
                className="rounded-full border border-gray-200 px-2 py-1 text-xs"
              >
                {PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
              <span>Compare</span>
              <select
                value={chartComparePreset}
                onChange={(event) => setChartComparePreset(event.target.value)}
                className="rounded-full border border-gray-200 px-2 py-1 text-xs"
              >
                {PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (activeChart) {
                  openChart(activeChart);
                }
              }}
              className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
            >
              Apply
            </button>
          </div>
        }
        onClose={() => {
          setActiveChart(null);
          setChartSeries(null);
        }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Traffic by source"
          columns={[
            { key: 'source', header: 'Source' },
            { key: 'sessions', header: 'Sessions' },
          ]}
          rows={(data?.ga4.trafficBySource ?? []).map((row, index) => ({
            id: String(index),
            source: row.source,
            sessions: formatNumber(row.sessions),
          }))}
          emptyState={loading ? 'Loading...' : 'No GA4 data.'}
        />
        <DataTable
          title="Top product purchases (GA4)"
          columns={[
            { key: 'product', header: 'Product' },
            { key: 'quantity', header: 'Purchases' },
            { key: 'revenue', header: 'Revenue' },
          ]}
          rows={(data?.ga4.topProducts ?? []).map((row, index) => ({
            id: String(index),
            product: row.product,
            quantity: formatNumber(row.quantity),
            revenue: formatCurrency(row.revenue),
          }))}
          emptyState={loading ? 'Loading...' : 'No GA4 data.'}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="GSC Impressions"
          value={data?.gsc ? formatNumber(data.gsc.impressions) : '—'}
          change={compareEnabled ? formatDelta(compare?.gsc?.impressions) : undefined}
          helper="GSC"
        />
        <StatCard
          label="Add to carts"
          value={data ? formatNumber(data.ga4.addToCarts) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.addToCarts) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Reviews"
          value={data ? formatNumber(data.reviews.total) : '—'}
          helper="Total"
        />
        <StatCard
          label="Avg rating"
          value={data ? data.reviews.avgRating.toFixed(2) : '—'}
          helper="Approved"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top GSC phrases"
          columns={[
            { key: 'query', header: 'Query' },
            { key: 'clicks', header: 'Clicks' },
            { key: 'impressions', header: 'Impressions' },
          ]}
          rows={(data?.gsc?.topQueries ?? []).map((row, index) => ({
            id: String(index),
            query: row.query,
            clicks: formatNumber(row.clicks),
            impressions: formatNumber(row.impressions),
          }))}
          emptyState={loading ? 'Loading...' : 'No GSC data.'}
        />
        <DataTable
          title="Email campaigns (review emails)"
          columns={[
            { key: 'name', header: 'Campaign' },
            { key: 'sent', header: 'Sent' },
            { key: 'scheduled', header: 'Scheduled' },
            { key: 'failed', header: 'Failed' },
          ]}
          rows={(data?.emails.campaigns ?? []).map((row, index) => ({
            id: String(index),
            name: row.name,
            sent: formatNumber(row.sent),
            scheduled: formatNumber(row.scheduled),
            failed: formatNumber(row.failed),
          }))}
          emptyState={loading ? 'Loading...' : 'No email data.'}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Emails sent"
          value={data ? formatNumber(data.emails.sent) : '—'}
          change={compareEnabled ? formatDelta(compare?.emails?.sent) : undefined}
          helper="Review emails"
        />
        <StatCard
          label="New reviews"
          value={data ? formatNumber(data.reviews.newReviews) : '—'}
          change={compareEnabled ? formatDelta(compare?.reviews?.newReviews) : undefined}
          helper="In range"
        />
        <StatCard
          label="Total customers"
          value={data?.customers.total ? formatNumber(data.customers.total) : '—'}
          helper="Shopify"
        />
        <StatCard
          label="Returning customers"
          value={data?.customers.returning ? formatNumber(data.customers.returning) : '—'}
          helper="Shopify"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Abandoned carts"
          value={data ? formatNumber(data.customers.abandonedCarts) : '—'}
          helper="Shopify"
        />
        <StatCard
          label="Products total"
          value={data?.inventory.headless ? formatNumber(data.inventory.headless.total) : '—'}
          helper="Headless catalog"
        />
        <StatCard
          label="In stock"
          value={data?.inventory.headless ? formatNumber(data.inventory.headless.inStock) : '—'}
          helper="Headless catalog"
        />
        <StatCard
          label="Out of stock"
          value={data?.inventory.headless ? formatNumber(data.inventory.headless.outOfStock) : '—'}
          helper="Headless catalog"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Shopify catalog total"
          value={
            data?.inventory.shopifyCatalog.totalProducts
              ? formatNumber(data.inventory.shopifyCatalog.totalProducts)
              : '—'
          }
          helper="Shopify catalog"
        />
        <StatCard
          label="Shopify in stock"
          value={
            data?.inventory.shopifyCatalog.inStock
              ? formatNumber(data.inventory.shopifyCatalog.inStock)
              : '—'
          }
          helper="Shopify catalog"
        />
        <StatCard
          label="Shopify out of stock"
          value={
            data?.inventory.shopifyCatalog.outOfStock
              ? formatNumber(data.inventory.shopifyCatalog.outOfStock)
              : '—'
          }
          helper="Shopify catalog"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top vendors (revenue)"
          columns={[
            { key: 'vendor', header: 'Vendor' },
            { key: 'revenue', header: 'Revenue' },
            { key: 'quantity', header: 'Items' },
          ]}
          rows={(data?.inventory.topVendors ?? []).map((row, index) => ({
            id: String(index),
            vendor: row.vendor,
            revenue: formatCurrency(row.revenue),
            quantity: formatNumber(row.quantity),
          }))}
          emptyState={loading ? 'Loading...' : 'No vendor data.'}
        />
        <DataTable
          title="Top Shopify products (orders)"
          columns={[
            { key: 'product', header: 'Product' },
            { key: 'quantity', header: 'Items' },
            { key: 'revenue', header: 'Revenue' },
          ]}
          rows={(data?.orders.topProducts ?? []).map((row, index) => ({
            id: String(index),
            product: row.product,
            quantity: formatNumber(row.quantity),
            revenue: formatCurrency(row.revenue),
          }))}
          emptyState={loading ? 'Loading...' : 'No order data.'}
        />
      </div>
    </AdminLayout>
  );
}
