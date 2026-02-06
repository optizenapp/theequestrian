'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

type Scan = {
  id: number;
  page_type: string;
  page_url: string;
  scan_date: string;
  strategy: string;
  performance_score: number;
  accessibility_score: number;
  best_practices_score: number;
  seo_score: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si: number;
  status: string;
  ai_analyzed_at: string | null;
};

type Opportunity = {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue: string;
};

type Diagnostic = {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue: string;
};

type Recommendation = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  code_example?: string;
  file_location?: string;
  expected_impact: string;
  implementation_notes?: string;
};

type AIRecommendations = {
  summary: string;
  priority_issues: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    impact: string;
    metric: string;
  }>;
  recommendations: Recommendation[];
};

const PAGE_TYPES = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'collection', label: 'Collection Page (e.g., /horse)' },
  { value: 'subcollection', label: 'Subcollection Page (e.g., /horse/boots)' },
  { value: 'product', label: 'Product Page' },
  { value: 'brand', label: 'Brand Page' },
  { value: 'on-sale', label: 'On Sale Page' },
  { value: 'custom', label: 'Custom URL' },
];

export default function PerformancePage() {
  const [pageType, setPageType] = useState('homepage');
  const [customUrl, setCustomUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mobileScan, setMobileScan] = useState<Scan | null>(null);
  const [desktopScan, setDesktopScan] = useState<Scan | null>(null);
  const [mobileOpportunities, setMobileOpportunities] = useState<Opportunity[]>([]);
  const [desktopOpportunities, setDesktopOpportunities] = useState<Opportunity[]>([]);
  const [mobileDiagnostics, setMobileDiagnostics] = useState<Diagnostic[]>([]);
  const [desktopDiagnostics, setDesktopDiagnostics] = useState<Diagnostic[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);
  const [history, setHistory] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/performance/history?limit=10');
      const data = await res.json();
      if (data.success) {
        setHistory(data.scans);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    setMobileScan(null);
    setDesktopScan(null);
    setMobileOpportunities([]);
    setDesktopOpportunities([]);
    setMobileDiagnostics([]);
    setDesktopDiagnostics([]);
    setAiRecommendations(null);

    try {
      const res = await fetch('/api/admin/performance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          customUrl: pageType === 'custom' ? customUrl : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setMobileScan(data.mobile.scan);
      setDesktopScan(data.desktop.scan);
      setMobileOpportunities(data.mobile.opportunities || []);
      setDesktopOpportunities(data.desktop.opportunities || []);
      setMobileDiagnostics(data.mobile.diagnostics || []);
      setDesktopDiagnostics(data.desktop.diagnostics || []);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scan');
    } finally {
      setIsScanning(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!mobileScan) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze mobile scan (primary)
      const res = await fetch('/api/admin/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: mobileScan.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAiRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze with AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadScan = async (scanId: number) => {
    try {
      const res = await fetch(`/api/admin/performance/${scanId}`);
      const data = await res.json();

      if (data.success) {
        const scan = data.scan;
        
        // Set the scan based on strategy
        if (scan.strategy === 'mobile') {
          setMobileScan(scan);
        } else {
          setDesktopScan(scan);
        }
        
        // Extract opportunities and diagnostics from raw_data
        const rawData = scan.raw_data;
        if (rawData?.lighthouseResult) {
          const opps = extractOpportunities(rawData.lighthouseResult);
          const diags = extractDiagnostics(rawData.lighthouseResult);
          
          if (scan.strategy === 'mobile') {
            setMobileOpportunities(opps);
            setMobileDiagnostics(diags);
          } else {
            setDesktopOpportunities(opps);
            setDesktopDiagnostics(diags);
          }
        }

        if (scan.ai_recommendations) {
          setAiRecommendations(scan.ai_recommendations);
        }
      }
    } catch (err) {
      console.error('Failed to load scan:', err);
    }
  };

  const extractOpportunities = (lighthouseResult: any): Opportunity[] => {
    const opportunities = [];
    const audits = lighthouseResult.audits;

    const opportunityKeys = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
    ];

    for (const key of opportunityKeys) {
      const audit = audits[key];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          id: key,
          title: audit.title,
          description: audit.description,
          score: Math.round((audit.score || 0) * 100),
          displayValue: audit.displayValue || '',
        });
      }
    }

    return opportunities;
  };

  const extractDiagnostics = (lighthouseResult: any): Diagnostic[] => {
    const diagnostics = [];
    const audits = lighthouseResult.audits;

    const diagnosticKeys = [
      'mainthread-work-breakdown',
      'bootup-time',
      'third-party-summary',
    ];

    for (const key of diagnosticKeys) {
      const audit = audits[key];
      if (audit) {
        diagnostics.push({
          id: key,
          title: audit.title,
          description: audit.description,
          score: Math.round((audit.score || 0) * 100),
          displayValue: audit.displayValue || '',
        });
      }
    }

    return diagnostics;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-rose-100 text-rose-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-blue-100 text-blue-700',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AdminLayout title="Performance" subtitle="PageSpeed Insights & AI recommendations">
      <div className="space-y-6">
        {/* Scan Controls */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Run Performance Scan</h3>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label className="flex-1 text-sm font-medium text-gray-600">
              Page Type
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                disabled={isScanning}
              >
                {PAGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {pageType === 'custom' && (
              <label className="flex-1 text-sm font-medium text-gray-600">
                Custom URL
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://www.theequestrian.com.au/..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
                  disabled={isScanning}
                />
              </label>
            )}

            <button
              onClick={runScan}
              disabled={isScanning || (pageType === 'custom' && !customUrl)}
              className="h-10 rounded-lg bg-action px-6 text-sm font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isScanning ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {isScanning && (
            <div className="mt-4 text-sm text-gray-500">
              Running PageSpeed Insights scans for mobile and desktop... This may take 60-90 seconds.
            </div>
          )}
        </div>

        {/* Scan Results */}
        {mobileScan && desktopScan && (
          <>
            {/* Mobile vs Desktop Toggle */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm font-semibold text-gray-900">📱 Mobile</span>
                <span className="text-gray-400">|</span>
                <span className="text-sm font-semibold text-gray-900">🖥️ Desktop</span>
              </div>
            </div>

            {/* Mobile Score Cards */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">📱 Mobile Performance</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Performance</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${getScoreColor(mobileScan.performance_score)}`}>
                    {mobileScan.performance_score}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Scanned: {new Date(mobileScan.scan_date).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Accessibility</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${getScoreColor(mobileScan.accessibility_score)}`}>
                    {mobileScan.accessibility_score}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">WCAG compliance</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Best Practices</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${getScoreColor(mobileScan.best_practices_score)}`}>
                    {mobileScan.best_practices_score}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Web standards</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">SEO</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${getScoreColor(mobileScan.seo_score)}`}>
                    {mobileScan.seo_score}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Search optimization</p>
                </div>
              </div>
            </div>

            {/* Mobile Core Web Vitals */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">📱 Mobile Core Web Vitals</h3>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <div>
                  <p className="text-xs text-gray-500">FCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(mobileScan.fcp).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">First Contentful Paint</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(mobileScan.lcp).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">Largest Contentful Paint</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">CLS</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(mobileScan.cls).toFixed(3)}</p>
                  <p className="text-xs text-gray-400">Cumulative Layout Shift</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">TBT</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(mobileScan.tbt).toFixed(0)}ms</p>
                  <p className="text-xs text-gray-400">Total Blocking Time</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">SI</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(mobileScan.si).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">Speed Index</p>
                </div>
              </div>
            </div>

            {/* Desktop Score Cards */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">🖥️ Desktop Performance</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Performance</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-semibold ${getScoreColor(desktopScan.performance_score)}`}>
                      {desktopScan.performance_score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Desktop</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Accessibility</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-semibold ${getScoreColor(desktopScan.accessibility_score)}`}>
                      {desktopScan.accessibility_score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">WCAG compliance</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Best Practices</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-semibold ${getScoreColor(desktopScan.best_practices_score)}`}>
                      {desktopScan.best_practices_score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Web standards</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">SEO</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-semibold ${getScoreColor(desktopScan.seo_score)}`}>
                      {desktopScan.seo_score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Search optimization</p>
                </div>
              </div>
            </div>

            {/* Desktop Core Web Vitals */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">🖥️ Desktop Core Web Vitals</h3>
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <div>
                  <p className="text-xs text-gray-500">FCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(desktopScan.fcp).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">First Contentful Paint</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">LCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(desktopScan.lcp).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">Largest Contentful Paint</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">CLS</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(desktopScan.cls).toFixed(3)}</p>
                  <p className="text-xs text-gray-400">Cumulative Layout Shift</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">TBT</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(desktopScan.tbt).toFixed(0)}ms</p>
                  <p className="text-xs text-gray-400">Total Blocking Time</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">SI</p>
                  <p className="text-2xl font-semibold text-gray-900">{Number(desktopScan.si).toFixed(2)}s</p>
                  <p className="text-xs text-gray-400">Speed Index</p>
                </div>
              </div>
            </div>

            {/* Mobile Opportunities & Diagnostics */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">📱 Mobile Issues</h3>
              <div className="grid gap-6 lg:grid-cols-2">
                <DataTable
                  title="Opportunities"
                  columns={[
                    { key: 'title', header: 'Issue' },
                    { key: 'score', header: 'Score' },
                  ]}
                  rows={mobileOpportunities.map((opp, index) => ({
                    id: String(index),
                    title: opp.title,
                    score: `${opp.score}/100`,
                  }))}
                  emptyState="No opportunities found"
                />

                <DataTable
                  title="Diagnostics"
                  columns={[
                    { key: 'title', header: 'Diagnostic' },
                    { key: 'value', header: 'Info' },
                  ]}
                  rows={mobileDiagnostics.map((diag, index) => ({
                    id: String(index),
                    title: diag.title,
                    value: diag.displayValue || '—',
                  }))}
                  emptyState="No diagnostics found"
                />
              </div>
            </div>

            {/* Desktop Opportunities & Diagnostics */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">🖥️ Desktop Issues</h3>
              <div className="grid gap-6 lg:grid-cols-2">
                <DataTable
                  title="Opportunities"
                  columns={[
                    { key: 'title', header: 'Issue' },
                    { key: 'score', header: 'Score' },
                  ]}
                  rows={desktopOpportunities.map((opp, index) => ({
                    id: String(index),
                    title: opp.title,
                    score: `${opp.score}/100`,
                  }))}
                  emptyState="No opportunities found"
                />

                <DataTable
                  title="Diagnostics"
                  columns={[
                    { key: 'title', header: 'Diagnostic' },
                    { key: 'value', header: 'Info' },
                  ]}
                  rows={desktopDiagnostics.map((diag, index) => ({
                    id: String(index),
                    title: diag.title,
                    value: diag.displayValue || '—',
                  }))}
                  emptyState="No diagnostics found"
                />
              </div>
            </div>

            {/* AI Analysis */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
                  <p className="text-sm text-gray-500">Get actionable code suggestions from Claude (based on mobile scan)</p>
                </div>
                <button
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing || !mobileScan}
                  className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </button>
              </div>

              {aiRecommendations && (
                <div className="mt-6 space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-blue-900">Summary</h4>
                    <p className="text-sm text-blue-800">{aiRecommendations.summary}</p>
                  </div>

                  {/* Priority Issues */}
                  {aiRecommendations.priority_issues && aiRecommendations.priority_issues.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">Priority Issues</h4>
                      <div className="space-y-2">
                        {aiRecommendations.priority_issues.map((issue, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                          >
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityBadge(issue.severity)}`}
                            >
                              {issue.severity}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                              <p className="text-xs text-gray-600">{issue.impact}</p>
                              <p className="mt-1 text-xs text-gray-500">Affects: {issue.metric}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">Recommendations</h4>
                    <div className="space-y-3">
                      {aiRecommendations.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="cursor-pointer rounded-lg border border-gray-200 p-4 transition hover:border-action"
                          onClick={() => setSelectedRecommendation(rec)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityBadge(rec.priority)}`}
                                >
                                  {rec.priority}
                                </span>
                                <span className="text-xs text-gray-500">{rec.category}</span>
                              </div>
                              <h5 className="mt-2 font-medium text-gray-900">{rec.title}</h5>
                              <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
                              <p className="mt-2 text-xs font-medium text-green-600">
                                {rec.expected_impact}
                              </p>
                            </div>
                            <button className="text-gray-400 hover:text-action">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Scan History */}
        <DataTable
          title="Recent Scans"
          columns={[
            { key: 'date', header: 'Date' },
            { key: 'type', header: 'Page Type' },
            { key: 'strategy', header: 'Device' },
            { key: 'performance', header: 'Performance' },
            { key: 'accessibility', header: 'A11y' },
            { key: 'seo', header: 'SEO' },
            { key: 'actions', header: '' },
          ]}
          rows={history.map((scan) => ({
            id: String(scan.id),
            date: new Date(scan.scan_date).toLocaleString(),
            type: scan.page_type,
            strategy: scan.strategy === 'mobile' ? '📱' : '🖥️',
            performance: scan.performance_score.toString(),
            accessibility: scan.accessibility_score.toString(),
            seo: scan.seo_score.toString(),
            actions: (
              <button
                onClick={() => loadScan(scan.id)}
                className="text-sm font-medium text-action hover:underline"
              >
                View
              </button>
            ),
          }))}
          emptyState="No scans yet"
        />
      </div>

      {/* Recommendation Modal */}
      {selectedRecommendation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedRecommendation(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedRecommendation.title}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityBadge(selectedRecommendation.priority)}`}
                  >
                    {selectedRecommendation.priority}
                  </span>
                  <span className="text-sm text-gray-500">{selectedRecommendation.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecommendation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Description</h4>
                <p className="text-sm text-gray-600">{selectedRecommendation.description}</p>
              </div>

              {selectedRecommendation.code_example && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Code Example</h4>
                    <button
                      onClick={() => copyToClipboard(selectedRecommendation.code_example!)}
                      className="text-xs font-medium text-action hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                    <code>{selectedRecommendation.code_example}</code>
                  </pre>
                </div>
              )}

              {selectedRecommendation.file_location && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">File Location</h4>
                  <code className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-800">
                    {selectedRecommendation.file_location}
                  </code>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Expected Impact</h4>
                <p className="text-sm font-medium text-green-600">
                  {selectedRecommendation.expected_impact}
                </p>
              </div>

              {selectedRecommendation.implementation_notes && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">Implementation Notes</h4>
                  <p className="text-sm text-gray-600">
                    {selectedRecommendation.implementation_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
