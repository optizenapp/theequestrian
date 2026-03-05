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
  startedAt?: string | null;
  completedAt?: string | null;
};

type ListRow = { id: string; name: string };
type SegmentRow = { id: string; name: string };
type TemplateRow = { id: string; name: string; activeVersionId: string | null };
type PreparedCampaign = {
  id: string;
  name: string;
  templateVersionId: string;
  queuedRecipients: number;
  templateName: string;
  previewHtml: string;
  previewSubject: string;
  audienceBreakdown: {
    listContacts: number;
    segmentContacts: number;
    overlapContacts: number;
    totalUniqueContacts: number;
  };
};

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
  const [statusMessage, setStatusMessage] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [isDuplicatingCampaign, setIsDuplicatingCampaign] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [preparedCampaign, setPreparedCampaign] = useState<PreparedCampaign | null>(null);
  const [duplicatedCampaignId, setDuplicatedCampaignId] = useState<string | null>(null);

  function extractAudienceIds(
    audience: CampaignRow['audience'] | null | undefined
  ): { listIds: string[]; segmentIds: string[] } {
    const listIds = Array.isArray(audience?.listIds)
      ? audience.listIds.filter((value): value is string => typeof value === 'string')
      : [];
    const segmentIds = Array.isArray(audience?.segmentIds)
      ? audience.segmentIds.filter((value): value is string => typeof value === 'string')
      : [];
    return { listIds, segmentIds };
  }

  function applyCampaignToEditor(campaign: CampaignRow) {
    const { listIds, segmentIds } = extractAudienceIds(campaign.audience);
    setName(campaign.name);
    setTemplateVersionId(campaign.templateVersionId || '');
    setSelectedListIds(listIds);
    setSelectedSegmentIds(segmentIds);
    setPreparedCampaign(null);
    setStatusMessage(`Editing campaign "${campaign.name}". Update audience/template and create a new send.`);
  }

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

  const prepareCampaign = async () => {
    if (!name.trim() || !templateVersionId) {
      setError('Campaign name and template are required');
      return;
    }
    setError('');
    setStatusMessage('');
    setIsPreparing(true);
    try {
      const createResponse = await fetch('/api/admin/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          templateVersionId,
          audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
        }),
      });
      const createPayload = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(createPayload?.error || 'Failed to create campaign');
      }

      const versionResponse = await fetch(`/api/admin/email/templates/versions/${templateVersionId}`);
      const versionPayload = await versionResponse.json();
      if (!versionResponse.ok || !versionPayload?.version) {
        throw new Error(versionPayload?.error || 'Failed to load selected template');
      }

      const previewResponse = await fetch('/api/admin/email/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectTemplate: versionPayload.version.subjectTemplate,
          blocks: versionPayload.version.blocks,
          metadata: versionPayload.version.metadata,
          handle: null,
        }),
      });
      const previewPayload = await previewResponse.json();
      if (!previewResponse.ok) {
        throw new Error(previewPayload?.error || 'Failed to render campaign preview');
      }

      const template = templates.find((item) => item.activeVersionId === templateVersionId);
      setPreparedCampaign({
        id: createPayload.id,
        name: name.trim(),
        templateVersionId,
        queuedRecipients: Number(createPayload.queuedRecipients || 0),
        templateName: template?.name || 'Selected template',
        previewHtml: previewPayload.html || '',
        previewSubject: previewPayload.subject || versionPayload.version.subjectTemplate,
        audienceBreakdown: {
          listContacts: Number(createPayload?.audienceBreakdown?.listContacts || 0),
          segmentContacts: Number(createPayload?.audienceBreakdown?.segmentContacts || 0),
          overlapContacts: Number(createPayload?.audienceBreakdown?.overlapContacts || 0),
          totalUniqueContacts: Number(createPayload?.audienceBreakdown?.totalUniqueContacts || 0),
        },
      });

      setStatusMessage('Campaign prepared. Review summary and click Send campaign.');
      setName('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare campaign');
    } finally {
      setIsPreparing(false);
    }
  };

  const sendPreparedCampaign = async () => {
    if (!preparedCampaign) return;
    setError('');
    setStatusMessage('');
    setIsSendingCampaign(true);
    try {
      const response = await fetch(`/api/admin/email/campaigns/${preparedCampaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequencyCapCount: 3, frequencyCapDays: 7 }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to send campaign');
      }
      setStatusMessage(
        `Campaign sent. Sent: ${payload.sent || 0}, Failed: ${payload.failed || 0}, Skipped: ${
          payload.skipped || 0
        }.`
      );
      setPreparedCampaign(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const duplicateCampaign = async (campaign: CampaignRow) => {
    if (!campaign.templateVersionId) {
      setError('Cannot duplicate campaign without a template version');
      return;
    }

    setError('');
    setStatusMessage('');
    setIsDuplicatingCampaign(true);
    try {
      const { listIds, segmentIds } = extractAudienceIds(campaign.audience);
      const duplicateName = `${campaign.name} (Copy ${new Date().toLocaleDateString('en-AU')})`;
      const response = await fetch('/api/admin/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateName,
          templateVersionId: campaign.templateVersionId,
          audience: { listIds, segmentIds },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to duplicate campaign');
      }

      const newCampaignId = String(payload.id || '');
      setDuplicatedCampaignId(newCampaignId || null);
      setName(duplicateName);
      setTemplateVersionId(campaign.templateVersionId);
      setSelectedListIds(listIds);
      setSelectedSegmentIds(segmentIds);
      setPreparedCampaign(null);
      setStatusMessage(
        `Duplicated "${campaign.name}". Edit the copied campaign settings, then create/send when ready.`
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
    } finally {
      setIsDuplicatingCampaign(false);
    }
  };

  const mostRecentCompletedCampaign =
    campaigns.find((campaign) => campaign.status === 'completed' || campaign.status === 'processing') || null;

  return (
    <AdminLayout title="Email Campaigns" subtitle="One-off bulk sends with list/segment audiences">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {statusMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{statusMessage}</div>
      ) : null}

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
          disabled={isPreparing}
          className="mt-3 rounded bg-action px-4 py-2 text-sm font-semibold text-white"
          onClick={prepareCampaign}
        >
          {isPreparing ? 'Preparing...' : 'Create campaign'}
        </button>
      </div>

      {preparedCampaign ? (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Campaign Summary</h3>
            <p className="mt-2 text-sm text-gray-600">
              This campaign will send template <span className="font-semibold">{preparedCampaign.templateName}</span>{' '}
              to contacts resolved from selected lists and segments.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              <li>Campaign: {preparedCampaign.name}</li>
              <li>Template Version: {preparedCampaign.templateVersionId}</li>
              <li>List contacts: {preparedCampaign.audienceBreakdown.listContacts}</li>
              <li>Segment contacts: {preparedCampaign.audienceBreakdown.segmentContacts}</li>
              <li>Audience overlap (in both): {preparedCampaign.audienceBreakdown.overlapContacts}</li>
              <li>Deduped final audience: {preparedCampaign.audienceBreakdown.totalUniqueContacts}</li>
              <li>Queued recipients: {preparedCampaign.queuedRecipients}</li>
              <li>Tracking: enabled via Resend tags + webhook event ingestion.</li>
            </ul>
            <button
              type="button"
              disabled={isSendingCampaign}
              className="mt-4 rounded bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={sendPreparedCampaign}
            >
              {isSendingCampaign ? 'Sending...' : 'Send campaign'}
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Template preview</p>
            <p className="mb-2 text-xs text-gray-500">Subject: {preparedCampaign.previewSubject}</p>
            <div className="overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-2" style={{ maxHeight: '60vh' }}>
              <iframe srcDoc={preparedCampaign.previewHtml} title="Campaign template preview" className="w-full border-0" style={{ minHeight: '520px' }} />
            </div>
          </div>
        </div>
      ) : null}

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
              {campaign.status === 'draft' ? (
                <button
                  type="button"
                  className="ml-2 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-400"
                  onClick={() => applyCampaignToEditor(campaign)}
                >
                  {duplicatedCampaignId === campaign.id ? 'Edit duplicate' : 'Edit'}
                </button>
              ) : null}
              {(campaign.status === 'draft' || campaign.status === 'scheduled') ? (
                <button
                  type="button"
                  disabled={deletingCampaignId === campaign.id}
                  className="ml-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Delete draft campaign "${campaign.name}"? This removes all queued recipients for it.`
                    );
                    if (!confirmed) return;
                    setDeletingCampaignId(campaign.id);
                    setError('');
                    try {
                      const response = await fetch(`/api/admin/email/campaigns/${campaign.id}`, {
                        method: 'DELETE',
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        setError(data?.error || 'Failed to delete campaign');
                        return;
                      }
                      if (preparedCampaign?.id === campaign.id) {
                        setPreparedCampaign(null);
                      }
                      setStatusMessage(
                        `Deleted campaign "${campaign.name}" (${data.deletedRecipientCount || 0} recipients removed).`
                      );
                      await loadAll();
                    } finally {
                      setDeletingCampaignId(null);
                    }
                  }}
                >
                  {deletingCampaignId === campaign.id ? 'Deleting...' : 'Delete draft'}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {mostRecentCompletedCampaign ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Most recent completed campaign
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{mostRecentCompletedCampaign.name}</p>
              <p className="text-xs text-gray-500">
                Lists: {(mostRecentCompletedCampaign.audience.listIds || []).length} | Segments:{' '}
                {(mostRecentCompletedCampaign.audience.segmentIds || []).length}
              </p>
            </div>
            <button
              type="button"
              disabled={isDuplicatingCampaign}
              className="rounded-full border border-action px-3 py-1.5 text-xs font-semibold text-action hover:bg-action hover:text-white disabled:opacity-60"
              onClick={() => duplicateCampaign(mostRecentCompletedCampaign)}
            >
              {isDuplicatingCampaign ? 'Duplicating...' : 'Duplicate'}
            </button>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
