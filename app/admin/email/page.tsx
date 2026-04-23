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

type ListRow = { id: string; name: string };
type SegmentRow = { id: string; name: string };
type TemplateOption = { id: string; name: string; activeVersionId: string | null };

export default function AdminEmailPage() {
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isImportingMoosend, setIsImportingMoosend] = useState(false);

  // Auto weekly settings (prompts, template, audience)
  const [autoWeeklyEnabled, setAutoWeeklyEnabled] = useState<boolean | null>(null);
  const [autoWeeklyIntroPrompt, setAutoWeeklyIntroPrompt] = useState('');
  const [autoWeeklySubjectPrompt, setAutoWeeklySubjectPrompt] = useState('');
  const [autoWeeklyTemplateVersionId, setAutoWeeklyTemplateVersionId] = useState('');
  const [autoWeeklyListIds, setAutoWeeklyListIds] = useState<string[]>([]);
  const [autoWeeklySegmentIds, setAutoWeeklySegmentIds] = useState<string[]>([]);
  const [autoWeeklyTemplates, setAutoWeeklyTemplates] = useState<TemplateOption[]>([]);
  const [autoWeeklyLists, setAutoWeeklyLists] = useState<ListRow[]>([]);
  const [autoWeeklySegments, setAutoWeeklySegments] = useState<SegmentRow[]>([]);
  const [autoWeeklyLoading, setAutoWeeklyLoading] = useState(false);
  const [autoWeeklySaving, setAutoWeeklySaving] = useState(false);
  const [autoWeeklyMessage, setAutoWeeklyMessage] = useState('');

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

  useEffect(() => {
    async function loadAutoWeekly() {
      setAutoWeeklyLoading(true);
      try {
        const [settingsRes, listsRes, segmentsRes] = await Promise.all([
          fetch('/api/admin/email/auto-weekly/settings'),
          fetch('/api/admin/email/lists'),
          fetch('/api/admin/email/segments'),
        ]);
        const settings = await settingsRes.json();
        const listsData = await listsRes.json();
        const segmentsData = await segmentsRes.json();
        if (settingsRes.ok && settings != null) {
          setAutoWeeklyEnabled(settings.enabled === true);
          setAutoWeeklyIntroPrompt(settings.introPrompt ?? '');
          setAutoWeeklySubjectPrompt(settings.subjectPrompt ?? '');
          setAutoWeeklyTemplateVersionId(settings.templateVersionId ?? '');
          setAutoWeeklyListIds(Array.isArray(settings.audience?.listIds) ? settings.audience.listIds : []);
          setAutoWeeklySegmentIds(Array.isArray(settings.audience?.segmentIds) ? settings.audience.segmentIds : []);
          setAutoWeeklyTemplates(Array.isArray(settings.templates) ? settings.templates : []);
        }
        if (listsRes.ok && Array.isArray(listsData.lists)) setAutoWeeklyLists(listsData.lists);
        if (segmentsRes.ok && Array.isArray(segmentsData.segments)) setAutoWeeklySegments(segmentsData.segments);
      } catch {
        setAutoWeeklyEnabled(false);
      } finally {
        setAutoWeeklyLoading(false);
      }
    }
    loadAutoWeekly();
  }, []);

  const saveAutoWeekly = async () => {
    setAutoWeeklySaving(true);
    setAutoWeeklyMessage('');
    try {
      const res = await fetch('/api/admin/email/auto-weekly/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: autoWeeklyEnabled === true,
          introPrompt: autoWeeklyIntroPrompt.trim() || null,
          subjectPrompt: autoWeeklySubjectPrompt.trim() || null,
          templateVersionId: autoWeeklyTemplateVersionId || null,
          audience: { listIds: autoWeeklyListIds, segmentIds: autoWeeklySegmentIds },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAutoWeeklyMessage(data?.error || data?.detail || 'Failed to save');
        return;
      }
      setAutoWeeklyMessage('Auto weekly settings saved.');
      setTimeout(() => setAutoWeeklyMessage(''), 3000);
    } catch (e) {
      setAutoWeeklyMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setAutoWeeklySaving(false);
    }
  };

  const toggleAutoWeeklyList = (id: string) => {
    setAutoWeeklyListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
        <StatCard label="Sent (30d)" value={summary ? summary.sent30d.toLocaleString() : '0'} helper="SES sends" />
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

      <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/30 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-sky-900">Auto weekly</h3>
        <p className="mt-1 text-sm text-sky-800">
          Global prompts, template, and audience for the automated weekly campaign. Per-template overrides are in <Link href="/admin/email/templates" className="font-medium underline hover:text-sky-600">Templates</Link> (Subject line prompt, LLM block prompts).
        </p>
        {autoWeeklyLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={autoWeeklyEnabled === true}
                onChange={(e) => setAutoWeeklyEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-action focus:ring-action"
              />
              Flow enabled (build and release cron will create/send campaigns when on)
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Intro prompt (global fallback for LLM intro block)
              <textarea
                value={autoWeeklyIntroPrompt}
                onChange={(e) => setAutoWeeklyIntroPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Write a short friendly intro for this week’s picks. Use {{productContext}} and {{sendDate}}."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Subject line prompt (global fallback)
              <textarea
                value={autoWeeklySubjectPrompt}
                onChange={(e) => setAutoWeeklySubjectPrompt(e.target.value)}
                rows={2}
                placeholder="e.g. One short subject line. {{productContext}}, {{sendDate}}."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Template (campaign template used for each run)
              <select
                value={autoWeeklyTemplateVersionId}
                onChange={(e) => setAutoWeeklyTemplateVersionId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select template version</option>
                {autoWeeklyTemplates.map((t) => (
                  <option key={t.id} value={t.activeVersionId || ''}>
                    {t.name} {t.activeVersionId ? '' : '(no active version)'}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Lists
                <div className="mt-1 max-h-32 space-y-1 overflow-auto rounded border border-gray-300 px-2 py-2">
                  {autoWeeklyLists.length === 0 ? (
                    <p className="text-xs text-gray-500">No lists.</p>
                  ) : (
                    autoWeeklyLists.map((list) => (
                      <label key={list.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={autoWeeklyListIds.includes(list.id)}
                          onChange={() => toggleAutoWeeklyList(list.id)}
                        />
                        <span>{list.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Segments
                <select
                  multiple
                  className="mt-1 h-32 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={autoWeeklySegmentIds}
                  onChange={(e) => setAutoWeeklySegmentIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                >
                  {autoWeeklySegments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={autoWeeklySaving}
                onClick={saveAutoWeekly}
                className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-60"
              >
                {autoWeeklySaving ? 'Saving…' : 'Save Auto weekly settings'}
              </button>
              {autoWeeklyMessage ? (
                <span className="text-sm text-gray-600">{autoWeeklyMessage}</span>
              ) : null}
            </div>
          </div>
        )}
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
