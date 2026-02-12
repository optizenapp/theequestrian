'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type ListRow = {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
};

export default function AdminEmailListsPage() {
  const [lists, setLists] = useState<ListRow[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  async function loadLists() {
    const response = await fetch('/api/admin/email/lists');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load lists');
    }
    setLists(Array.isArray(data.lists) ? data.lists : []);
  }

  useEffect(() => {
    loadLists().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load lists'));
  }, []);

  return (
    <AdminLayout title="Email Lists" subtitle="Static list management">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Create list</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <button
            type="button"
            className="rounded bg-action px-3 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              const response = await fetch('/api/admin/email/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data?.error || 'Failed to create list');
                return;
              }
              setName('');
              setDescription('');
              setError('');
              await loadLists();
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Members</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list) => (
              <tr key={list.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{list.name}</td>
                <td className="px-3 py-2">{list.description || '—'}</td>
                <td className="px-3 py-2">{list.membersCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
