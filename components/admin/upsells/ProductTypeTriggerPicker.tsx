'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type TypeRow = { type: string; count: number };

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function ProductTypeTriggerPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<TypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = useMemo(
    () => new Set(selected.map(normalizeKey)),
    [selected]
  );

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      params.set('limit', '100');
      const res = await fetch(`/api/admin/upsells/product-types?${params}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as { types?: TypeRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setRows(data.types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load types');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load(query);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, load]);

  const addType = (type: string) => {
    const key = normalizeKey(type);
    if (!key || selectedKeys.has(key)) return;
    onChange([...selected, type.trim()]);
  };

  const removeType = (type: string) => {
    const key = normalizeKey(type);
    onChange(selected.filter((t) => normalizeKey(t) !== key));
  };

  const addAllVisible = () => {
    const next = [...selected];
    const seen = new Set(selectedKeys);
    for (const row of rows) {
      const key = normalizeKey(row.type);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(row.type);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-700">Product types</span>
        <button
          type="button"
          onClick={addAllVisible}
          disabled={rows.length === 0}
          className="text-xs font-medium text-action hover:underline disabled:opacity-40"
        >
          Add all shown
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => removeType(type)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs text-gray-800 hover:border-rose-300 hover:bg-rose-50"
              title="Remove"
            >
              <span className="max-w-[14rem] truncate">{type}</span>
              <span aria-hidden className="text-gray-400">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No types selected yet — search and click to add.</p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search types (e.g. breech, jodhpur, helmet)…"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />

      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="max-h-48 overflow-y-auto rounded border border-gray-200">
        {loading && rows.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500">No matching product types.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => {
              const selectedAlready = selectedKeys.has(normalizeKey(row.type));
              return (
                <li key={row.type}>
                  <button
                    type="button"
                    disabled={selectedAlready}
                    onClick={() => addType(row.type)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 disabled:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate font-medium text-gray-900">{row.type}</span>
                    <span className="shrink-0 text-gray-500">
                      {row.count}
                      {selectedAlready ? ' · added' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        Live types from catalogue · click to add · click a chip to remove
      </p>
    </div>
  );
}