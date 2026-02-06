'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';
import { ChartWrapper } from '@/components/admin/ChartWrapper';
import { useState, useEffect } from 'react';

interface AnalyticsData {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  compareRange?: {
    startDate: string;
    endDate: string;
  } | null;
  overview: {
    users: number;
    sessions: number;
    pageviews: number;
    bounceRate: number;
    revenue: number;
    purchaseEvents: number;
  };
  changes: {
    users: number;
    sessions: number;
    pageviews: number;
    bounceRate: number;
    revenue: number;
    purchaseEvents: number;
  } | null;
  topPages: Array<{
    id: string;
    page: string;
    views: string;
    viewsChange?: string;
    users: string;
    usersChange?: string;
    avgTime: string;
    avgTimeChange?: string;
  }>;
  topEvents: Array<{
    id: string;
    event: string;
    count: string;
    countChange?: string;
    users: string;
    usersChange?: string;
  }>;
  purchaseEvents: {
    pending: number;
    sent: number;
    total: number;
  };
  trafficTrend: Array<{
    date: string;
    users: number;
    sessions: number;
  }>;
  compareTrafficTrend?: Array<{
    date: string;
    users: number;
    sessions: number;
  }>;
  conversionFunnel: Array<{
    step: string;
    count: number;
  }>;
  compareConversionFunnel?: Array<{
    step: string;
    count: number;
  }>;
}

interface RealtimeData {
  activeUsers: number;
  topPages: Array<{ page: string; activeUsers: number }>;
  activeUsersByMinute: Array<{ minutesAgo: number; activeUsers: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchAnalytics(undefined, compareEnabled);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRealtime = async () => {
      try {
        const res = await fetch('/api/admin/ga4-realtime');
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          if (isMounted) {
            setRealtimeError(payload?.error || 'Realtime GA4 not connected');
          }
          return;
        }
        const payload = (await res.json()) as RealtimeData;
        if (isMounted) {
          setRealtime(payload);
          setRealtimeError(null);
        }
      } catch (error) {
        if (isMounted) {
          setRealtimeError('Failed to fetch realtime data.');
        }
      }
    };
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const fetchAnalytics = async (
    range?: { startDate: string; endDate: string },
    compare?: boolean
  ) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      if (range?.startDate && range?.endDate) {
        params.set('startDate', range.startDate);
        params.set('endDate', range.endDate);
      }
      if (compare) {
        params.set('compare', 'previous');
      }
      const response = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setData(null);
        setErrorMessage(payload?.error || 'GA4 not connected');
        return;
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setErrorMessage('Failed to fetch GA4 analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="GA4 Analytics" subtitle="Real-time analytics from Google Analytics 4">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout title="GA4 Analytics" subtitle="Real-time analytics from Google Analytics 4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">GA4 Not Connected</h3>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage || 'Add GA4 Data API credentials to view analytics data.'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  const trafficTrend = data.trafficTrend ?? [];
  const conversionFunnel = data.conversionFunnel ?? [];
  const compareTrafficTrend = data.compareTrafficTrend ?? [];
  const compareConversionFunnel = data.compareConversionFunnel ?? [];
  const hasCompare = Boolean(data.compareRange && data.changes);
  const change = data.changes ?? null;
  const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const formatChangeCell = (value?: string) => {
    if (!value) return { text: '—', tone: 'neutral' as const };
    const tone = value.startsWith('-') ? 'negative' : 'positive';
    return { text: value, tone };
  };
  const trafficMax = Math.max(
    1,
    ...trafficTrend.map((point) => Math.max(point.users, point.sessions)),
    ...(hasCompare
      ? compareTrafficTrend.map((point) => Math.max(point.users, point.sessions))
      : [])
  );
  const funnelMax = Math.max(1, ...conversionFunnel.map((step) => step.count));
  const chartHeight = 96;

  return (
    <AdminLayout title="GA4 Analytics" subtitle="Real-time analytics from Google Analytics 4">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Realtime</h3>
        <p className="mt-1 text-xs text-gray-500">Active users and top pages right now.</p>
        {realtimeError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {realtimeError}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active users"
            value={realtime ? realtime.activeUsers.toLocaleString() : '—'}
            helper="GA4 realtime"
          />
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <DataTable
              title="Top pages (realtime)"
              columns={[
                { key: 'page', header: 'Page' },
                { key: 'activeUsers', header: 'Users' },
              ]}
              rows={(realtime?.topPages ?? []).map((row, index) => ({
                id: String(index),
                page: row.page,
                activeUsers: row.activeUsers.toLocaleString(),
              }))}
              emptyState="No realtime data yet."
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
                activeUsers: row.activeUsers.toLocaleString(),
              }))}
              emptyState="No realtime data yet."
            />
          </div>
        </div>
      </div>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Date range</h3>
            <p className="text-xs text-gray-500">
              Filter GA4 metrics for the selected window.
            </p>
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
                onChange={(event) => {
                  const next = event.target.checked;
                  setCompareEnabled(next);
                  fetchAnalytics({ startDate, endDate }, next);
                }}
                className="h-4 w-4 rounded border-gray-300 text-action"
              />
              Compare to previous period
            </label>
            <button
              type="button"
              onClick={() => fetchAnalytics({ startDate, endDate }, compareEnabled)}
              className="h-10 self-end rounded-lg bg-action px-4 text-sm font-semibold text-white hover:bg-pink-600"
            >
              Apply
            </button>
          </div>
        </div>
        {data.dateRange ? (
          <p className="mt-3 text-xs text-gray-500">
            Showing {data.dateRange.startDate} to {data.dateRange.endDate}.
          </p>
        ) : null}
        {compareEnabled && data.compareRange ? (
          <p className="mt-1 text-xs text-gray-400">
            Comparing to {data.compareRange.startDate} to {data.compareRange.endDate}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Users"
          value={data.overview.users.toLocaleString()}
          change={hasCompare && change ? formatChange(change.users) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Sessions"
          value={data.overview.sessions.toLocaleString()}
          change={hasCompare && change ? formatChange(change.sessions) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Pageviews"
          value={data.overview.pageviews.toLocaleString()}
          change={hasCompare && change ? formatChange(change.pageviews) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Bounce rate"
          value={`${data.overview.bounceRate}%`}
          change={hasCompare && change ? formatChange(change.bounceRate) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Purchase events"
          value={data.overview.purchaseEvents.toLocaleString()}
          change={hasCompare && change ? formatChange(change.purchaseEvents) : undefined}
          helper="GA4"
        />
        <StatCard
          label="Revenue"
          value={data.overview.revenue.toLocaleString('en-AU', {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0,
          })}
          change={hasCompare && change ? formatChange(change.revenue) : undefined}
          helper="GA4"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartWrapper title="Traffic trend" description="Users and sessions over time">
          <div className="w-full">
            <div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-action"></span>
                Users
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                Sessions
              </span>
            </div>
            <div className="flex h-28 items-end gap-2">
              {trafficTrend.map((point, index) => {
                const comparePoint = compareTrafficTrend[index];
                return (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end justify-center gap-1">
                      {hasCompare && comparePoint ? (
                        <>
                          <div
                            className="w-1.5 rounded-full bg-emerald-100"
                            style={{
                              height: `${Math.round(
                                (comparePoint.users / trafficMax) * chartHeight
                              )}px`,
                            }}
                            title={`Prev users: ${comparePoint.users}`}
                          />
                          <div
                            className="w-1.5 rounded-full bg-gray-200"
                            style={{
                              height: `${Math.round(
                                (comparePoint.sessions / trafficMax) * chartHeight
                              )}px`,
                            }}
                            title={`Prev sessions: ${comparePoint.sessions}`}
                          />
                        </>
                      ) : null}
                      <div
                        className="w-2 rounded-full bg-action"
                        style={{
                          height: `${Math.round((point.users / trafficMax) * chartHeight)}px`,
                        }}
                        title={`Users: ${point.users}`}
                      />
                      <div
                        className="w-2 rounded-full bg-gray-300"
                        style={{
                          height: `${Math.round((point.sessions / trafficMax) * chartHeight)}px`,
                        }}
                        title={`Sessions: ${point.sessions}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartWrapper>
        <ChartWrapper title="Conversion funnel" description="Add to cart → Checkout → Purchase">
          <div className="flex w-full flex-col gap-3">
            {conversionFunnel.map((step, index) => {
              const previous =
                index === 0 ? step.count : conversionFunnel[index - 1].count;
              const rate =
                previous > 0 ? Math.round((step.count / previous) * 100) : 0;
              const compareStep = compareConversionFunnel[index];
              const compareChange =
                hasCompare && compareStep
                  ? formatChange(
                      ((step.count - compareStep.count) / Math.max(compareStep.count, 1)) * 100
                    )
                  : null;
              return (
                <div key={step.step} className="flex flex-col gap-1 text-[11px] text-gray-500">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{step.step}</span>
                    <span>
                      {step.count.toLocaleString()} {index === 0 ? '' : `(${rate}%)`}
                    </span>
                  </div>
                  {compareChange ? (
                    <span
                      className={`text-[10px] ${
                        compareChange.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {compareChange} vs previous period
                    </span>
                  ) : null}
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-action"
                      style={{ width: `${(step.count / funnelMax) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartWrapper>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top pages"
          columns={[
            { key: 'page', header: 'Page' },
            { key: 'views', header: 'Views' },
            ...(hasCompare ? ([{ key: 'viewsChange', header: 'Views Δ' }] as const) : []),
            { key: 'users', header: 'Users' },
            ...(hasCompare ? ([{ key: 'usersChange', header: 'Users Δ' }] as const) : []),
            { key: 'avgTime', header: 'Avg. Time' },
            ...(hasCompare ? ([{ key: 'avgTimeChange', header: 'Time Δ' }] as const) : []),
          ]}
          rows={data.topPages.map((row) => ({
            ...row,
            viewsChange: hasCompare ? formatChangeCell(row.viewsChange) : undefined,
            usersChange: hasCompare ? formatChangeCell(row.usersChange) : undefined,
            avgTimeChange: hasCompare ? formatChangeCell(row.avgTimeChange) : undefined,
          }))}
        />
        <DataTable
          title="Top events"
          columns={[
            { key: 'event', header: 'Event' },
            { key: 'count', header: 'Count' },
            ...(hasCompare ? ([{ key: 'countChange', header: 'Count Δ' }] as const) : []),
            { key: 'users', header: 'Users' },
            ...(hasCompare ? ([{ key: 'usersChange', header: 'Users Δ' }] as const) : []),
          ]}
          rows={data.topEvents.map((row) => ({
            ...row,
            countChange: hasCompare ? formatChangeCell(row.countChange) : undefined,
            usersChange: hasCompare ? formatChangeCell(row.usersChange) : undefined,
          }))}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Purchase event sync status</h3>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.purchaseEvents.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{data.purchaseEvents.sent}</p>
            <p className="text-xs text-gray-500">Sent to GA4</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.purchaseEvents.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const res = await fetch('/api/admin/ga4-sync', { method: 'POST' });
            const result = await res.json();
            alert(result.message);
            fetchAnalytics({ startDate, endDate }, compareEnabled);
          }}
          className="mt-4 w-full rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
        >
          Sync pending events to GA4
        </button>
      </div>
    </AdminLayout>
  );
}
