'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  templateVersionId: string | null;
  audience: { listIds?: string[]; segmentIds?: string[] };
  scheduledAt: string | null;
};

type ListRow = { id: string; name: string };
type SegmentRow = { id: string; name: string };
type TemplateRow = { id: string; name: string; activeVersionId: string | null };

export default function AdminEmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState('');
  const [templateVersionId, setTemplateVersionId] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function loadAll() {
    const [campaignRes, listRes, segmentRes, templateRes] = await Promise.all([
      fetch('/api/admin/email/campaigns'),
      fetch('/api/admin/email/lists'),
      fetch('/api/admin/email/segments'),
      fetch('/api/admin/email/templates'),
    ]);
    const [campaignData, listData, segmentData, templateData] = await Promise.all([
      campaignRes.json(),
      listRes.json(),
      segmentRes.json(),
      templateRes.json(),
    ]);
    if (!campaignRes.ok) throw new Error(campaignData?.error || 'Failed to load campaigns');
    if (!listRes.ok) throw new Error(listData?.error || 'Failed to load lists');
    if (!segmentRes.ok) throw new Error(segmentData?.error || 'Failed to load segments');
    if (!templateRes.ok) throw new Error(templateData?.error || 'Failed to load templates');
    setCampaigns(Array.isArray(campaignData.campaigns) ? campaignData.campaigns : []);
    setLists(Array.isArray(listData.lists) ? listData.lists : []);
    setSegments(Array.isArray(segmentData.segments) ? segmentData.segments : []);
    setTemplates(Array.isArray(templateData.templates) ? templateData.templates : []);
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load campaign data'));
  }, []);

  return (
    <AdminLayout title="Email Campaigns" subtitle="One-off bulk sends with list/segment audiences">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Create campaign</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <select value={templateVersionId} onChange={(e) => setTemplateVersionId(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select template version</option>
            {templates.map((template) => (
              <option key={template.id} value={template.activeVersionId || ''}>
                {template.name} {template.activeVersionId ? '' : '(no active version)'}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="text-sm text-gray-700">
            Lists
            <select
              multiple
              className="mt-1 h-32 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={selectedListIds}
              onChange={(e) =>
                setSelectedListIds(Array.from(e.target.selectedOptions).map((option) => option.value))
              }
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Segments
            <select
              multiple
              className="mt-1 h-32 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={selectedSegmentIds}
              onChange={(e) =>
                setSelectedSegmentIds(Array.from(e.target.selectedOptions).map((option) => option.value))
              }
            >
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="mt-3 rounded bg-action px-4 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            const response = await fetch('/api/admin/email/campaigns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                templateVersionId,
                audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
              }),
            });
            const data = await response.json();
            if (!response.ok) {
              setError(data?.error || 'Failed to create campaign');
              return;
            }
            setName('');
            await loadAll();
          }}
        >
          Create campaign
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
                <p className="text-xs text-gray-500">
                  Status: {campaign.status} | Lists: {(campaign.audience.listIds || []).length} | Segments:{' '}
                  {(campaign.audience.segmentIds || []).length}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                onClick={async () => {
                  const response = await fetch(`/api/admin/email/campaigns/${campaign.id}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frequencyCapCount: 3, frequencyCapDays: 7 }),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    setError(data?.error || 'Failed to send campaign');
                    return;
                  }
                  await loadAll();
                }}
              >
                Send queued
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
