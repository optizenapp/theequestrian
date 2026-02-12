'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

type EmailSummary = {
  contacts: number;
  subscribed: number;
  suppressed: number;
  sent30d: number;
  failed30d: number;
  scheduled30d: number;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  scheduledAt: string | null;
};

export default function AdminEmailPage() {
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isImportingMoosend, setIsImportingMoosend] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/email');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load email summary');
        }
        setSummary(data.summary || null);
        setCampaigns(
          Array.isArray(data.campaigns)
            ? data.campaigns.map((item: { id: string; name: string; status: string; scheduledAt: string | null }) => ({
                id: item.id,
                name: item.name,
                status: item.status,
                scheduledAt: item.scheduledAt,
              }))
            : []
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email summary');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminLayout title="Email Platform" subtitle="Contacts, campaigns, segments, and sequences">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/email/contacts" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Contacts</Link>
        <Link href="/admin/email/lists" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Lists</Link>
        <Link href="/admin/email/segments" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Segments</Link>
        <Link href="/admin/email/templates" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Templates</Link>
        <Link href="/admin/email/campaigns" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Campaigns</Link>
        <Link href="/admin/email/sequences" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Sequences</Link>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contacts" value={summary ? summary.contacts.toLocaleString() : '0'} helper="Total in DB" />
        <StatCard label="Subscribed" value={summary ? summary.subscribed.toLocaleString() : '0'} helper="Eligible audience" />
        <StatCard label="Sent (30d)" value={summary ? summary.sent30d.toLocaleString() : '0'} helper="Resend sends" />
        <StatCard label="Failed (30d)" value={summary ? summary.failed30d.toLocaleString() : '0'} helper="Delivery failures" />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Platform setup</h3>
        <p className="mt-2 text-sm text-gray-600">Run DB bootstrap once, then sync Shopify customers and orders.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const response = await fetch('/api/admin/email/bootstrap', { method: 'POST' });
              if (!response.ok) {
                setError('Schema bootstrap failed');
                return;
              }
              setError('');
              alert('Email platform schema bootstrapped.');
            }}
            className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
          >
            Bootstrap schema
          </button>
          <button
            type="button"
            onClick={async () => {
              const response = await fetch('/api/admin/email/sync-shopify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxCustomerPages: 5, maxOrderPages: 5 }),
              });
              if (!response.ok) {
                setError('Shopify sync failed');
                return;
              }
              setError('');
              alert('Shopify sync complete. Refresh to view updated stats.');
            }}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action"
          >
            Sync Shopify now
          </button>
          <button
            type="button"
            disabled={isImportingMoosend}
            onClick={async () => {
              setIsImportingMoosend(true);
              try {
                const response = await fetch('/api/admin/email/import-moosend', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
                const data = await response.json();
                if (!response.ok) {
                  setError(data?.error || 'Moosend import failed');
                  return;
                }
                setError('');
                alert(
                  `Moosend import complete. Lists: ${data.importedLists}, Subscribers: ${data.importedSubscribers}`
                );
              } finally {
                setIsImportingMoosend(false);
              }
            }}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action disabled:opacity-50"
          >
            {isImportingMoosend ? 'Importing Moosend...' : 'Import Moosend lists'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          title="Recent Campaigns"
          columns={[
            { key: 'name', header: 'Campaign' },
            { key: 'status', header: 'Status' },
            { key: 'scheduledAt', header: 'Scheduled At' },
          ]}
          rows={campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : '—',
          }))}
        />
      </div>

      {loading ? <div className="mt-4 text-sm text-gray-500">Loading...</div> : null}
    </AdminLayout>
  );
}
