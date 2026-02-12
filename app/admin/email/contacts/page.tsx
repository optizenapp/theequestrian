'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type ContactRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  orderCount: number;
  lifetimeValue: number;
};

export default function AdminEmailContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [maxOrders, setMaxOrders] = useState('');
  const [minLtv, setMinLtv] = useState('');
  const [maxLtv, setMaxLtv] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search.trim()) params.set('search', search.trim());
        if (emailFilter.trim()) params.set('email', emailFilter.trim());
        if (nameFilter.trim()) params.set('name', nameFilter.trim());
        if (subscriptionFilter) params.set('subscriptionStatus', subscriptionFilter);
        if (minOrders.trim()) params.set('minOrders', minOrders.trim());
        if (maxOrders.trim()) params.set('maxOrders', maxOrders.trim());
        if (minLtv.trim()) params.set('minLtv', minLtv.trim());
        if (maxLtv.trim()) params.set('maxLtv', maxLtv.trim());

        const response = await fetch(`/api/admin/email/contacts?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load contacts');
        setContacts(Array.isArray(data.contacts) ? data.contacts : []);
        setTotal(Number(data.total || 0));
        setTotalPages(Number(data.totalPages || 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [
    page,
    pageSize,
    search,
    emailFilter,
    nameFilter,
    subscriptionFilter,
    minOrders,
    maxOrders,
    minLtv,
    maxLtv,
  ]);

  return (
    <AdminLayout title="Email Contacts" subtitle="Imported and deduped contact profiles">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search email or name"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            onClick={() => {
              setPage(1);
              setSearch('');
              setEmailFilter('');
              setNameFilter('');
              setSubscriptionFilter('');
              setMinOrders('');
              setMaxOrders('');
              setMinLtv('');
              setMaxLtv('');
            }}
          >
            Clear filters
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Subscription</th>
              <th className="px-3 py-2 text-left">Orders</th>
              <th className="px-3 py-2 text-left">LTV</th>
            </tr>
            <tr>
              <th className="px-3 py-2">
                <input
                  value={emailFilter}
                  onChange={(e) => {
                    setPage(1);
                    setEmailFilter(e.target.value);
                  }}
                  placeholder="Filter email"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </th>
              <th className="px-3 py-2">
                <input
                  value={nameFilter}
                  onChange={(e) => {
                    setPage(1);
                    setNameFilter(e.target.value);
                  }}
                  placeholder="Filter name"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </th>
              <th className="px-3 py-2">
                <select
                  value={subscriptionFilter}
                  onChange={(e) => {
                    setPage(1);
                    setSubscriptionFilter(e.target.value);
                  }}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="">All statuses</option>
                  <option value="subscribed">subscribed</option>
                  <option value="unsubscribed">unsubscribed</option>
                  <option value="suppressed">suppressed</option>
                  <option value="pending">pending</option>
                </select>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <input
                    value={minOrders}
                    onChange={(e) => {
                      setPage(1);
                      setMinOrders(e.target.value);
                    }}
                    placeholder="min"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <input
                    value={maxOrders}
                    onChange={(e) => {
                      setPage(1);
                      setMaxOrders(e.target.value);
                    }}
                    placeholder="max"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
              </th>
              <th className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <input
                    value={minLtv}
                    onChange={(e) => {
                      setPage(1);
                      setMinLtv(e.target.value);
                    }}
                    placeholder="min"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <input
                    value={maxLtv}
                    onChange={(e) => {
                      setPage(1);
                      setMaxLtv(e.target.value);
                    }}
                    placeholder="max"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{contact.email}</td>
                <td className="px-3 py-2">{`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '—'}</td>
                <td className="px-3 py-2">{contact.subscriptionStatus}</td>
                <td className="px-3 py-2">{contact.orderCount}</td>
                <td className="px-3 py-2">${contact.lifetimeValue.toFixed(2)}</td>
              </tr>
            ))}
            {!loading && contacts.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={5}>No contacts yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
        <div className="text-gray-600">
          Showing page {page} of {totalPages} ({total.toLocaleString()} total contacts)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
