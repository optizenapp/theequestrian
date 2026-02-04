'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface ClassificationResult {
  shopify_id: string;
  handle: string;
  title: string;
  vendor: string;
  current_type: string;
  suggested_type: string;
  confidence: number;
  openai_type: string;
  openai_confidence: number;
  claude_type: string;
  claude_confidence: number;
  both_agree: boolean;
  needs_review: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

export default function AIClassificationsPage() {
  const [classifications, setClassifications] = useState<ClassificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'applied'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_review' | 'agreed'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [runLimit, setRunLimit] = useState(50);
  const [runStart, setRunStart] = useState(0);
  const [runDryRun, setRunDryRun] = useState(false);
  const [runRunning, setRunRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [lastStats, setLastStats] = useState<any>(null);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClassifications();
    fetchAvailableTypes();
  }, []);

  const fetchClassifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/ai-classifications');
      const data = await res.json();
      setClassifications(data.classifications || []);
    } catch (error) {
      console.error('Error fetching classifications:', error);
      setMessage('Failed to load classifications');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableTypes = async () => {
    try {
      const res = await fetch('/api/admin/product-types');
      const data = await res.json();
      setAvailableTypes(data.types || []);
    } catch (error) {
      console.error('Error fetching product types:', error);
    }
  };

  const updateStatus = async (shopifyId: string, status: 'approved' | 'rejected' | 'pending', manualType?: string) => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ai-classifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shopify_id: shopifyId, 
          status,
          manual_override: manualType 
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error || 'Failed to update status');
        return;
      }
      
      setMessage(manualType ? `Classification updated with manual type: ${manualType}` : `Classification ${status}`);
      setEditingId(null);
      setManualOverride('');
      setSearchTerm('');
      await fetchClassifications();
    } catch (error) {
      setMessage('Failed to update status');
    }
  };

  const handleManualApprove = (shopifyId: string) => {
    if (!manualOverride) {
      setMessage('Please select a product type');
      return;
    }
    updateStatus(shopifyId, 'approved', manualOverride);
  };

  const applyToShopify = async (shopifyId: string, suggestedType: string) => {
    setMessage(null);
    setApplying(prev => new Set(prev).add(shopifyId));
    
    try {
      const res = await fetch('/api/admin/ai-classifications/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify_id: shopifyId, product_type: suggestedType }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        setMessage(error.error || 'Failed to apply to Shopify');
        return;
      }
      
      setMessage('Product type updated in Shopify');
      await fetchClassifications();
    } catch (error) {
      setMessage('Failed to apply to Shopify');
    } finally {
      setApplying(prev => {
        const next = new Set(prev);
        next.delete(shopifyId);
        return next;
      });
    }
  };

  const applyAllApproved = async () => {
    setMessage(null);
    const approved = classifications.filter(c => c.status === 'approved');
    
    if (approved.length === 0) {
      setMessage('No approved classifications to apply');
      return;
    }

    if (!confirm(`Apply ${approved.length} approved classifications to Shopify?`)) {
      return;
    }

    let success = 0;
    let failed = 0;

    for (const classification of approved) {
      setApplying(prev => new Set(prev).add(classification.shopify_id));
      
      try {
        const res = await fetch('/api/admin/ai-classifications/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shopify_id: classification.shopify_id, 
            product_type: classification.suggested_type 
          }),
        });
        
        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
      
      setApplying(prev => {
        const next = new Set(prev);
        next.delete(classification.shopify_id);
        return next;
      });
    }

    setMessage(`Applied ${success} classifications. ${failed > 0 ? `${failed} failed.` : ''}`);
    await fetchClassifications();
  };

  const runClassifier = async () => {
    setRunMessage(null);
    setRunRunning(true);
    try {
      const res = await fetch('/api/admin/ai-classifications/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: runLimit,
          start: runStart,
          dryRun: runDryRun,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setRunMessage(payload?.error || 'Failed to start classifier.');
        return;
      }
      setRunMessage(payload?.message || 'Classifier finished.');
      setTimeout(() => {
        setRunRunning(false);
        fetchLogs();
      }, 500);
    } catch (error) {
      setRunMessage('Failed to start classifier.');
      setRunRunning(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/ai-classifications/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setLastStats(data.lastStats);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const filteredClassifications = classifications.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (reviewFilter === 'needs_review' && !c.needs_review) return false;
    if (reviewFilter === 'agreed' && c.needs_review) return false;
    return true;
  });

  const stats = {
    total: classifications.length,
    pending: classifications.filter(c => c.status === 'pending').length,
    approved: classifications.filter(c => c.status === 'approved').length,
    rejected: classifications.filter(c => c.status === 'rejected').length,
    applied: classifications.filter(c => c.status === 'applied').length,
    needsReview: classifications.filter(c => c.needs_review).length,
    bothAgree: classifications.filter(c => c.both_agree).length,
  };

  return (
    <AdminLayout title="AI Product Classifications" subtitle="Review and approve AI-suggested product types">
      {message && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      )}
      {runMessage && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {runMessage}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-gray-900">Run classifier</div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                <span>Start</span>
                <input
                  type="number"
                  min={0}
                  value={runStart}
                  onChange={(event) => setRunStart(Number(event.target.value))}
                  className="w-20 bg-transparent text-xs text-gray-700 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                <span>Limit</span>
                <input
                  type="number"
                  min={1}
                  value={runLimit}
                  onChange={(event) => setRunLimit(Number(event.target.value))}
                  className="w-20 bg-transparent text-xs text-gray-700 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={runDryRun}
                  onChange={(event) => setRunDryRun(event.target.checked)}
                  className="h-3 w-3"
                />
                Dry run (no save)
              </label>
            </div>
            <button
              type="button"
              onClick={runClassifier}
              disabled={runRunning}
              className="rounded-full bg-action px-4 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runRunning ? 'Running…' : 'Run classifier'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
            >
              Refresh status
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLogs(!showLogs);
                if (!showLogs) fetchLogs();
              }}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
            >
              {showLogs ? 'Hide logs' : 'View logs'}
            </button>
          </div>
        </div>
        {lastStats && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <div className="text-gray-600">
              <span className="font-semibold">Last run:</span>{' '}
              {lastStats.total > 0 ? (
                <>
                  {lastStats.total} classified, {lastStats.bothAgree} agreed, {lastStats.needsReview} need review
                  {lastStats.avgConfidence > 0 && ` (${lastStats.avgConfidence.toFixed(1)}% avg confidence)`}
                  {lastStats.dryRun && <span className="ml-2 text-orange-600">(dry run - not saved)</span>}
                  {!lastStats.dryRun && <span className="ml-2 text-green-600">✓ Saved to database</span>}
                </>
              ) : (
                <span>Starting...</span>
              )}
              {lastStats.running && <span className="ml-2 text-blue-600 animate-pulse">● Running...</span>}
            </div>
          </div>
        )}
        {showLogs && (
          <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
            <pre className="whitespace-pre-wrap text-[10px] text-gray-700">{logs || 'No logs yet'}</pre>
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-500">
          This starts the server-side script and saves results to the database for review.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-500">Pending Review</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-xs text-gray-500">Approved</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
          <div className="text-xs text-gray-500">Applied to Shopify</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.needsReview}</div>
          <div className="text-xs text-gray-500">Needs Review (AIs disagree)</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Classifications</h3>
              <p className="text-xs text-gray-500">Review and approve product type suggestions</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="applied">Applied</option>
              </select>
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value as any)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                <option value="all">All</option>
                <option value="needs_review">Needs Review</option>
                <option value="agreed">Both AIs Agree</option>
              </select>
              <button
                onClick={applyAllApproved}
                disabled={stats.approved === 0}
                className="rounded-full bg-action px-4 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply All Approved ({stats.approved})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Product</th>
                <th className="px-5 py-3 text-left font-semibold">Current Type</th>
                <th className="px-5 py-3 text-left font-semibold">Suggested Type</th>
                <th className="px-5 py-3 text-left font-semibold">AI Details</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    Loading classifications...
                  </td>
                </tr>
              ) : filteredClassifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No classifications found. Run the classifier with dry run off to save results.
                  </td>
                </tr>
              ) : (
                filteredClassifications.map((classification) => (
                  <tr key={classification.shopify_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{classification.title}</div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {classification.vendor} • {classification.handle}
                      </div>
                      <a
                        href={`https://www.theequestrian.com.au/products/${classification.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View product →
                      </a>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {classification.current_type || <span className="text-gray-400">(empty)</span>}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === classification.shopify_id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Search product types..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <select
                            value={manualOverride}
                            onChange={(e) => setManualOverride(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            size={5}
                          >
                            <option value="">-- Select Type --</option>
                            {availableTypes
                              .filter((type) =>
                                searchTerm
                                  ? type.toLowerCase().includes(searchTerm.toLowerCase())
                                  : true
                              )
                              .map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">{classification.suggested_type}</div>
                          <div className="mt-1 text-[10px] text-gray-400">
                            {classification.confidence}% confidence
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-1 text-[10px]">
                        <div className={classification.both_agree ? 'text-green-600' : 'text-orange-600'}>
                          {classification.both_agree ? '✓ Both AIs agree' : '⚠ AIs disagree'}
                        </div>
                        <div className="text-gray-500">
                          OpenAI: {classification.openai_type} ({classification.openai_confidence}%)
                        </div>
                        <div className="text-gray-500">
                          Claude: {classification.claude_type} ({classification.claude_confidence}%)
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                          classification.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : classification.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : classification.status === 'applied'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {classification.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-2">
                        {classification.status === 'pending' && (
                          <>
                            {editingId === classification.shopify_id ? (
                              <>
                                <button
                                  onClick={() => handleManualApprove(classification.shopify_id)}
                                  disabled={!manualOverride}
                                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Approve Manual
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setManualOverride('');
                                    setSearchTerm('');
                                  }}
                                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => updateStatus(classification.shopify_id, 'approved')}
                                  className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(classification.shopify_id);
                                    setManualOverride(classification.suggested_type);
                                  }}
                                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Edit Type
                                </button>
                                <button
                                  onClick={() => updateStatus(classification.shopify_id, 'rejected')}
                                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {classification.status === 'approved' && (
                          <button
                            onClick={() => applyToShopify(classification.shopify_id, classification.suggested_type)}
                            disabled={applying.has(classification.shopify_id)}
                            className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {applying.has(classification.shopify_id) ? 'Applying...' : 'Apply to Shopify'}
                          </button>
                        )}
                        {classification.status === 'applied' && (
                          <span className="text-[10px] text-green-600">✓ Applied</span>
                        )}
                        {classification.status === 'rejected' && (
                          <button
                            onClick={() => updateStatus(classification.shopify_id, 'pending')}
                            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
