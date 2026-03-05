'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { EmailBlock, CuratedProductCard } from '@/lib/email-platform/types';

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

const blockTypeLabels: Record<EmailBlock['type'], string> = {
  heading: 'Heading',
  text: 'Text',
  cta: 'Button',
  productCards: 'Product Cards',
  curatedProducts: 'Curated Products',
  divider: 'Divider',
  footer: 'Footer',
};

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

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
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Inline content editor state
  const [contentBlocks, setContentBlocks] = useState<EmailBlock[]>([]);
  const [contentSubject, setContentSubject] = useState('');
  const [contentFromName, setContentFromName] = useState('');
  const [contentFromEmail, setContentFromEmail] = useState('');
  const [contentTemplateId, setContentTemplateId] = useState<string | null>(null);
  const [contentMetadata, setContentMetadata] = useState<Record<string, unknown>>({});
  const [contentLogoUrl, setContentLogoUrl] = useState('');
  const [contentLinkColor, setContentLinkColor] = useState('#de8e94');
  const [contentBrandPrimary, setContentBrandPrimary] = useState('#000000');
  const [contentHeaderBg, setContentHeaderBg] = useState('#ffffff');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentEditorOpen, setContentEditorOpen] = useState(false);
  const [newCuratedHandles, setNewCuratedHandles] = useState<Record<string, string>>({});
  const [lastFocusedInput, setLastFocusedInput] = useState<{
    blockId: string;
    field: 'text' | 'label' | 'url';
  } | null>(null);

  // Live preview state
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewHandle, setPreviewHandle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const editorCardRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  function toggleSelectedId(current: string[], id: string): string[] {
    if (current.includes(id)) return current.filter((v) => v !== id);
    return [...current, id];
  }

  function extractAudienceIds(audience: CampaignRow['audience'] | null | undefined) {
    const listIds = Array.isArray(audience?.listIds)
      ? audience.listIds.filter((v): v is string => typeof v === 'string')
      : [];
    const segmentIds = Array.isArray(audience?.segmentIds)
      ? audience.segmentIds.filter((v): v is string => typeof v === 'string')
      : [];
    return { listIds, segmentIds };
  }

  // Block manipulation helpers
  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    setContentBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b))
    );
  };
  const moveBlock = (id: string, dir: 'up' | 'down') => {
    setContentBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = dir === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return arr;
    });
  };
  const removeBlock = (id: string) => setContentBlocks((prev) => prev.filter((b) => b.id !== id));
  const addBlock = (type: EmailBlock['type']) => {
    const id = generateId();
    setContentBlocks((prev) => {
      if (type === 'heading') return [...prev, { id, type, level: 2, text: 'Your heading', align: 'center' }];
      if (type === 'text') return [...prev, { id, type, text: 'Your text here', align: 'left' }];
      if (type === 'cta') return [...prev, { id, type, label: 'Click here', url: '{{siteUrl}}', align: 'center' }];
      if (type === 'productCards') return [...prev, { id, type, mode: 'all' as const }];
      if (type === 'curatedProducts')
        return [...prev, { id, type, showDividers: false, products: [{ id: generateId(), handle: '', title: '', imageUrl: '', url: '' }] }];
      if (type === 'divider') return [...prev, { id, type, align: 'center' as const }];
      if (type === 'footer') return [...prev, { id, type, text: 'The Equestrian\n{{siteUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}', align: 'left' as const }];
      return prev;
    });
  };
  const updateCuratedProducts = (blockId: string, products: CuratedProductCard[]) => {
    updateBlock(blockId, { products } as Partial<EmailBlock>);
  };

  // Live preview
  const fetchPreviewHtml = useCallback(async () => {
    if (!contentEditorOpen || contentBlocks.length === 0) return;
    try {
      const res = await fetch('/api/admin/email/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: previewHandle || null,
          subjectTemplate: contentSubject,
          blocks: contentBlocks,
          metadata: {
            ...contentMetadata,
            logoUrl: contentLogoUrl || null,
            linkColor: contentLinkColor,
            brandPrimary: contentBrandPrimary,
            headerBackground: contentHeaderBg,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.html) setPreviewHtml(data.html);
    } catch {
      // silent
    } finally {
      setPreviewLoaded(true);
    }
  }, [contentEditorOpen, contentBlocks, contentSubject, contentMetadata, contentLogoUrl, contentLinkColor, contentBrandPrimary, contentHeaderBg, previewHandle]);

  useEffect(() => {
    const t = setTimeout(() => { fetchPreviewHtml(); }, 600);
    return () => clearTimeout(t);
  }, [fetchPreviewHtml]);

  // Load template content when templateVersionId changes (only in edit mode)
  useEffect(() => {
    if (!templateVersionId || !editingCampaignId) {
      setContentBlocks([]);
      setContentSubject('');
      setContentFromName('');
      setContentFromEmail('');
      setContentTemplateId(null);
      setContentEditorOpen(false);
      return;
    }
    setIsLoadingContent(true);
    fetch(`/api/admin/email/templates/versions/${templateVersionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.version) {
          setContentBlocks(Array.isArray(data.version.blocks) ? data.version.blocks : []);
          setContentSubject(data.version.subjectTemplate || '');
          setContentFromName(data.version.fromName || 'The Equestrian');
          setContentFromEmail(data.version.fromEmail || 'noreply@theequestrian.com.au');
          const meta =
            data.version.metadata && typeof data.version.metadata === 'object'
              ? (data.version.metadata as Record<string, unknown>)
              : {};
          setContentMetadata(meta);
          setContentLogoUrl(typeof meta.logoUrl === 'string' ? meta.logoUrl : 'https://www.theequestrian.com.au/email-logo.png');
          setContentLinkColor(typeof meta.linkColor === 'string' ? meta.linkColor : '#de8e94');
          setContentBrandPrimary(typeof meta.brandPrimary === 'string' ? meta.brandPrimary : '#000000');
          setContentHeaderBg(typeof meta.headerBackground === 'string' ? meta.headerBackground : '#ffffff');
          setPreviewLoaded(false);
          setContentEditorOpen(true);
        }
        const tpl = templates.find((t) => t.activeVersionId === templateVersionId);
        setContentTemplateId(tpl?.id || null);
      })
      .catch(() => {})
      .finally(() => setIsLoadingContent(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateVersionId, editingCampaignId]);

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

  function clearEditor() {
    setName('');
    setTemplateVersionId('');
    setSelectedListIds([]);
    setSelectedSegmentIds([]);
    setEditingCampaignId(null);
    setDuplicatedCampaignId(null);
    setContentBlocks([]);
    setContentSubject('');
    setContentFromName('');
    setContentFromEmail('');
    setContentTemplateId(null);
    setContentMetadata({});
    setContentLogoUrl('');
    setContentLinkColor('#de8e94');
    setContentBrandPrimary('#000000');
    setContentHeaderBg('#ffffff');
    setContentEditorOpen(false);
    setPreviewHtml('');
    setPreviewLoaded(false);
    setPreviewHandle('');
    setError('');
    setStatusMessage('');
  }

  function applyCampaignToEditor(campaign: CampaignRow) {
    const { listIds, segmentIds } = extractAudienceIds(campaign.audience);
    setError('');
    setName(campaign.name);
    setTemplateVersionId(campaign.templateVersionId || '');
    setSelectedListIds(listIds);
    setSelectedSegmentIds(segmentIds);
    setPreparedCampaign(null);
    setEditingCampaignId(campaign.id);
    setStatusMessage('');
    editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  const updateCampaign = async () => {
    if (!editingCampaignId) return;
    if (!name.trim() || !templateVersionId) {
      setError('Campaign name and template are required');
      return;
    }
    setError('');
    setStatusMessage('');
    setIsPreparing(true);
    try {
      // If content was edited, save a new template version first
      if (contentEditorOpen && contentTemplateId && contentBlocks.length > 0) {
        const mergedMetadata = {
          ...contentMetadata,
          logoUrl: contentLogoUrl || null,
          linkColor: contentLinkColor,
          brandPrimary: contentBrandPrimary,
          headerBackground: contentHeaderBg,
        };
        const versionRes = await fetch(`/api/admin/email/templates/${contentTemplateId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectTemplate: contentSubject,
            blocks: contentBlocks,
            fromName: contentFromName,
            fromEmail: contentFromEmail,
            metadata: mergedMetadata,
            setActive: true,
          }),
        });
        const versionPayload = await versionRes.json();
        if (!versionRes.ok) {
          throw new Error(versionPayload?.error || 'Failed to save template content');
        }
        // Update templateVersionId to the newly created version
        const newVersionId = versionPayload.versionId || versionPayload.id || templateVersionId;
        if (newVersionId && newVersionId !== templateVersionId) {
          await fetch(`/api/admin/email/campaigns/${editingCampaignId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              templateVersionId: newVersionId,
              audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
            }),
          });
          setStatusMessage(`Campaign "${name.trim()}" and email content saved.`);
          clearEditor();
          await loadAll();
          return;
        }
      }

      const updateRes = await fetch(`/api/admin/email/campaigns/${editingCampaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          templateVersionId,
          audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
        }),
      });
      const updatePayload = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updatePayload?.error || 'Failed to update campaign');
      }
      setStatusMessage(`Campaign "${name.trim()}" updated. Use "Send queued" to send it.`);
      clearEditor();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
    } finally {
      setIsPreparing(false);
    }
  };

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
      if (!createResponse.ok) throw new Error(createPayload?.error || 'Failed to create campaign');

      const versionResponse = await fetch(`/api/admin/email/templates/versions/${templateVersionId}`);
      const versionPayload = await versionResponse.json();
      if (!versionResponse.ok || !versionPayload?.version)
        throw new Error(versionPayload?.error || 'Failed to load selected template');

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
      if (!previewResponse.ok) throw new Error(previewPayload?.error || 'Failed to render campaign preview');

      const template = templates.find((t) => t.activeVersionId === templateVersionId);
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
      clearEditor();
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
      if (!response.ok) throw new Error(payload?.error || 'Failed to send campaign');
      setStatusMessage(
        `Campaign sent. Sent: ${payload.sent || 0}, Failed: ${payload.failed || 0}, Skipped: ${payload.skipped || 0}.`
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
      if (!response.ok) throw new Error(payload?.error || 'Failed to duplicate campaign');

      const newCampaignId = String(payload.id || '');
      setDuplicatedCampaignId(newCampaignId || null);
      setName(duplicateName);
      setTemplateVersionId(campaign.templateVersionId);
      setSelectedListIds(listIds);
      setSelectedSegmentIds(segmentIds);
      setPreparedCampaign(null);
      setEditingCampaignId(newCampaignId || null);
      setStatusMessage(`Duplicated "${campaign.name}". Edit the name, content and audience below, then save.`);
      await loadAll();
      editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
    } finally {
      setIsDuplicatingCampaign(false);
    }
  };

  const mostRecentCompletedCampaign =
    campaigns.find((c) => c.status === 'completed' || c.status === 'processing') || null;

  return (
    <AdminLayout title="Email Campaigns" subtitle="One-off bulk sends with list/segment audiences">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">
          ← Back to Email Platform
        </Link>
      </div>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {statusMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}

      {/* ── Create / Edit form ── */}
      <div ref={editorCardRef} className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {editingCampaignId ? 'Edit draft campaign' : 'Create campaign'}
          </h3>
          {editingCampaignId ? (
            <button
              type="button"
              onClick={clearEditor}
              className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
            >
              Cancel editing
            </button>
          ) : null}
        </div>
        {editingCampaignId ? (
          <p className="mt-1 text-xs text-blue-700">
            Change name, audience, or email content below — then click <strong>Save changes</strong>.
          </p>
        ) : null}

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={templateVersionId}
            onChange={(e) => setTemplateVersionId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
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
            <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded border border-gray-300 px-2 py-2">
              {lists.length === 0 ? (
                <p className="text-xs text-gray-500">No lists available.</p>
              ) : (
                lists.map((list) => (
                  <label key={list.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => setSelectedListIds((c) => toggleSelectedId(c, list.id))}
                    />
                    <span>{list.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Selected lists: {selectedListIds.length}</p>
          </label>
          <label className="text-sm text-gray-700">
            Segments
            <select
              multiple
              className="mt-1 h-32 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={selectedSegmentIds}
              onChange={(e) => setSelectedSegmentIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            >
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* ── Inline email content editor (edit mode only) ── */}
        {editingCampaignId ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setContentEditorOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action"
            >
              {isLoadingContent
                ? '⏳ Loading email content…'
                : contentEditorOpen
                  ? '▲ Hide email content editor'
                  : '▼ Edit email content (subject, blocks, text)'}
            </button>

            {contentEditorOpen && !isLoadingContent ? (
              <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* ── Left: editor ── */}
                <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Email content — saves as a new template version
                  </p>

                  {/* Subject / From */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Subject line
                        <input
                          type="text"
                          value={contentSubject}
                          onChange={(e) => setContentSubject(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <label className="block text-xs font-medium text-gray-700">
                      From name
                      <input
                        type="text"
                        value={contentFromName}
                        onChange={(e) => setContentFromName(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      From email
                      <input
                        type="email"
                        value={contentFromEmail}
                        onChange={(e) => setContentFromEmail(e.target.value)}
                        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  {/* Branding */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Branding</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Logo URL (public image URL)
                          <input
                            type="text"
                            value={contentLogoUrl}
                            onChange={(e) => setContentLogoUrl(e.target.value)}
                            placeholder="https://www.theequestrian.com.au/email-logo.png"
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          />
                        </label>
                        {contentLogoUrl ? (
                          <img src={contentLogoUrl} alt="Logo preview" className="mt-2 max-h-12" />
                        ) : null}
                      </div>
                      <label className="block text-xs font-medium text-gray-700">
                        Button colour
                        <div className="mt-1 flex items-center gap-2">
                          <input type="color" value={contentBrandPrimary} onChange={(e) => setContentBrandPrimary(e.target.value)} className="h-9 w-10 rounded border border-gray-300" />
                          <input type="text" value={contentBrandPrimary} onChange={(e) => setContentBrandPrimary(e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                      </label>
                      <label className="block text-xs font-medium text-gray-700">
                        Link / accent colour
                        <div className="mt-1 flex items-center gap-2">
                          <input type="color" value={contentLinkColor} onChange={(e) => setContentLinkColor(e.target.value)} className="h-9 w-10 rounded border border-gray-300" />
                          <input type="text" value={contentLinkColor} onChange={(e) => setContentLinkColor(e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                      </label>
                      <label className="block text-xs font-medium text-gray-700">
                        Header background
                        <div className="mt-1 flex items-center gap-2">
                          <input type="color" value={contentHeaderBg} onChange={(e) => setContentHeaderBg(e.target.value)} className="h-9 w-10 rounded border border-gray-300" />
                          <input type="text" value={contentHeaderBg} onChange={(e) => setContentHeaderBg(e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Token buttons + Insert link */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">
                      Click to insert into focused field. For links: <code className="rounded bg-gray-100 px-1 text-xs">[Link text](https://url.com)</code> renders as a styled link.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Customer name', token: '{{customerName}}' },
                        { label: 'Order number', token: '{{orderNumber}}' },
                        { label: 'Product title', token: '{{productTitle}}' },
                        { label: 'Product URL', token: '{{productUrl}}' },
                        { label: 'Site URL', token: '{{siteUrl}}' },
                        { label: 'Unsubscribe URL', token: '{{unsubscribeUrl}}' },
                      ].map((item) => (
                        <button
                          key={item.token}
                          type="button"
                          onClick={() => {
                            if (!lastFocusedInput) {
                              navigator.clipboard.writeText(item.token);
                              return;
                            }
                            const block = contentBlocks.find((b) => b.id === lastFocusedInput.blockId);
                            if (!block) return;
                            const field = lastFocusedInput.field;
                            const input = document.querySelector(
                              `[data-block-id="${block.id}"][data-field="${field}"]`
                            ) as HTMLInputElement | HTMLTextAreaElement | null;
                            if (!input) return;
                            const start = input.selectionStart ?? (input.value || '').length;
                            const end = input.selectionEnd ?? (input.value || '').length;
                            const current = input.value || '';
                            const updated = current.slice(0, start) + item.token + current.slice(end);
                            if (block.type === 'heading' || block.type === 'text' || block.type === 'footer') {
                              updateBlock(block.id, { text: updated });
                            } else if (block.type === 'cta') {
                              updateBlock(block.id, { [field]: updated });
                            }
                          }}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-action hover:text-action"
                        >
                          {item.label}
                        </button>
                      ))}
                      {/* Insert link button */}
                      <button
                        type="button"
                        onClick={() => {
                          const anchor = window.prompt('Link text (anchor):') || 'Click here';
                          const href = window.prompt('URL:', 'https://') || 'https://';
                          const token = `[${anchor}](${href})`;
                          if (!lastFocusedInput) {
                            navigator.clipboard.writeText(token);
                            return;
                          }
                          const block = contentBlocks.find((b) => b.id === lastFocusedInput.blockId);
                          if (!block) return;
                          const field = lastFocusedInput.field;
                          const input = document.querySelector(
                            `[data-block-id="${block.id}"][data-field="${field}"]`
                          ) as HTMLInputElement | HTMLTextAreaElement | null;
                          if (!input) return;
                          const start = input.selectionStart ?? (input.value || '').length;
                          const end = input.selectionEnd ?? (input.value || '').length;
                          const current = input.value || '';
                          const updated = current.slice(0, start) + token + current.slice(end);
                          if (block.type === 'heading' || block.type === 'text' || block.type === 'footer') {
                            updateBlock(block.id, { text: updated });
                          } else if (block.type === 'cta') {
                            updateBlock(block.id, { [field]: updated });
                          }
                        }}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:border-blue-400"
                      >
                        🔗 Insert link
                      </button>
                    </div>
                  </div>

                  {/* Block list */}
                  <div className="space-y-2">
                    {contentBlocks.map((block, idx) => (
                      <div key={block.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-gray-500">
                            {blockTypeLabels[block.type]}
                          </span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                            <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={idx === contentBlocks.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                            <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-red-400 hover:text-red-600">×</button>
                          </div>
                        </div>

                        {block.type === 'heading' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <select value={block.level || 2} onChange={(e) => updateBlock(block.id, { level: Number(e.target.value) as 1 | 2 | 3 })} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
                              </select>
                              <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                              </select>
                            </div>
                            <input type="text" value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })} data-block-id={block.id} data-field="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                          </div>
                        )}

                        {block.type === 'text' && (
                          <div className="space-y-2">
                            <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                            </select>
                            <textarea value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })} data-block-id={block.id} data-field="text" rows={4} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                          </div>
                        )}

                        {block.type === 'cta' && (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input type="text" placeholder="Button label" value={block.label} onChange={(e) => updateBlock(block.id, { label: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'label' })} data-block-id={block.id} data-field="label" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                            <input type="text" placeholder="Button URL" value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'url' })} data-block-id={block.id} data-field="url" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                            <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2">
                              <option value="left">Align left</option><option value="center">Align center</option><option value="right">Align right</option>
                            </select>
                          </div>
                        )}

                        {block.type === 'productCards' && (
                          <div className="flex gap-2">
                            <select value={block.mode} onChange={(e) => updateBlock(block.id, { mode: e.target.value as 'single' | 'all' })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                              <option value="single">Single product</option><option value="all">All products</option>
                            </select>
                            <p className="self-center text-xs text-gray-500">Populated from order data at send time</p>
                          </div>
                        )}

                        {block.type === 'curatedProducts' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add product by handle"
                                value={newCuratedHandles[block.id] || ''}
                                onChange={(e) => setNewCuratedHandles((prev) => ({ ...prev, [block.id]: e.target.value }))}
                                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const handle = (newCuratedHandles[block.id] || '').trim();
                                  if (!handle || block.type !== 'curatedProducts') return;
                                  const res = await fetch('/api/admin/email/templates/preview-product', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ handle }),
                                  });
                                  const data = await res.json();
                                  const p = data.product || {};
                                  updateCuratedProducts(block.id, [...block.products, { id: generateId(), handle, title: p.title || '', imageUrl: p.imageUrl || '', url: p.url || '', price: p.price || '', compareAtPrice: p.compareAtPrice || '', savePercent: p.savePercent || '', freeShippingBadge: p.freeShippingBadge !== false }]);
                                  setNewCuratedHandles((prev) => ({ ...prev, [block.id]: '' }));
                                }}
                                className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                              >
                                + Add
                              </button>
                            </div>
                            {block.type === 'curatedProducts' && block.products.map((product) => (
                              <div key={product.id} className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2">
                                {product.imageUrl ? <img src={product.imageUrl} alt={product.title || product.handle} className="h-10 w-10 rounded object-cover" /> : null}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-xs font-medium text-gray-800">{product.title || product.handle || '(untitled)'}</p>
                                  {product.price ? <p className="text-xs text-gray-500">{product.price}</p> : null}
                                </div>
                                <button type="button" onClick={() => updateCuratedProducts(block.id, block.type === 'curatedProducts' ? block.products.filter((p) => p.id !== product.id) : [])} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {block.type === 'footer' && (
                          <textarea value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })} data-block-id={block.id} data-field="text" rows={3} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                        )}

                        {block.type === 'divider' && (
                          <p className="text-xs italic text-gray-400">Horizontal divider line</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add block buttons */}
                  <div className="flex flex-wrap gap-2">
                    {(['heading', 'text', 'cta', 'productCards', 'curatedProducts', 'divider', 'footer'] as const).map((type) => (
                      <button key={type} type="button" onClick={() => addBlock(type)} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-action hover:text-action">
                        + {blockTypeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Right: live preview ── */}
                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Live Preview</h4>
                    <button
                      type="button"
                      onClick={fetchPreviewHtml}
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-action hover:text-action"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Preview product handle (optional)"
                      value={previewHandle}
                      onChange={(e) => setPreviewHandle(e.target.value)}
                      className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={previewLoading}
                      onClick={fetchPreviewHtml}
                      className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action disabled:opacity-60"
                    >
                      {previewLoading ? 'Loading…' : 'Load'}
                    </button>
                  </div>
                  {previewLoaded ? (
                    <div className="overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-2" style={{ maxHeight: '70vh' }}>
                      <iframe srcDoc={previewHtml} title="Email preview" className="w-full border-0" style={{ minHeight: '600px' }} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                      Loading preview…
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          {editingCampaignId ? (
            <button
              type="button"
              disabled={isPreparing}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={updateCampaign}
            >
              {isPreparing ? 'Saving…' : 'Save changes'}
            </button>
          ) : (
            <button
              type="button"
              disabled={isPreparing}
              className="rounded bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={prepareCampaign}
            >
              {isPreparing ? 'Preparing…' : 'Create campaign'}
            </button>
          )}
        </div>
      </div>

      {/* ── Prepared campaign summary ── */}
      {preparedCampaign ? (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Campaign Summary</h3>
            <p className="mt-2 text-sm text-gray-600">
              This campaign will send template{' '}
              <span className="font-semibold">{preparedCampaign.templateName}</span> to contacts resolved from
              selected lists and segments.
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
              {isSendingCampaign ? 'Sending…' : 'Send campaign'}
            </button>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-900">Template preview</p>
            <p className="mb-2 text-xs text-gray-500">Subject: {preparedCampaign.previewSubject}</p>
            <div
              className="overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-2"
              style={{ maxHeight: '60vh' }}
            >
              <iframe
                srcDoc={preparedCampaign.previewHtml}
                title="Campaign template preview"
                className="w-full border-0"
                style={{ minHeight: '520px' }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Campaign list ── */}
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
                <p className="text-xs text-gray-500">
                  Status: {campaign.status} | Lists: {(campaign.audience.listIds || []).length} | Segments:{' '}
                  {(campaign.audience.segmentIds || []).length}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                    className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-400"
                    onClick={() => applyCampaignToEditor(campaign)}
                  >
                    {duplicatedCampaignId === campaign.id ? 'Edit duplicate' : 'Edit'}
                  </button>
                ) : null}
                {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                  <button
                    type="button"
                    disabled={deletingCampaignId === campaign.id}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
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
                        if (preparedCampaign?.id === campaign.id) setPreparedCampaign(null);
                        setStatusMessage(
                          `Deleted campaign "${campaign.name}" (${data.deletedRecipientCount || 0} recipients removed).`
                        );
                        await loadAll();
                      } finally {
                        setDeletingCampaignId(null);
                      }
                    }}
                  >
                    {deletingCampaignId === campaign.id ? 'Deleting…' : 'Delete draft'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Most recent completed campaign ── */}
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
              {isDuplicatingCampaign ? 'Duplicating…' : 'Duplicate'}
            </button>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
