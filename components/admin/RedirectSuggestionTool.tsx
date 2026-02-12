'use client';

import { useMemo, useState } from 'react';

type SuggestionRow = {
  from: string;
  suggested_to: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  source_path: string;
  method: 'rule-existing' | 'ai';
  is_external?: boolean;
  review_note?: string;
};

const toCsv = (rows: SuggestionRow[]) => {
  const escape = (value: string) => `"${(value || '').replace(/"/g, '""')}"`;
  const header = 'from,suggested_to,confidence,method,source_path,reasoning,alternatives,review_note,is_external\n';
  const body = rows
    .map((row) =>
      [
        escape(row.from),
        escape(row.suggested_to),
        String(row.confidence),
        row.method,
        escape(row.source_path),
        escape(row.reasoning),
        escape((row.alternatives || []).join('; ')),
        escape(row.review_note || ''),
        row.is_external ? 'yes' : 'no',
      ].join(',')
    )
    .join('\n');
  return `${header}${body}${body ? '\n' : ''}`;
};

export function RedirectSuggestionTool() {
  const [pastedText, setPastedText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState<'gpt-4o' | 'gpt-5.2-codex'>('gpt-4o');
  const [mode, setMode] = useState<'category-only' | 'category-and-products'>('category-only');
  const [limit, setLimit] = useState(200);
  const [running, setRunning] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<SuggestionRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedRows = useMemo(
    () => results.filter((row) => selected[row.from] !== false && !row.is_external && Boolean(row.suggested_to)),
    [results, selected]
  );

  const onChooseCsv = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setCsvFileName(file.name);
  };

  const runTool = async () => {
    setMessage(null);
    setRunning(true);
    try {
      const response = await fetch('/api/admin/404/suggestions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pastedText,
          csvText,
          baseUrl,
          model,
          mode,
          limit,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error || 'Failed to run redirect suggestion tool.');
        return;
      }
      const rows = (payload?.suggestions || []) as SuggestionRow[];
      setResults(rows);
      setSelected(
        rows.reduce<Record<string, boolean>>((acc, row) => {
          acc[row.from] = !row.is_external && row.confidence >= 40 && Boolean(row.suggested_to);
          return acc;
        }, {})
      );
      setMessage(`Processed ${payload.processed} paths. Review suggestions below.`);
    } catch {
      setMessage('Failed to run redirect suggestion tool.');
    } finally {
      setRunning(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const blob = new Blob([toCsv(results)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `404-ai-suggestions-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const implementRedirects = async () => {
    setMessage(null);
    setImplementing(true);
    try {
      const response = await fetch('/api/admin/404/suggestions/implement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: selectedRows.map((row) => ({
            ...row,
            selected: true,
            type: '301',
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error || 'Failed to implement redirects.');
        return;
      }
      setMessage(`Implemented ${payload.applied} redirects.`);
    } catch {
      setMessage('Failed to implement redirects.');
    } finally {
      setImplementing(false);
    }
  };

  return (
    <div className="p-5">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">404 redirect suggestion tool</h3>
          <p className="text-xs text-gray-500">
            Paste URLs/paths or upload a CSV, run AI suggestions, then implement selected redirects.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder="/missing-url-or-full-url (one per line)"
              className="min-h-36 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(event) => {
                      void onChooseCsv(event.target.files?.[0] || null);
                    }}
                    className="hidden"
                  />
                  {csvFileName || 'Choose CSV'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCsvText('');
                    setCsvFileName('');
                  }}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                >
                  Clear CSV
                </button>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                CSV columns supported: <code>target</code>, <code>path</code>, <code>url</code>, <code>source</code>.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://www.theequestrian.com.au"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(event) => setLimit(Math.max(1, Number(event.target.value || 1)))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-2">
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value as 'gpt-4o' | 'gpt-5.2-codex')}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-5.2-codex">gpt-5.2-codex</option>
                </select>
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as 'category-only' | 'category-and-products')
                  }
                  className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="category-only">Category only (recommended)</option>
                  <option value="category-and-products">Category + product suggestions</option>
                </select>
                <p className="mt-2 text-[11px] text-gray-500">
                  Product-like broken URLs are auto-routed to nearest seeded category path for clean redirects.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runTool}
              disabled={running}
              className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? 'Running...' : 'Run'}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!results.length}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={implementRedirects}
              disabled={!selectedRows.length || implementing}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {implementing ? 'Implementing...' : 'Implement redirects'}
            </button>
            <span className="text-xs text-gray-500">
              Selected: {selectedRows.length} / {results.length}
            </span>
          </div>
          {message ? <p className="mt-2 text-xs text-gray-600">{message}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Use</th>
                <th className="px-3 py-2 text-left font-semibold">From</th>
                <th className="px-3 py-2 text-left font-semibold">Suggested to</th>
                <th className="px-3 py-2 text-left font-semibold">Confidence</th>
                <th className="px-3 py-2 text-left font-semibold">Method</th>
                <th className="px-3 py-2 text-left font-semibold">Note</th>
                <th className="px-3 py-2 text-left font-semibold">Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {results.length ? (
                results.map((row) => (
                  <tr key={row.from} className="hover:bg-gray-50">
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selected[row.from] !== false}
                        disabled={row.is_external}
                        onChange={(event) =>
                          setSelected((prev) => ({ ...prev, [row.from]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top break-all">{row.from}</td>
                    <td className="px-3 py-2 align-top break-all">{row.suggested_to}</td>
                    <td className="px-3 py-2 align-top">{row.confidence}</td>
                    <td className="px-3 py-2 align-top">{row.method}</td>
                    <td className="px-3 py-2 align-top text-[11px] text-amber-700">
                      {row.review_note || ''}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div>{row.reasoning}</div>
                      {row.alternatives?.length ? (
                        <div className="mt-1 text-[10px] text-gray-400">
                          Alternatives: {row.alternatives.join(', ')}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No suggestions yet. Run the tool first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
