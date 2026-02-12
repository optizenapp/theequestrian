'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type SegmentRow = {
  id: string;
  name: string;
  description: string | null;
  totalMembers: number;
  rules: { mode: 'all' | 'any'; conditions: Array<{ field: string; operator: string; value: string | number }> };
};

export default function AdminEmailSegmentsPage() {
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function loadSegments() {
    const response = await fetch('/api/admin/email/segments');
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to load segments');
    setSegments(Array.isArray(data.segments) ? data.segments : []);
  }

  useEffect(() => {
    loadSegments().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load segments'));
  }, []);

  return (
    <AdminLayout title="Email Segments" subtitle="Dynamic rule-based audiences">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Create quick segment</h3>
        <p className="mt-1 text-xs text-gray-500">Default rule: order_count &gt;= 1</p>
        <div className="mt-3 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
          <button
            type="button"
            className="rounded bg-action px-3 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              const payload = {
                name,
                rules: {
                  mode: 'all',
                  conditions: [{ field: 'order_count', operator: 'gte', value: 1 }],
                },
              };
              const response = await fetch('/api/admin/email/segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data?.error || 'Failed to create segment');
                return;
              }
              setName('');
              await loadSegments();
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((segment) => (
          <div key={segment.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{segment.name}</h4>
                <p className="text-xs text-gray-500">{segment.description || 'No description'}</p>
                <p className="text-xs text-gray-600 mt-1">Members: {segment.totalMembers}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch(`/api/admin/email/segments/${segment.id}/evaluate`, { method: 'POST' });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data?.error || 'Failed to evaluate segment');
                    return;
                  }
                  await loadSegments();
                }}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
              >
                Evaluate
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
