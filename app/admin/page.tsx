'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

type DashboardDelta = { diff: number; pct: number };

type DashboardData = {
  range: { startDate: string; endDate: string };
  compareRange?: { startDate: string; endDate: string } | null;
  compare?: {
    ga4?: {
      sessions: DashboardDelta;
      purchases: DashboardDelta;
      addToCarts: DashboardDelta;
      conversionRate: DashboardDelta;
      revenue: DashboardDelta;
    };
    gsc?: { clicks: DashboardDelta; impressions: DashboardDelta } | null;
    reviews?: { newReviews: DashboardDelta };
    emails?: { sent: DashboardDelta };
  } | null;
  ga4: {
    sessions: number;
    purchases: number;
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
    totalProducts: number | null;
    inStock: number | null;
    outOfStock: number | null;
    topVendors: Array<{ vendor: string; revenue: number; quantity: number }>;
  };
  orders: {
    totalRevenue: number;
    totalOrders: number;
    topProducts: Array<{ product: string; revenue: number; quantity: number }>;
  };
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

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [compareEnabled, setCompareEnabled] = useState(true);
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
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
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
              Compare start
              <input
                type="date"
                value={compareStartDate}
                onChange={(event) => setCompareStartDate(event.target.value)}
                disabled={!compareEnabled}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:opacity-60"
              />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Compare end
              <input
                type="date"
                value={compareEndDate}
                onChange={(event) => setCompareEndDate(event.target.value)}
                disabled={!compareEnabled}
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

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Realtime</h3>
        <p className="mt-1 text-xs text-gray-500">Active users in the last few minutes.</p>
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
              rows={(realtime?.topPages ?? []).map((row, index) => ({
                id: String(index),
                page: row.page,
                activeUsers: formatNumber(row.activeUsers),
              }))}
              emptyState="No realtime data."
            />
            <DataTable
              title="Active users by minute"
              columns={[
                { key: 'label', header: 'Minute' },
                { key: 'activeUsers', header: 'Users' },
              ]}
              rows={(realtime?.activeUsersByMinute ?? []).map((row, index) => ({
                id: String(index),
                label: `${row.minutesAgo}m ago`,
                activeUsers: formatNumber(row.activeUsers),
              }))}
              emptyState="No realtime data."
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="GA4 Sessions"
          value={data ? formatNumber(data.ga4.sessions) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.sessions) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Purchases"
          value={data ? formatNumber(data.ga4.purchases) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.purchases) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Add to carts"
          value={data ? formatNumber(data.ga4.addToCarts) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.addToCarts) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Conversion rate"
          value={data ? formatPercent(data.ga4.conversionRate) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.conversionRate) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Revenue"
          value={data ? formatCurrency(data.ga4.revenue) : '—'}
          change={compareEnabled ? formatDelta(compare?.ga4?.revenue) : undefined}
          helper="GA4"
        />
      </div>

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
          label="GSC Clicks"
          value={data?.gsc ? formatNumber(data.gsc.clicks) : '—'}
          change={compareEnabled ? formatDelta(compare?.gsc?.clicks) : undefined}
          helper="GSC"
        />
        <StatCard
          label="GSC Impressions"
          value={data?.gsc ? formatNumber(data.gsc.impressions) : '—'}
          change={compareEnabled ? formatDelta(compare?.gsc?.impressions) : undefined}
          helper="GSC"
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
          value={data?.inventory.totalProducts ? formatNumber(data.inventory.totalProducts) : '—'}
          helper="Shopify catalog"
        />
        <StatCard
          label="In stock"
          value={data?.inventory.inStock ? formatNumber(data.inventory.inStock) : '—'}
          helper="Shopify catalog"
        />
        <StatCard
          label="Out of stock"
          value={data?.inventory.outOfStock ? formatNumber(data.inventory.outOfStock) : '—'}
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
