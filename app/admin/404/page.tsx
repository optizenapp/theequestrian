'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';

interface RollupRow {
  path: string;
  source: string;
  hit_count: number;
  ga4_views: number;
  first_seen: string;
  last_seen: string;
  latest_referrer: string | null;
  suggested_to: string | null;
  suggested_type: string | null;
  confidence: number | null;
  suggested_reason: string | null;
  status: string | null;
}

interface NotFoundData {
  rollupTotal: number;
  rollupHits: number;
  rollup: RollupRow[];
  internalDaily: Array<{
    day: string;
    hits: number;
  }>;
  ga4Total: number;
  ga4Rows: Array<{
    path: string;
    views: number;
    users: number;
    last_seen: string;
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
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ManualRedirect[]>([]);
  const [attempting, setAttempting] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'internal' | 'redirects' | 'ga4'>('internal');
  const [internalPage, setInternalPage] = useState(1);
  const [redirectsPage, setRedirectsPage] = useState(1);
  const [ga4Page, setGa4Page] = useState(1);
  const pageSize = 20;
  const [redirectDrafts, setRedirectDrafts] = useState<Record<string, string>>({});
  const [redirectSaving, setRedirectSaving] = useState<Record<string, boolean>>({});
  const [redirectTypeDrafts, setRedirectTypeDrafts] = useState<Record<string, string>>({});
  const [editRedirects, setEditRedirects] = useState<
    Record<string, { to: string; type: string; status: string }>
  >({});
  const [resolvedRollup, setResolvedRollup] = useState<Set<string>>(new Set());
  const [redirectSourceFilter, setRedirectSourceFilter] = useState<'all' | 'manual' | 'csv'>('all');
  const [importRunning, setImportRunning] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [upload404File, setUpload404File] = useState<File | null>(null);
  const [import404Running, setImport404Running] = useState(false);
  const [import404Message, setImport404Message] = useState<string | null>(null);
  const [refreshRunning, setRefreshRunning] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [rollupStatusFilter, setRollupStatusFilter] = useState<
    'open' | 'all' | 'pending' | 'manual' | 'ignored'
  >('open');
  const [rollupSourceFilter, setRollupSourceFilter] = useState<
    'all' | 'internal' | 'ga4' | 'scan' | 'mixed'
  >('all');
  const [hideSuggested, setHideSuggested] = useState(true);
  const [rollupSearch, setRollupSearch] = useState('');
  const [redirectSearch, setRedirectSearch] = useState('');
  const [ga4Search, setGa4Search] = useState('');

  useEffect(() => {
    fetchData();
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    fetchConflicts();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch('/api/admin/404');
    const payload = await res.json();
    setData(payload);
    setIsLoading(false);
    setInternalPage(1);
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


  const refreshSuggestions = async () => {
    setRefreshMessage(null);
    setRefreshRunning(true);
    try {
      const res = await fetch('/api/admin/404/recalculate', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setRefreshMessage(payload?.error || 'Failed to refresh suggestions.');
        return;
      }
      setRefreshMessage(`Suggestions refreshed. Updated: ${payload.updated || 0}.`);
      fetchData();
    } catch (error) {
      setRefreshMessage('Failed to refresh suggestions.');
    } finally {
      setRefreshRunning(false);
    }
  };

  const paginate = <T,>(items: T[], page: number) => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const getTotalPages = (count: number) => Math.max(1, Math.ceil(count / pageSize));

  const visibleRollup = data
    ? data.rollup.filter((row) => {
        if (resolvedRollup.has(row.path)) return false;
        const status = row.status || 'pending';
        if (rollupStatusFilter === 'open' && status === 'ignored') return false;
        if (rollupStatusFilter !== 'open' && rollupStatusFilter !== 'all' && status !== rollupStatusFilter) {
          return false;
        }
        if (rollupSourceFilter !== 'all' && row.source !== rollupSourceFilter) {
          return false;
        }
        if (hideSuggested && row.suggested_to) {
          return false;
        }
        // Search filter
        if (rollupSearch) {
          const searchLower = rollupSearch.toLowerCase();
          const matchesPath = row.path.toLowerCase().includes(searchLower);
          const matchesSuggestion = row.suggested_to?.toLowerCase().includes(searchLower);
          const matchesReferrer = row.latest_referrer?.toLowerCase().includes(searchLower);
          if (!matchesPath && !matchesSuggestion && !matchesReferrer) {
            return false;
          }
        }
        return true;
      })
    : [];

  const filteredRedirects = redirects.filter((redirect) => {
    if (!redirectSearch) return true;
    const searchLower = redirectSearch.toLowerCase();
    const matchesFrom = redirect.from_path.toLowerCase().includes(searchLower);
    const matchesTo = redirect.to_path.toLowerCase().includes(searchLower);
    return matchesFrom || matchesTo;
  });

  const filteredGa4Rows = data?.ga4Rows
    ? data.ga4Rows.filter((row) => {
        if (!ga4Search) return true;
        const searchLower = ga4Search.toLowerCase();
        return row.path.toLowerCase().includes(searchLower);
      })
    : [];

  const handleCreateRedirect = async () => {
    setStatusMessage(null);
    setActionMessage(null);
    if (!fromPath || !toPath) {
      setStatusMessage('Please enter both from and to paths.');
      return;
    }
    const type = redirectTypeDrafts['new'] || '301';
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromPath, to: toPath, type }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setStatusMessage(payload?.error || 'Failed to create redirect.');
      return;
    }
    setFromPath('');
    setToPath('');
    setRedirectTypeDrafts((prev) => ({ ...prev, new: '301' }));
    setStatusMessage(`Redirect added: ${payload.redirect.from} → ${payload.redirect.to}`);
    setRedirectsPage(1);
    await fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
  };


  const applyRollupSuggestion = (path: string, to: string, type?: string | null) => {
    setRedirectDrafts((prev) => ({ ...prev, [path]: to }));
    setRedirectTypeDrafts((prev) => ({ ...prev, [path]: type || '301' }));
  };

  const approveRollupSuggestion = async (row: RollupRow) => {
    if (!row.suggested_to) return;
    setAttempting((prev) => ({ ...prev, [row.path]: true }));
    const res = await fetch('/api/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: row.path,
        to: row.suggested_to,
        type: row.suggested_type || '301',
      }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to save redirect.');
      setAttempting((prev) => ({ ...prev, [row.path]: false }));
      return;
    }
    setActionMessage(`Redirect added: ${payload.redirect.from} → ${payload.redirect.to}`);
    setResolvedRollup((prev) => new Set(prev).add(row.path));
    fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    setAttempting((prev) => ({ ...prev, [row.path]: false }));
  };

  const updateRedirectStatus = async (id: number, status: 'active' | 'disabled' | 'override') => {
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

  const saveConflictRedirect = async (row: ManualRedirect) => {
    setActionMessage(null);
    const draft = editRedirects[row.id];
    const to = draft?.to || row.to_path;
    const type = draft?.type || row.redirect_type || '301';
    const res = await fetch(`/api/admin/redirects/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type, status: 'override' }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionMessage(payload?.error || 'Failed to update redirect.');
      return;
    }
    setActionMessage('Redirect saved and kept active.');
    await fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    await fetchConflicts();
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
    setResolvedRollup((prev) => new Set(prev).add(key));
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
    setActionMessage(null);
    setStatusMessage(null);
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
    await fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
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
      let res;
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        res = await fetch('/api/admin/redirects/import', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/redirects/import', { method: 'POST' });
      }
      const payload = await res.json();
      if (!res.ok) {
        setImportMessage(payload?.error || 'Failed to import redirects.');
        return;
      }
      setImportMessage(`Imported ${payload.imported} redirects from CSV.`);
      setUploadFile(null);
      setRedirectsPage(1);
      await fetchRedirects(redirectSourceFilter === 'all' ? undefined : redirectSourceFilter);
    } catch (error) {
      setImportMessage('Failed to import redirects.');
    } finally {
      setImportRunning(false);
    }
  };

  const import404Csv = async () => {
    setImport404Message(null);
    setImport404Running(true);
    try {
      if (!upload404File) {
        setImport404Message('Please select a CSV file.');
        return;
      }
      const formData = new FormData();
      formData.append('file', upload404File);
      const res = await fetch('/api/admin/404/import', {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        setImport404Message(payload?.error || 'Failed to import 404s.');
        return;
      }
      setImport404Message(`Imported ${payload.imported} 404 entries from CSV.`);
      setUpload404File(null);
      setInternalPage(1);
      await fetchData();
    } catch (error) {
      setImport404Message('Failed to import 404s.');
    } finally {
      setImport404Running(false);
    }
  };

  return (
    <AdminLayout title="404 Monitor" subtitle="Track missing pages and add current redirects">
      {refreshMessage ? (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500 shadow-sm">
          {refreshMessage}
        </div>
      ) : null}
      {isLoading || !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          Loading 404 data...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label="Open 404 paths"
              value={data.rollupTotal.toLocaleString()}
              helper="Not fixed yet (excluding applied redirects)"
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
                Unified 404s
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
            </div>

            {activeTab === 'internal' ? (
              <div className="p-5">
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Unified 404 table</h3>
                    <p className="text-xs text-gray-500">
                      Deduped by path with suggestions and status.
                    </p>
                    <div className="mt-3 mb-3">
                      <input
                        type="text"
                        placeholder="Search URLs, suggestions, or referrers..."
                        value={rollupSearch}
                        onChange={(e) => {
                          setRollupSearch(e.target.value);
                          setInternalPage(1);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <a
                        href="/api/admin/404/export"
                        download="404s.csv"
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                      >
                        Download CSV
                      </a>
                      <label className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 cursor-pointer">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setUpload404File(file);
                            }
                          }}
                          className="hidden"
                        />
                        {upload404File ? upload404File.name : 'Choose CSV file'}
                      </label>
                      <button
                        type="button"
                        onClick={import404Csv}
                        disabled={import404Running || !upload404File}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {import404Running ? 'Importing...' : 'Upload & import'}
                      </button>
                      <button
                        type="button"
                        onClick={refreshSuggestions}
                        disabled={refreshRunning}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {refreshRunning ? 'Refreshing...' : 'Refresh suggestions'}
                      </button>
                      <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={hideSuggested}
                          onChange={(event) => setHideSuggested(event.target.checked)}
                          className="h-3 w-3"
                        />
                        Hide suggested
                      </label>
                      <select
                        value={rollupStatusFilter}
                        onChange={(event) =>
                          setRollupStatusFilter(
                            event.target.value as 'open' | 'all' | 'pending' | 'manual' | 'ignored'
                          )
                        }
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs"
                      >
                        <option value="open">Open (exclude ignored)</option>
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="manual">Current</option>
                        <option value="ignored">Ignored</option>
                      </select>
                      <select
                        value={rollupSourceFilter}
                        onChange={(event) =>
                          setRollupSourceFilter(
                            event.target.value as 'all' | 'internal' | 'ga4' | 'scan' | 'mixed'
                          )
                        }
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs"
                      >
                        <option value="all">All sources</option>
                        <option value="internal">Internal</option>
                        <option value="ga4">GA4</option>
                        <option value="scan">Scan</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    {import404Message && (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700">
                        {import404Message}
                      </div>
                    )}
                  </div>
                  <div>
                    <table className="w-full table-fixed text-xs">
                      <colgroup>
                        <col className="w-[52%]" />
                        <col className="w-[26%]" />
                        <col className="hidden md:table-column w-[10%]" />
                        <col className="w-[12%]" />
                      </colgroup>
                      <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">URL</th>
                          <th className="px-5 py-3 text-left font-semibold">Redirect to</th>
                          <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Type</th>
                          <th className="px-3 py-3 text-left font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {visibleRollup.length ? (
                          paginate(visibleRollup, internalPage).map((row) => {
                            const key = row.path;
                            return (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="px-5 py-3 align-top break-all">
                                  <div className="font-medium text-gray-900">{row.path}</div>
                                  <div className="mt-1 space-y-1 text-[10px] text-gray-400">
                                    <div>{row.latest_referrer || 'Direct / Unknown'}</div>
                                    <div>
                                      {row.source} · {row.hit_count.toLocaleString()} hits
                                      {row.ga4_views ? ` · ${row.ga4_views.toLocaleString()} GA4` : ''}
                                    </div>
                                    <div>{new Date(row.last_seen).toLocaleString()}</div>
                                    <div>Status: {row.status || 'pending'}</div>
                                  </div>
                                  {row.suggested_to ? (
                                    <div className="mt-2 flex flex-col gap-2 text-[10px] text-gray-500">
                                      <span className="break-all">
                                        Suggestion: {row.suggested_to}
                                      </span>
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            applyRollupSuggestion(
                                              row.path,
                                              row.suggested_to || '',
                                              row.suggested_type
                                            )
                                          }
                                          className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 hover:border-gray-300"
                                        >
                                          Use suggestion
                                        </button>
                                        <button
                                          type="button"
                                          disabled={attempting[row.path]}
                                          onClick={() => approveRollupSuggestion(row)}
                                          className="rounded-full bg-action px-3 py-1 font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {attempting[row.path] ? 'Saving...' : 'Approve redirect'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-[10px] text-gray-400">No suggestion yet</div>
                                  )}
                                </td>
                                <td className="px-5 py-3 align-top">
                                  <input
                                    value={redirectDrafts[key] || ''}
                                    onChange={(event) => updateRedirectDraft(key, event.target.value)}
                                    placeholder="/new-url"
                                    className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  />
                                </td>
                                <td className="px-5 py-3 hidden md:table-cell">
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
                                <td className="px-3 py-3 align-top">
                                  <div className="flex flex-col items-end gap-2">
                                    <button
                                      type="button"
                                      disabled={redirectSaving[key]}
                                      onClick={() => saveRedirectFromRow(key, row.path)}
                                      className="inline-flex items-center justify-center rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {redirectSaving[key] ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={11} className="px-5 py-8 text-center text-sm text-gray-500">
                              No 404 rollup entries yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                    <span>
                      Showing {Math.min(pageSize, visibleRollup.length)} of {visibleRollup.length}
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
                        Page {internalPage} of {getTotalPages(visibleRollup.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setInternalPage((page) =>
                            Math.min(getTotalPages(visibleRollup.length), page + 1)
                          )
                        }
                        disabled={internalPage >= getTotalPages(visibleRollup.length)}
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
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Current Redirects</h3>
                      <p className="text-xs text-gray-500">
                        Manual redirects take precedence when a missing path is requested.
                      </p>
                    </div>
                    <div className="mt-3 mb-3">
                      <input
                        type="text"
                        placeholder="Search from or to paths..."
                        value={redirectSearch}
                        onChange={(e) => {
                          setRedirectSearch(e.target.value);
                          setRedirectsPage(1);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
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
                          <option value="manual">Current</option>
                          <option value="csv">CSV</option>
                        </select>
                        <a
                          href="/api/admin/redirects/export"
                          download="redirects.csv"
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                        >
                          Download CSV
                        </a>
                        <label className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 cursor-pointer">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                setUploadFile(file);
                              }
                            }}
                            className="hidden"
                          />
                          {uploadFile ? uploadFile.name : 'Choose CSV file'}
                        </label>
                        <button
                          type="button"
                          onClick={importCsvRedirects}
                          disabled={importRunning || !uploadFile}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {importRunning ? 'Importing...' : 'Upload & import'}
                        </button>
                        <button
                          type="button"
                          onClick={importCsvRedirects}
                          disabled={importRunning}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {importRunning ? 'Importing...' : 'Import from files'}
                        </button>
                      </div>
                    {importMessage ? (
                      <p className="mt-2 text-xs text-gray-500">{importMessage}</p>
                    ) : null}
                    {statusMessage ? (
                      <p className="mt-2 text-xs text-gray-500">{statusMessage}</p>
                    ) : null}
                    {actionMessage ? (
                      <p className="mt-1 text-xs text-gray-500">{actionMessage}</p>
                    ) : null}
                  </div>
                  <div>
                    <table className="w-full table-fixed text-xs">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">From</th>
                          <th className="px-5 py-3 text-left font-semibold">To</th>
                          <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Type</th>
                          <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Status</th>
                          <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Added</th>
                          <th className="px-5 py-3 text-left font-semibold w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        <tr className="bg-gray-50/60">
                          <td className="px-5 py-3 align-top break-words">
                            <input
                              value={fromPath}
                              onChange={(event) => setFromPath(event.target.value)}
                              placeholder="/old-url"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </td>
                          <td className="px-5 py-3 align-top">
                            <input
                              value={toPath}
                              onChange={(event) => setToPath(event.target.value)}
                              placeholder="/new-url"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                            <div className="mt-2 md:hidden">
                              <select
                                value={redirectTypeDrafts['new'] || '301'}
                                onChange={(event) =>
                                  updateRedirectTypeDraft('new', event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                              >
                                <option value="301">301</option>
                                <option value="302">302</option>
                                <option value="307">307</option>
                                <option value="308">308</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <select
                              value={redirectTypeDrafts['new'] || '301'}
                              onChange={(event) =>
                                updateRedirectTypeDraft('new', event.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            >
                              <option value="301">301</option>
                              <option value="302">302</option>
                              <option value="307">307</option>
                              <option value="308">308</option>
                            </select>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">new</td>
                          <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">—</td>
                          <td className="px-5 py-3 w-40">
                            <button
                              type="button"
                              onClick={handleCreateRedirect}
                              className="w-full max-w-[120px] rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                        {filteredRedirects.length ? (
                          paginate(filteredRedirects, redirectsPage).map((row) => {
                            const draft = editRedirects[row.id] ?? {
                              to: row.to_path,
                              type: row.redirect_type || '301',
                              status: row.status || 'active',
                            };
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3 align-top break-words space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span>{row.from_path}</span>
                                    <a
                                      href={row.from_path}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                      Test URL
                                    </a>
                                  </div>
                                  <div className="text-[10px] text-gray-400 md:hidden">
                                    {draft.status || 'active'} · {draft.type}
                                  </div>
                                  <div className="mt-1 text-[10px] text-gray-400 lg:hidden">
                                    Added: {new Date(row.created_at).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-5 py-3 align-top">
                                  <input
                                    value={draft.to}
                                    onChange={(event) =>
                                      updateEditRedirect(row.id, 'to', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  />
                                  <div className="mt-2 md:hidden">
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
                                  </div>
                                  <div className="mt-2 md:hidden">
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
                                      <option value="override">Override (keep active)</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="px-5 py-3 hidden md:table-cell">
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
                                <td className="px-5 py-3 hidden md:table-cell">
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
                                    <option value="override">Override (keep active)</option>
                                  </select>
                                </td>
                                <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-500">
                                  {new Date(row.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-col gap-2 items-start">
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
                              No current redirects yet.
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
                        Page {redirectsPage} of {getTotalPages(filteredRedirects.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRedirectsPage((page) =>
                            Math.min(getTotalPages(filteredRedirects.length), page + 1)
                          )
                        }
                        disabled={redirectsPage >= getTotalPages(filteredRedirects.length)}
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
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">GA4 404 table</h3>
                      <p className="text-xs text-gray-500">
                        Latest GA4 404 paths synced into a dedicated table.
                      </p>
                    </div>
                    <div className="mt-3 mb-3">
                      <input
                        type="text"
                        placeholder="Search GA4 paths..."
                        value={ga4Search}
                        onChange={(e) => {
                          setGa4Search(e.target.value);
                          setGa4Page(1);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <table className="w-full table-fixed text-xs">
                      <colgroup>
                        <col className="w-[60%]" />
                        <col className="w-[14%]" />
                        <col className="w-[14%]" />
                        <col className="w-[12%]" />
                      </colgroup>
                      <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 text-left font-semibold">URL</th>
                          <th className="px-5 py-3 text-left font-semibold">Views</th>
                          <th className="px-5 py-3 text-left font-semibold">Users</th>
                          <th className="px-5 py-3 text-left font-semibold">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredGa4Rows.length ? (
                          paginate(filteredGa4Rows, ga4Page).map((row) => (
                            <tr key={row.path} className="hover:bg-gray-50">
                              <td className="px-5 py-3 break-all font-medium text-gray-900">
                                {row.path}
                              </td>
                              <td className="px-5 py-3">{row.views.toLocaleString()}</td>
                              <td className="px-5 py-3">{row.users.toLocaleString()}</td>
                              <td className="px-5 py-3">
                                {new Date(row.last_seen).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                              No GA4 404 rows yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500">
                    <span>
                      Showing {Math.min(pageSize, filteredGa4Rows.length)} of {filteredGa4Rows.length}
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
                        Page {ga4Page} of {getTotalPages(filteredGa4Rows.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setGa4Page((page) =>
                            Math.min(getTotalPages(filteredGa4Rows.length), page + 1)
                          )
                        }
                        disabled={ga4Page >= getTotalPages(filteredGa4Rows.length)}
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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Redirect conflicts</h3>
          <p className="text-xs text-gray-500">
            These redirects point to paths that now exist. Disable them or keep them active to force a
            redirect anyway.
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
                conflicts.map((row) => {
                  const draft = editRedirects[row.id] ?? {
                    to: row.to_path,
                    type: row.redirect_type || '301',
                    status: row.status || 'conflict',
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
                            onClick={() => saveConflictRedirect(row)}
                            className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600"
                          >
                            Save & keep active
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
