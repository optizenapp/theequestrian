'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

interface NotFoundData {
  dateRange: { startDate: string; endDate: string };
  internalTotal: number;
  internalDaily: Array<{
    day: string;
    hits: number;
  }>;
  internalTop: Array<{
    path: string;
    hits: number;
    last_seen: string;
  }>;
  internalRecent: Array<{
    path: string;
    referrer: string | null;
    hits: number;
    last_seen: string;
  }>;
  ga4Total: number;
  ga4Top: Array<{
    path: string;
    views: number;
    users: number;
  }>;
}

interface ManualRedirect {
  id: number;
  from_path: string;
  to_path: string;
  redirect_type?: string;
  source?: string;
  status?: string;
  conflict_target?: string | null;
  created_at: string;
}

export default function AdminNotFoundPage() {
  const [data, setData] = useState<NotFoundData | null>(null);
  const [redirects, setRedirects] = useState<ManualRedirect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Record<string, { from: string; to: string; reason?: string }>
  >({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ManualRedirect[]>([]);
  const [attempting, setAttempting] = useState<Record<string, boolean>>({});
  const [attemptErrors, setAttemptErrors] = useState<Record<string, string>>({});
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [rollupRunning, setRollupRunning] = useState(false);
  const [rollupMessage, setRollupMessage] = useState<string | null>(null);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'internal' | 'ga4' | 'redirects'>('internal');
  const [internalPage, setInternalPage] = useState(1);
  const [ga4Page, setGa4Page] = useState(1);
  const [redirectsPage, setRedirectsPage] = useState(1);
  const pageSize = 20;
  const [redirectDrafts, setRedirectDrafts] = useState<Record<string, string>>({});
  const [redirectSaving, setRedirectSaving] = useState<Record<string, boolean>>({});
  const [redirectTypeDrafts, setRedirectTypeDrafts] = useState<Record<string, string>>({});
  const [editRedirects, setEditRedirects] = useState<
    Record<string, { to: string; type: string; status: string }>
  >({});
  const [redirectSourceFilter, setRedirectSourceFilter] = useState<'all' | 'manual' | 'csv'>('all');
  const [importRunning, setImportRunning] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    fetchConflicts();
  }, []);

  const fetchData = async (range?: { startDate: string; endDate: string }) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (range?.startDate && range?.endDate) {
      params.set('startDate', range.startDate);
      params.set('endDate', range.endDate);
    }
    const res = await fetch(`/api/admin/404?${params.toString()}`);
    const payload = await res.json();
    setData(payload);
    setIsLoading(false);
    setInternalPage(1);
    setGa4Page(1);
  };

  const fetchRedirects = async (source?: string) => {
    const params = source ? `?source=${source}` : '';
    const res = await fetch(`/api/admin/redirects${params}`);
    const payload = await res.json();
    setRedirects(payload.redirects || []);
  };

  const fetchConflicts = async () => {
    const res = await fetch('/api/admin/redirects/audit');
    const payload = await res.json();
    setConflicts(payload.conflicts || []);
  };

  const runAudit = async () => {
    setActionMessage(null);
    setAuditMessage(null);
    setAuditRunning(true);
    try {
      const res = await fetch('/api/admin/redirects/audit', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setAuditMessage(payload?.error || 'Failed to run audit.');
        return;
      }
      setConflicts(payload.conflicts || []);
      setAuditMessage(`Audit completed. Conflicts found: ${payload.conflicts?.length || 0}`);
    } catch (error) {
      setAuditMessage('Failed to run audit.');
    } finally {
      setAuditRunning(false);
    }
  };

  const runRollup = async () => {
    setRollupMessage(null);
    setRollupRunning(true);
    try {
      const res = await fetch('/api/admin/404/rollup', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setRollupMessage(payload?.error || 'Failed to roll up 404s.');
        return;
      }
      setRollupMessage(`Rollup complete. Days updated: ${payload.days || 0}`);
      fetchData({ startDate, endDate });
    } catch (error) {
      setRollupMessage('Failed to roll up 404s.');
    } finally {
      setRollupRunning(false);
    }
  };

  const runScan = async () => {
    setScanMessage(null);
    setScanRunning(true);
    try {
      const res = await fetch('/api/admin/404/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageLimit: 300, linkLimit: 500, includeLinks: true }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setScanMessage(payload?.error || 'Failed to scan site.');
        return;
      }
      setScanMessage(
        `Scan complete. URLs scanned: ${payload.scanned}, links scanned: ${payload.linkScanned}, 404s: ${payload.notFound}`
      );
      fetchData({ startDate, endDate });
    } catch (error) {
      setScanMessage('Failed to scan site.');
    } finally {
      setScanRunning(false);
    }
  };

  const paginate = <T,>(items: T[], page: number) => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const getTotalPages = (count: number) => Math.max(1, Math.ceil(count / pageSize));

  const handleCreateRedirect = async () => {
    setStatusMessage(null);
    if (!fromPath || !toPath) {
      setStatusMessage('Please enter both from and to paths.');
      return;
    }
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromPath, to: toPath }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setStatusMessage(payload?.error || 'Failed to create redirect.');
      return;
    }
    setFromPath('');
    setToPath('');
    setStatusMessage(`Redirect added: ${payload.redirect.from} → ${payload.redirect.to}`);
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
  };

  const attemptMatch = async (path: string) => {
    setActionMessage(null);
    setAttemptErrors((prev) => ({ ...prev, [path]: '' }));
    setAttempting((prev) => ({ ...prev, [path]: true }));
    try {
      const res = await fetch('/api/admin/redirects/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setAttemptErrors((prev) => ({
          ...prev,
          [path]: payload?.error || 'No match found.',
        }));
        return;
      }
      setSuggestions((prev) => ({ ...prev, [path]: payload.redirect }));
    } catch (error) {
      setAttemptErrors((prev) => ({
        ...prev,
        [path]: 'Failed to attempt match.',
      }));
    } finally {
      setAttempting((prev) => ({ ...prev, [path]: false }));
    }
  };

  const approveRedirect = async (path: string) => {
    const suggestion = suggestions[path];
    if (!suggestion) return;
    setAttempting((prev) => ({ ...prev, [path]: true }));
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: suggestion.from, to: suggestion.to, type: '301' }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to save redirect.');
      setAttempting((prev) => ({ ...prev, [path]: false }));
      return;
    }
    setActionMessage(`Redirect added: ${payload.redirect.from} → ${payload.redirect.to}`);
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    setAttempting((prev) => ({ ...prev, [path]: false }));
  };

  const updateRedirectStatus = async (id: number, status: 'active' | 'disabled') => {
    setActionMessage(null);
    const res = await fetch(`/api/admin/redirects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to update redirect.');
      return;
    }
    setActionMessage(`Redirect ${status === 'disabled' ? 'disabled' : 're-enabled'}.`);
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    fetchConflicts();
  };

  const updateRedirectDraft = (key: string, value: string) => {
    setRedirectDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const updateRedirectTypeDraft = (key: string, value: string) => {
    setRedirectTypeDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const saveRedirectFromRow = async (key: string, from: string) => {
    const to = redirectDrafts[key];
    const type = redirectTypeDrafts[key] || '301';
    if (!to) {
      setActionMessage('Please enter a redirect target.');
      return;
    }
    setRedirectSaving((prev) => ({ ...prev, [key]: true }));
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, type }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to save redirect.');
      setRedirectSaving((prev) => ({ ...prev, [key]: false }));
      return;
    }
    setActionMessage(`Redirect added: ${payload.redirect.from} → ${payload.redirect.to}`);
    setRedirectDrafts((prev) => ({ ...prev, [key]: '' }));
    setRedirectTypeDrafts((prev) => ({ ...prev, [key]: '301' }));
    setRedirectSaving((prev) => ({ ...prev, [key]: false }));
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
  };

  const updateEditRedirect = (
    id: number,
    field: 'to' | 'type' | 'status',
    value: string
  ) => {
    setEditRedirects((prev) => {
      const current = prev[id] ?? { to: '', type: '301', status: 'active' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const saveManualRedirect = async (
    id: number,
    fallbackTo: string,
    fallbackType: string,
    fallbackStatus: string
  ) => {
    const draft = editRedirects[id];
    const to = draft?.to || fallbackTo;
    const type = draft?.type || fallbackType || '301';
    const status = draft?.status || fallbackStatus || 'active';
    const res = await fetch(`/api/admin/redirects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type, status, source: 'manual' }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to update redirect.');
      return;
    }
    setActionMessage('Redirect updated.');
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
  };

  const deleteManualRedirect = async (id: number) => {
    const res = await fetch(`/api/admin/redirects/${id}`, {
      method: 'DELETE',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to delete redirect.');
      return;
    }
    setActionMessage('Redirect deleted.');
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
  };

  const importCsvRedirects = async () => {
    setImportMessage(null);
    setImportRunning(true);
    try {
      const res = await fetch('/api/admin/redirects/import', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setImportMessage(payload?.error || 'Failed to import redirects.');
        return;
      }
      setImportMessage(`Imported ${payload.imported} redirects from CSV.`);
      setRedirectsPage(1);
      fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    } catch (error) {
      setImportMessage('Failed to import redirects.');
    } finally {
      setImportRunning(false);
    }
  };

  return (
    <AdminLayout title="404 Monitor" subtitle="Track missing pages and add manual redirects">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Date range</h3>
            <p className="text-xs text-gray-500">Filter 404 activity by date.</p>
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
            <button
              type="button"
              onClick={() => fetchData({ startDate, endDate })}
              className="h-10 self-end rounded-lg bg-action px-4 text-sm font-semibold text-white hover:bg-pink-600"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={runRollup}
              disabled={rollupRunning}
              className="h-10 self-end rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rollupRunning ? 'Running rollup...' : 'Run internal rollup'}
            </button>
            <button
              type="button"
              onClick={runScan}
              disabled={scanRunning}
              className="h-10 self-end rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanRunning ? 'Scanning...' : 'Scan site for 404s'}
            </button>
          </div>
        </div>
        {data?.dateRange ? (
          <p className="mt-3 text-xs text-gray-500">
            Showing {data.dateRange.startDate} to {data.dateRange.endDate}.
          </p>
        ) : null}
        {rollupMessage ? (
          <p className="mt-2 text-xs text-gray-500">{rollupMessage}</p>
        ) : null}
        {scanMessage ? (
          <p className="mt-1 text-xs text-gray-500">{scanMessage}</p>
        ) : null}
      </div>

      {isLoading || !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          Loading 404 data...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label="Internal 404 hits"
              value={data.internalTotal.toLocaleString()}
              helper="Captured by not-found logger"
            />
            <StatCard
              label="GA4 404 views"
              value={data.ga4Total.toLocaleString()}
              helper="Filtered by GA4 pageTitle/pagePath"
            />
          </div>

          <div className="mt-6">
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('internal')}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === 'internal'
                    ? 'bg-action text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Internal 404s
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ga4')}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === 'ga4'
                    ? 'bg-action text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                GA4 404s
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('redirects')}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === 'redirects'
                    ? 'bg-action text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Current Redirects
              </button>
            </div>

            {activeTab === 'internal' ? (
              <div className="p-5">
                <div className="grid gap-6 lg:grid-cols-2">
                  <DataTable
                    title="Internal 404s"
                    columns={[
                      { key: 'path', header: 'Path' },
                      { key: 'hits', header: 'Hits' },
                      { key: 'lastSeen', header: 'Last Seen' },
                    ]}
                    rows={data.internalTop.map((row, index) => ({
                      id: String(index + 1),
                      path: row.path,
                      hits: row.hits.toLocaleString(),
                      lastSeen: new Date(row.last_seen).toLocaleString(),
                    }))}
                  />
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900">Internal 404 trend</h3>
                    <p className="text-xs text-gray-500">Daily 404 counts for the selected range.</p>
                    <div className="mt-4 flex h-28 items-end gap-2">
                      {data.internalDaily.length === 0 ? (
                        <div className="text-xs text-gray-400">No internal 404s recorded.</div>
                      ) : (
                        (() => {
                          const maxHits = Math.max(
                            1,
                            ...data.internalDaily.map((item) => item.hits)
                          );
                          return data.internalDaily.map((row) => {
                            const height = Math.round((row.hits / maxHits) * 96);
                            return (
                              <div key={row.day} className="flex flex-1 flex-col items-center gap-1">
                                <div
                                  className="w-3 rounded-full bg-action"
                                  style={{ height: `${height}px` }}
                                  title={`${row.hits} hits`}
                                />
                                <span className="text-[10px] text-gray-400">
                                  {row.day.slice(5)}
                                </span>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Internal 404 details</h3>
                    <p className="text-xs text-gray-500">
                      Review URLs, source referrers, and add redirects directly.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">URL</th>
                          <th className="px-5 py-3 text-left font-semibold">Source</th>
                          <th className="px-5 py-3 text-left font-semibold">Redirect to</th>
                          <th className="px-5 py-3 text-left font-semibold">Type</th>
                          <th className="px-5 py-3 text-left font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {data.internalRecent.length ? (
                          paginate(data.internalRecent, internalPage).map((row, index) => {
                            const key = `${row.path}::${row.referrer ?? 'direct'}::${index}`;
                            return (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="px-5 py-3">{row.path}</td>
                                <td className="px-5 py-3 text-xs text-gray-500">
                                  {row.referrer || 'Direct / Unknown'}
                                </td>
                                <td className="px-5 py-3">
                                  <input
                                    value={redirectDrafts[key] || ''}
                                    onChange={(event) => updateRedirectDraft(key, event.target.value)}
                                    placeholder="/new-url"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  />
                                </td>
                                <td className="px-5 py-3">
                                  <select
                                    value={redirectTypeDrafts[key] || '301'}
                                    onChange={(event) =>
                                      updateRedirectTypeDraft(key, event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  >
                                    <option value="301">301</option>
                                    <option value="302">302</option>
                                    <option value="307">307</option>
                                    <option value="308">308</option>
                                  </select>
                                </td>
                                <td className="px-5 py-3">
                                  <button
                                    type="button"
                                    disabled={redirectSaving[key]}
                                    onClick={() => saveRedirectFromRow(key, row.path)}
                                    className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {redirectSaving[key] ? 'Saving...' : 'Save redirect'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                              No internal 404 details yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                    <span>
                      Showing {Math.min(pageSize, data.internalRecent.length)} of {data.internalRecent.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInternalPage((page) => Math.max(1, page - 1))}
                        disabled={internalPage === 1}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Prev
                      </button>
                      <span>
                        Page {internalPage} of {getTotalPages(data.internalRecent.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setInternalPage((page) =>
                            Math.min(getTotalPages(data.internalRecent.length), page + 1)
                          )
                        }
                        disabled={internalPage >= getTotalPages(data.internalRecent.length)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'ga4' ? (
              <div className="p-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">GA4 404 candidates</h3>
                      <button
                        type="button"
                        onClick={runAudit}
                        disabled={auditRunning}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {auditRunning ? 'Running audit...' : 'Run redirect audit'}
                      </button>
                    </div>
                    {auditMessage ? (
                      <p className="mt-2 text-xs text-gray-500">{auditMessage}</p>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">Path</th>
                          <th className="px-5 py-3 text-left font-semibold">Views</th>
                          <th className="px-5 py-3 text-left font-semibold">Users</th>
                          <th className="px-5 py-3 text-left font-semibold">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {data?.ga4Top.length ? (
                          paginate(data.ga4Top, ga4Page).map((row) => {
                            const suggestion = suggestions[row.path];
                            return (
                              <tr key={row.path} className="hover:bg-gray-50">
                                <td className="px-5 py-3">{row.path}</td>
                                <td className="px-5 py-3">{row.views.toLocaleString()}</td>
                                <td className="px-5 py-3">{row.users.toLocaleString()}</td>
                                <td className="px-5 py-3">
                                  {suggestion ? (
                                    <div className="flex flex-col gap-2 text-xs">
                                      <span className="text-gray-600">
                                        {suggestion.from} → {suggestion.to}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        Suggested by{' '}
                                        {suggestion.reason === 'category' ? 'category' : 'product'} match
                                      </span>
                                      <button
                                        type="button"
                                        disabled={attempting[row.path]}
                                        onClick={() => approveRedirect(row.path)}
                                        className="w-fit rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {attempting[row.path] ? 'Saving...' : 'Approve redirect'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2 text-xs">
                                      <button
                                        type="button"
                                        disabled={attempting[row.path]}
                                        onClick={() => attemptMatch(row.path)}
                                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {attempting[row.path] ? 'Searching...' : 'Attempt match & redirect'}
                                      </button>
                                      {attemptErrors[row.path] ? (
                                        <span className="text-[10px] text-rose-600">
                                          {attemptErrors[row.path]}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                              No GA4 404 candidates yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                    <span>
                      Showing {Math.min(pageSize, data.ga4Top.length)} of {data.ga4Top.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGa4Page((page) => Math.max(1, page - 1))}
                        disabled={ga4Page === 1}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Prev
                      </button>
                      <span>
                        Page {ga4Page} of {getTotalPages(data.ga4Top.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGa4Page((page) =>
                            Math.min(getTotalPages(data.ga4Top.length), page + 1)
                          )
                        }
                        disabled={ga4Page >= getTotalPages(data.ga4Top.length)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'redirects' ? (
              <div className="p-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Manual redirects</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={redirectSourceFilter}
                          onChange={(event) => {
                            const value = event.target.value as 'all' | 'manual' | 'csv';
                            setRedirectSourceFilter(value);
                            setRedirectsPage(1);
                            fetchRedirects(value === 'all' ? undefined : value);
                          }}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                        >
                          <option value="all">All sources</option>
                          <option value="manual">Manual</option>
                          <option value="csv">CSV</option>
                        </select>
                        <button
                          type="button"
                          onClick={importCsvRedirects}
                          disabled={importRunning}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {importRunning ? 'Importing...' : 'Import CSV redirects'}
                        </button>
                      </div>
                    </div>
                    {importMessage ? (
                      <p className="mt-2 text-xs text-gray-500">{importMessage}</p>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">From</th>
                          <th className="px-5 py-3 text-left font-semibold">To</th>
                          <th className="px-5 py-3 text-left font-semibold">Type</th>
                          <th className="px-5 py-3 text-left font-semibold">Status</th>
                          <th className="px-5 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {redirects.length ? (
                          paginate(redirects, redirectsPage).map((row) => {
                            const draft = editRedirects[row.id] ?? {
                              to: row.to_path,
                              type: row.redirect_type || '301',
                              status: row.status || 'active',
                            };
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3">{row.from_path}</td>
                                <td className="px-5 py-3">
                                  <input
                                    value={draft.to}
                                    onChange={(event) =>
                                      updateEditRedirect(row.id, 'to', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  />
                                </td>
                                <td className="px-5 py-3">
                                  <select
                                    value={draft.type}
                                    onChange={(event) =>
                                      updateEditRedirect(row.id, 'type', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  >
                                    <option value="301">301</option>
                                    <option value="302">302</option>
                                    <option value="307">307</option>
                                    <option value="308">308</option>
                                  </select>
                                </td>
                                <td className="px-5 py-3">
                                  <select
                                    value={draft.status}
                                    onChange={(event) =>
                                      updateEditRedirect(row.id, 'status', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  >
                                    <option value="active">Active</option>
                                    <option value="disabled">Disabled</option>
                                    <option value="conflict">Conflict</option>
                                  </select>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveManualRedirect(
                                          row.id,
                                          row.to_path,
                                          row.redirect_type || '301',
                                          row.status || 'active'
                                        )
                                      }
                                      className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteManualRedirect(row.id)}
                                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                              No manual redirects yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                    <span>
                      Showing {Math.min(pageSize, redirects.length)} of {redirects.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRedirectsPage((page) => Math.max(1, page - 1))}
                        disabled={redirectsPage === 1}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Prev
                      </button>
                      <span>
                        Page {redirectsPage} of {getTotalPages(redirects.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRedirectsPage((page) =>
                            Math.min(getTotalPages(redirects.length), page + 1)
                          )
                        }
                        disabled={redirectsPage >= getTotalPages(redirects.length)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Add manual redirect</h3>
          <p className="mt-1 text-xs text-gray-500">
            Manual redirects take precedence when a missing path is requested.
          </p>
          <div className="mt-4 space-y-3">
            <input
              value={fromPath}
              onChange={(event) => setFromPath(event.target.value)}
              placeholder="/old-url"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={toPath}
              onChange={(event) => setToPath(event.target.value)}
              placeholder="/new-url"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateRedirect}
              className="w-full rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
            >
              Save redirect
            </button>
            {statusMessage ? (
              <p className="text-xs text-gray-500">{statusMessage}</p>
            ) : null}
            {actionMessage ? (
              <p className="text-xs text-gray-500">{actionMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Manual redirects</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">From</th>
                  <th className="px-5 py-3 text-left font-semibold">To</th>
                  <th className="px-5 py-3 text-left font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {redirects.length ? (
                  redirects.map((row) => {
                    const draft = editRedirects[row.id] ?? {
                      to: row.to_path,
                      type: row.redirect_type || '301',
                      status: row.status || 'active',
                    };
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">{row.from_path}</td>
                        <td className="px-5 py-3">
                          <input
                            value={draft.to}
                            onChange={(event) =>
                              updateEditRedirect(row.id, 'to', event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={draft.type}
                            onChange={(event) =>
                              updateEditRedirect(row.id, 'type', event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          >
                            <option value="301">301</option>
                            <option value="302">302</option>
                            <option value="307">307</option>
                            <option value="308">308</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateEditRedirect(row.id, 'status', event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                            <option value="conflict">Conflict</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                saveManualRedirect(
                                  row.id,
                                  row.to_path,
                                  row.redirect_type || '301',
                                  row.status || 'active'
                                )
                              }
                              className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteManualRedirect(row.id)}
                              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                            >
                              Delete
                            </button>
                          </div>
                          <p className="mt-2 text-[10px] text-gray-400">
                            Source: {row.source || 'manual'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                      No manual redirects yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Redirect conflicts</h3>
          <p className="text-xs text-gray-500">
            These redirects point to paths that now exist. Review and disable or re-enable.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">From</th>
                <th className="px-5 py-3 text-left font-semibold">To</th>
                <th className="px-5 py-3 text-left font-semibold">Conflict</th>
                <th className="px-5 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {conflicts.length ? (
                conflicts.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">{row.from_path}</td>
                    <td className="px-5 py-3">{row.to_path}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {row.conflict_target}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateRedirectStatus(row.id, 'disabled')}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                        >
                          Disable
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRedirectStatus(row.id, 'active')}
                          className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
                        >
                          Keep active
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                    No conflicts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
