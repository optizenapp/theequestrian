'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { EmailBlock, CuratedProductCard } from '@/lib/email-platform/types';
import { applyAlternatingProductLayout } from '@/lib/email-platform/auto-weekly/product-layout';
import { continueBulletOnEnter, insertBulletMarker } from '@/lib/email-platform/text-block-bullets';
import { CampaignScheduleControls } from './CampaignScheduleControls';
import { SocialPostsPanel } from './SocialPostsPanel';
import { SlideCopyEditor } from './SlideCopyEditor';
import { ThumbnailsPanel } from './ThumbnailsPanel';

type ProductUsageItem = { campaignName: string; scheduledAt: string };
export type CampaignVideoVariantThumbnails = { frame: string | null; custom: string | null };
type CampaignVideo = {
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  variantUrls?: Record<string, string> | null;
  variantThumbnails?: Record<string, CampaignVideoVariantThumbnails> | null;
  videoTemplate?: string | null;
  subjectLine?: string | null;
  musicModel?: string | null;
  updatedAt: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  templateVersionId: string | null;
  audience: { listIds?: string[]; segmentIds?: string[] };
  scheduledAt: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
  productUsage?: Record<string, ProductUsageItem[]>;
  video?: CampaignVideo | null;
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

type CampaignStats = {
  sentCount: number;
  remainingQueued: number;
  deliveredCount: number;
  uniqueOpenedCount: number;
  totalOpenCount: number;
  uniqueClickedCount: number;
  totalClickCount: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
};

const blockTypeLabels: Record<EmailBlock['type'], string> = {
  heading: 'Heading',
  text: 'Text',
  cta: 'Button',
  productCards: 'Product Cards',
  curatedProducts: 'Curated Products',
  llmIntro: 'LLM Intro',
  llmHeading: 'LLM Heading',
  image: 'Image',
  divider: 'Divider',
  footer: 'Footer',
};

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseHandleLines(text: string): string[] {
  return text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

function getStringMeta(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === 'string' ? value : '';
}

function getAutoProductHandles(meta: Record<string, unknown>): string[] {
  const raw = meta.productHandles;
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string').map((h) => h.trim()).filter(Boolean);
  if (typeof raw === 'string') return parseHandleLines(raw);
  return [];
}

function firstTextBlock(blocks: EmailBlock[], preferred: EmailBlock['type'], fallback: EmailBlock['type']) {
  return blocks.find((block) => block.type === preferred) ?? blocks.find((block) => block.type === fallback);
}

function extractMarkdownCta(blocks: EmailBlock[]): { ctaLabel?: string; ctaUrl?: string } {
  const block = blocks.find((b) => b.type === 'text' && /view all/i.test(b.text));
  if (!block || block.type !== 'text') return {};
  const match = block.text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!match) return {};
  return { ctaLabel: match[1].trim(), ctaUrl: match[2].trim() };
}

function isPendingAutoCampaign(c: CampaignRow | null | undefined): boolean {
  if (!c) return false;
  const isAuto = c.createdBy === 'auto-weekly' || c.createdBy === 'auto-campaign';
  if (!isAuto) return false;
  return c.status === 'pending_approval' || c.status === 'draft';
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
  const [cancellingCampaignId, setCancellingCampaignId] = useState<string | null>(null);
  const [resendingCampaignId, setResendingCampaignId] = useState<string | null>(null);
  const [resendingNonOpenersId, setResendingNonOpenersId] = useState<string | null>(null);
  const [preparedCampaign, setPreparedCampaign] = useState<PreparedCampaign | null>(null);
  const [duplicatedCampaignId, setDuplicatedCampaignId] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignStatsById, setCampaignStatsById] = useState<Record<string, CampaignStats>>({});
  const [campaignStatsLoading, setCampaignStatsLoading] = useState<Record<string, boolean>>({});

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

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState('');
  const [sendingCampaignTestId, setSendingCampaignTestId] = useState<string | null>(null);
  const [videoActionCampaignId, setVideoActionCampaignId] = useState<string | null>(null);

  const [autoWeeklyEnabled, setAutoWeeklyEnabled] = useState<boolean | null>(null);
  const [autoWeeklyUpdating, setAutoWeeklyUpdating] = useState(false);
  /** Editable send-time overrides for auto campaigns awaiting approval */
  const [pendingAutoMeta, setPendingAutoMeta] = useState<Record<string, unknown> | null>(null);

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
      if (type === 'llmHeading')
        return [...prev, { id, type, level: 2, text: "This week's picks", align: 'left', prompt: '' }];
      if (type === 'llmIntro')
        return [...prev, { id, type, text: 'A short intro goes here.', align: 'left', prompt: '' }];
      if (type === 'cta') return [...prev, { id, type, label: 'Click here', url: '{{siteUrl}}', align: 'center' }];
      if (type === 'productCards') return [...prev, { id, type, mode: 'all' as const }];
      if (type === 'curatedProducts')
        return [...prev, { id, type, showDividers: false, products: [{ id: generateId(), handle: '', title: '', imageUrl: '', url: '' }] }];
      if (type === 'image') return [...prev, { id, type, url: '', alt: '', align: 'center' as const }];
      if (type === 'divider') return [...prev, { id, type, align: 'center' as const }];
      if (type === 'footer') return [...prev, { id, type, text: 'The Equestrian\n{{siteUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}', align: 'left' as const }];
      return prev;
    });
  };
  const updateCuratedProducts = (blockId: string, products: CuratedProductCard[]) => {
    updateBlock(blockId, { products } as Partial<EmailBlock>);
  };

  async function loadCuratedCardsForHandles(handles: string[]): Promise<CuratedProductCard[]> {
    const cards = await Promise.all(
      handles.map(async (handle) => {
        const res = await fetch('/api/admin/email/templates/preview-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle }),
        });
        if (!res.ok) return { id: generateId(), handle, title: handle, imageUrl: '', url: '' };
        const data = await res.json();
        const p = data.product || {};
        return {
          id: generateId(),
          handle,
          title: p.title || handle,
          imageUrl: p.imageUrl || '',
          url: p.url || '',
          price: p.price || '',
          compareAtPrice: p.compareAtPrice || '',
          savePercent: p.savePercent || '',
          freeShippingBadge: p.freeShippingBadge === true,
        };
      })
    );
    return cards;
  }

  async function materializeAutoCampaignBlocks(blocks: EmailBlock[], meta: Record<string, unknown>): Promise<EmailBlock[]> {
    const productCards = await loadCuratedCardsForHandles(getAutoProductHandles(meta));
    const introText = getStringMeta(meta, 'introText');
    const generatedHeading = (getStringMeta(meta, 'generatedHeading') || getStringMeta(meta, 'subjectLine'))
      .trim()
      .replace(/^["'“”🎁\s]+/, '')
      .replace(/["'“”]+$/, '')
      .trim();
    const ctaLabel = getStringMeta(meta, 'ctaLabel').trim();
    const ctaUrl = getStringMeta(meta, 'ctaUrl').trim();
    const hasLlmIntroBlock = blocks.some((block) => block.type === 'llmIntro');
    const hasLlmHeadingBlock = blocks.some((block) => block.type === 'llmHeading');
    let firstTextReplaced = false;
    let firstHeadingReplaced = false;
    let firstTextCtaReplaced = false;
    const materialized = blocks.map((block) => {
      if (generatedHeading && block.type === 'llmHeading') return { ...block, text: generatedHeading };
      if (generatedHeading && !hasLlmHeadingBlock && block.type === 'heading' && !firstHeadingReplaced) {
        firstHeadingReplaced = true;
        return { ...block, text: generatedHeading };
      }
      if (introText && block.type === 'llmIntro') return { ...block, text: introText };
      if (introText && !hasLlmIntroBlock && block.type === 'text' && !firstTextReplaced) {
        firstTextReplaced = true;
        return { ...block, text: introText };
      }
      if (block.type === 'cta' && (ctaLabel || ctaUrl)) {
        return { ...block, ...(ctaLabel ? { label: ctaLabel } : {}), ...(ctaUrl ? { url: ctaUrl } : {}) };
      }
      if (ctaLabel && ctaUrl && block.type === 'text' && !firstTextCtaReplaced && /view all/i.test(block.text)) {
        firstTextCtaReplaced = true;
        return { ...block, text: `[${ctaLabel}](${ctaUrl})` };
      }
      if (block.type === 'curatedProducts' && productCards.length > 0) return { ...block, products: productCards };
      return block;
    });
    return applyAlternatingProductLayout(materialized, productCards, introText);
  }

  function deriveAutoMetadataFromEditor(base: Record<string, unknown>) {
    const introBlock = firstTextBlock(contentBlocks, 'llmIntro', 'text');
    const headingBlock = firstTextBlock(contentBlocks, 'llmHeading', 'heading');
    const ctaBlock = contentBlocks.find((block) => block.type === 'cta');
    const curatedBlock = contentBlocks.find((block) => block.type === 'curatedProducts');
    const textCta = extractMarkdownCta(contentBlocks);
    return {
      ...base,
      subjectLine: contentSubject,
      introText: introBlock && 'text' in introBlock ? introBlock.text : getStringMeta(base, 'introText'),
      generatedHeading: headingBlock && 'text' in headingBlock ? headingBlock.text : getStringMeta(base, 'generatedHeading'),
      productHandles:
        curatedBlock && curatedBlock.type === 'curatedProducts'
          ? curatedBlock.products.map((product) => product.handle).filter(Boolean)
          : getAutoProductHandles(base),
      ...(ctaBlock && ctaBlock.type === 'cta' ? { ctaLabel: ctaBlock.label, ctaUrl: ctaBlock.url } : textCta),
      ...(contentLogoUrl ? { logoUrl: contentLogoUrl } : {}),
    };
  }

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

  const sendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setTestEmailStatus('Enter an email address first.');
      return;
    }
    setIsSendingTest(true);
    setTestEmailStatus('');
    try {
      const res = await fetch('/api/admin/email/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailAddress.trim(),
          subjectTemplate: contentSubject,
          blocks: contentBlocks,
          fromName: contentFromName,
          fromEmail: contentFromEmail,
          handle: previewHandle || null,
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
      if (!res.ok) throw new Error(data?.error || 'Failed to send test email');
      setTestEmailStatus(`Test email sent to ${testEmailAddress.trim()}`);
    } catch (err) {
      setTestEmailStatus(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestEmailStatus(''), 5000);
    }
  };

  const sendCampaignTestEmail = async (campaignId: string) => {
    if (!testEmailAddress.trim()) {
      setTestEmailStatus('Enter an email address first.');
      return;
    }
    setSendingCampaignTestId(campaignId);
    setTestEmailStatus('');
    try {
      const res = await fetch(`/api/admin/email/campaigns/${campaignId}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailAddress.trim() }),
      });
      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to send campaign test email');
      }
      setTestEmailStatus(`Campaign test sent to ${testEmailAddress.trim()}`);
    } catch (err) {
      setTestEmailStatus(err instanceof Error ? err.message : 'Failed to send campaign test email');
    } finally {
      setSendingCampaignTestId(null);
      setTimeout(() => setTestEmailStatus(''), 5000);
    }
  };

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
    let cancelled = false;
    setIsLoadingContent(true);
    void (async () => {
      try {
        const r = await fetch(`/api/admin/email/templates/versions/${templateVersionId}`);
        const data: { version?: Record<string, unknown>; error?: string } = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setContentTemplateId(null);
          return;
        }
        const v = data.version;
        if (v) {
          const campaign = campaigns.find((c) => c.id === editingCampaignId) || null;
          const autoMeta = isPendingAutoCampaign(campaign) && campaign?.metadata ? campaign.metadata : null;
          const blocks = Array.isArray(v.blocks) ? (v.blocks as EmailBlock[]) : [];
          setContentBlocks(autoMeta ? await materializeAutoCampaignBlocks(blocks, autoMeta) : blocks);
          setContentSubject(
            autoMeta && typeof autoMeta.subjectLine === 'string'
              ? autoMeta.subjectLine
              : typeof v.subjectTemplate === 'string'
                ? v.subjectTemplate
                : ''
          );
          setContentFromName(typeof v.fromName === 'string' ? v.fromName : 'The Equestrian');
          setContentFromEmail(typeof v.fromEmail === 'string' ? v.fromEmail : 'support@theequestrian.com.au');
          const meta =
            v.metadata && typeof v.metadata === 'object' && !Array.isArray(v.metadata)
              ? (v.metadata as Record<string, unknown>)
              : {};
          const logoUrl = autoMeta && typeof autoMeta.logoUrl === 'string' ? autoMeta.logoUrl : meta.logoUrl;
          setContentMetadata(meta);
          setContentLogoUrl(typeof logoUrl === 'string' ? logoUrl : 'https://www.theequestrian.com.au/email-logo.png');
          setContentLinkColor(typeof meta.linkColor === 'string' ? meta.linkColor : '#de8e94');
          setContentBrandPrimary(typeof meta.brandPrimary === 'string' ? meta.brandPrimary : '#000000');
          setContentHeaderBg(typeof meta.headerBackground === 'string' ? meta.headerBackground : '#ffffff');
          setPreviewLoaded(false);
          setContentEditorOpen(true);
          const fromVersion = typeof v.templateId === 'string' && v.templateId ? v.templateId : null;
          const fromActive = templates.find((t) => t.activeVersionId === templateVersionId)?.id ?? null;
          setContentTemplateId(fromVersion || fromActive);
        } else {
          setContentTemplateId(null);
        }
      } catch {
        if (!cancelled) setContentTemplateId(null);
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateVersionId, editingCampaignId, templates]);

  async function loadAll() {
    const [campaignRes, listRes, segmentRes, templateRes] = await Promise.all([
      fetch('/api/admin/email/campaigns?limit=1000', { cache: 'no-store' }),
      fetch('/api/admin/email/lists', { cache: 'no-store' }),
      fetch('/api/admin/email/segments', { cache: 'no-store' }),
      fetch('/api/admin/email/templates', { cache: 'no-store' }),
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

  async function pollVideoStatusUntilDone(campaignId: string): Promise<string> {
    const maxAttempts = 120;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const res = await fetch(
          `/api/admin/email/campaigns/${campaignId}/video/status`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        const status = String(data?.video?.status || '');
        if (status && status !== 'rendering' && status !== 'queued') {
          return status;
        }
      } catch {
        // Network blip; keep polling.
      }
    }
    return 'rendering';
  }

  async function runVideoAction(
    campaignId: string,
    action: 'create' | 'regenerate' | 'regenerate-music' | 'approve' | 'reject'
  ) {
    setVideoActionCampaignId(campaignId);
    setError('');
    setStatusMessage('');
    const isRenderAction = action === 'create' || action === 'regenerate' || action === 'regenerate-music';
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/video/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Video action failed');
        return;
      }
      if (isRenderAction) {
        setStatusMessage('Rendering started. This usually takes 2–5 minutes…');
        await loadAll();
        const finalStatus = await pollVideoStatusUntilDone(campaignId);
        if (finalStatus === 'ready_for_review') {
          setStatusMessage(
            action === 'regenerate-music'
              ? 'Video re-rendered with new music. Previous track blacklisted.'
              : 'Video ready for review.'
          );
        } else if (finalStatus === 'render_failed') {
          setError('Video render failed. Check terminal for details.');
        }
        await loadAll();
        return;
      }
      const messageMap: Record<string, string> = {
        approve: 'Video approved.',
        reject: 'Video rejected.',
      };
      setStatusMessage(messageMap[action] || 'Video action complete.');
      await loadAll();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Video action failed');
    } finally {
      setVideoActionCampaignId(null);
    }
  }

  function renderVideoActionSection(campaign: CampaignRow) {
    const isAutoCampaign = campaign.createdBy === 'auto-weekly' || campaign.createdBy === 'auto-campaign';
    const supportsVideoActions =
      campaign.status === 'pending_approval' ||
      campaign.status === 'scheduled' ||
      campaign.status === 'draft';
    if (!isAutoCampaign || !supportsVideoActions) return null;
    const autoTypeRaw = typeof campaign.metadata?.autoType === 'string' ? campaign.metadata.autoType.toLowerCase() : '';
    const editorVariant: 'brand' | 'on_sale' | 'category' =
      autoTypeRaw === 'on_sale' ? 'on_sale' : autoTypeRaw === 'category' ? 'category' : 'brand';
    return (
      <details className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2">
        <summary className="cursor-pointer text-xs font-semibold text-indigo-900">Video Creation</summary>
        <p className="mt-1 text-xs text-indigo-700">Video must be approved before creating social posts.</p>
        <SlideCopyEditor campaignId={campaign.id} variant={editorVariant} />
        <ThumbnailsPanel
          campaignId={campaign.id}
          variantThumbnails={campaign.video?.variantThumbnails ?? null}
          onRegenerated={() => void loadAll()}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-500 disabled:opacity-60"
            disabled={videoActionCampaignId === campaign.id}
            onClick={() =>
              void runVideoAction(
                campaign.id,
                campaign.video?.videoUrl ? 'regenerate' : 'create'
              )
            }
          >
            {videoActionCampaignId === campaign.id
              ? 'Working...'
              : campaign.video?.videoUrl
                ? 'Regenerate Video'
                : 'Create Video'}
          </button>
          <button
            type="button"
            className="rounded-full border border-purple-300 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:border-purple-500 disabled:opacity-60"
            disabled={videoActionCampaignId === campaign.id || !campaign.video?.videoUrl}
            title="Blacklist current track and regenerate with new music"
            onClick={() => void runVideoAction(campaign.id, 'regenerate-music')}
          >
            Try New Music
          </button>
          <button
            type="button"
            className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:border-emerald-500 disabled:opacity-60"
            disabled={videoActionCampaignId === campaign.id || campaign.video?.status !== 'ready_for_review'}
            onClick={() => void runVideoAction(campaign.id, 'approve')}
          >
            Approve Video
          </button>
          <button
            type="button"
            className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-500 disabled:opacity-60"
            disabled={videoActionCampaignId === campaign.id || !campaign.video}
            onClick={() => void runVideoAction(campaign.id, 'reject')}
          >
            Reject Video
          </button>
        </div>
      </details>
    );
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load campaign data'));
  }, []);

  useEffect(() => {
    async function loadAutoFlow() {
      try {
        const res = await fetch('/api/admin/email/auto-campaigns/settings');
        const data = await res.json();
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load auto settings');
        setAutoWeeklyEnabled(data.enabled === true);
      } catch {
        setAutoWeeklyEnabled(false);
      }
    }
    void loadAutoFlow();
  }, []);

  useEffect(() => {
    const campaignIds = campaigns
      .filter((campaign) => campaign.status !== 'draft' && campaign.status !== 'scheduled')
      .map((campaign) => campaign.id);
    if (campaignIds.length === 0) {
      setCampaignStatsById({});
      setCampaignStatsLoading({});
      return;
    }

    let isCancelled = false;
    setCampaignStatsLoading((prev) => {
      const next = { ...prev };
      for (const campaignId of campaignIds) {
        next[campaignId] = true;
      }
      return next;
    });

    Promise.all(
      campaignIds.map(async (campaignId) => {
        const response = await fetch(`/api/admin/email/campaigns/${campaignId}/stats`);
        const data = await response.json();
        if (!response.ok || !data?.stats) {
          throw new Error(data?.error || `Failed to load stats for campaign ${campaignId}`);
        }
        return { campaignId, stats: data.stats as CampaignStats };
      })
    )
      .then((statsRows) => {
        if (isCancelled) return;
        const next: Record<string, CampaignStats> = {};
        for (const row of statsRows) {
          next[row.campaignId] = row.stats;
        }
        setCampaignStatsById(next);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Failed to load campaign stats:', err);
      })
      .finally(() => {
        if (isCancelled) return;
        setCampaignStatsLoading((prev) => {
          const next = { ...prev };
          for (const campaignId of campaignIds) {
            next[campaignId] = false;
          }
          return next;
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [campaigns]);

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
    setTestEmailAddress('');
    setTestEmailStatus('');
    setError('');
    setStatusMessage('');
    setPendingAutoMeta(null);
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
    if (isPendingAutoCampaign(campaign)) {
      const raw = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
        ? campaign.metadata
        : {};
      setPendingAutoMeta({ ...raw });
    } else {
      setPendingAutoMeta(null);
    }
    editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  const updateCampaign = async () => {
    if (!editingCampaignId) return;
    const currentlyEditing = campaigns.find((c) => c.id === editingCampaignId) || null;
    const wasCancelled = String(currentlyEditing?.status || '').toLowerCase() === 'cancelled';
    if (!name.trim() || !templateVersionId) {
      setError('Campaign name and template are required');
      return;
    }
    const autoMetadataPatch =
      pendingAutoMeta && isPendingAutoCampaign(currentlyEditing)
        ? deriveAutoMetadataFromEditor(pendingAutoMeta)
        : undefined;
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
          const campaignPatchBody: Record<string, unknown> = {
            name: name.trim(),
            templateVersionId: newVersionId,
            audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
          };
          if (autoMetadataPatch) campaignPatchBody.metadata = autoMetadataPatch;
          const campaignPatchRes = await fetch(`/api/admin/email/campaigns/${editingCampaignId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignPatchBody),
          });
          const campaignPatchPayload = await campaignPatchRes.json();
          if (!campaignPatchRes.ok) {
            throw new Error(
              typeof campaignPatchPayload?.error === 'string'
                ? campaignPatchPayload.error
                : 'Failed to update campaign'
            );
          }
          setStatusMessage(`Campaign "${name.trim()}" and email content saved.`);
          clearEditor();
          await loadAll();
          return;
        }
      }

      const updateBody: Record<string, unknown> = {
        name: name.trim(),
        templateVersionId,
        audience: { listIds: selectedListIds, segmentIds: selectedSegmentIds },
      };
      if (autoMetadataPatch) updateBody.metadata = autoMetadataPatch;
      const updateRes = await fetch(`/api/admin/email/campaigns/${editingCampaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      const updatePayload = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updatePayload?.error || 'Failed to update campaign');
      }
      const successMessage = wasCancelled
        ? `Campaign "${name.trim()}" reactivated. ${
            Number(updatePayload?.reactivatedRecipients || 0)
          } unsent recipients re-queued. Use "Send queued" to continue.`
        : `Campaign "${name.trim()}" updated. Use "Send queued" to send it.`;
      clearEditor();
      setStatusMessage(successMessage);
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
    const campaignId = preparedCampaign.id;
    setError('');
    setStatusMessage('');
    setIsSendingCampaign(true);
    try {
      const sendRequest = fetch(`/api/admin/email/campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      setPreparedCampaign(null);
      setStatusMessage('Campaign send started. It will appear in the list below while recipients are processed.');
      await new Promise((resolve) => setTimeout(resolve, 750));
      await loadAll();
      const response = await sendRequest;
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to send campaign');
      setStatusMessage(
        `Campaign sent. Sent: ${payload.sent || 0}, Failed: ${payload.failed || 0}, Skipped: ${payload.skipped || 0}.`
      );
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
    campaigns.find((c) => {
      const normalizedStatus = String(c.status || '').toLowerCase();
      return normalizedStatus === 'completed' || normalizedStatus === 'complete' || normalizedStatus === 'processing';
    }) || null;

  return (
    <AdminLayout title="Email Campaigns" subtitle="One-off bulk sends with list/segment audiences">
      <div className="mb-4 flex flex-wrap gap-3">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">
          ← Back to Email Platform
        </Link>
        <Link href="/admin/email/auto-campaigns" className="text-sm font-semibold text-sky-800 hover:underline">
          Auto campaigns
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Campaign name</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Sale – March 2025"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Template</span>
            <select
            value={templateVersionId}
            onChange={(e) => setTemplateVersionId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select template version</option>
            {templates.map((template) => (
              <option key={template.id} value={template.activeVersionId || ''}>
                {template.name} {template.activeVersionId ? '' : '(no active version)'}
              </option>
            ))}
          </select>
          </label>
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

        {editingCampaignId && pendingAutoMeta !== null ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-900">
            Auto campaign content has been loaded into the email content editor below. Edit the subject,
            text, images, CTA, and curated products there; saving will update the campaign send content.
          </div>
        ) : null}

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
                            if (
                              block.type === 'heading' ||
                              block.type === 'text' ||
                              block.type === 'llmHeading' ||
                              block.type === 'llmIntro' ||
                              block.type === 'footer'
                            ) {
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
                          if (
                            block.type === 'heading' ||
                            block.type === 'text' ||
                            block.type === 'llmHeading' ||
                            block.type === 'llmIntro' ||
                            block.type === 'footer'
                          ) {
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
                            <div className="flex flex-wrap items-center gap-2">
                              <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                              </select>
                              <button
                                type="button"
                                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                                onClick={() => {
                                  const input = document.querySelector(
                                    `[data-block-id="${block.id}"][data-field="text"]`
                                  ) as HTMLTextAreaElement | null;
                                  const start = input?.selectionStart ?? (block.text || '').length;
                                  const end = input?.selectionEnd ?? start;
                                  const next = insertBulletMarker(block.text || '', start, end);
                                  updateBlock(block.id, { text: next.text });
                                  setLastFocusedInput({ blockId: block.id, field: 'text' });
                                  requestAnimationFrame(() => {
                                    const el = document.querySelector(
                                      `[data-block-id="${block.id}"][data-field="text"]`
                                    ) as HTMLTextAreaElement | null;
                                    if (!el) return;
                                    el.focus();
                                    el.setSelectionRange(next.cursor, next.cursor);
                                  });
                                }}
                              >
                                • Bullet
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Tip: start a line with <code>- </code> or click Bullet. Press Enter to continue the list.
                            </p>
                            <textarea
                              value={block.text}
                              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                              onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
                                const target = e.currentTarget;
                                const next = continueBulletOnEnter(target.value, target.selectionStart ?? 0);
                                if (!next) return;
                                e.preventDefault();
                                updateBlock(block.id, { text: next.text });
                                requestAnimationFrame(() => {
                                  target.setSelectionRange(next.cursor, next.cursor);
                                });
                              }}
                              data-block-id={block.id}
                              data-field="text"
                              rows={4}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                        )}

                        {block.type === 'llmHeading' && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-sky-700">
                              Filled automatically for Auto weekly; prompt and fallback text are editable.
                            </p>
                            <label className="block text-xs font-medium text-gray-700">
                              Prompt (optional)
                              <textarea
                                value={'prompt' in block ? (block.prompt ?? '') : ''}
                                onChange={(e) => updateBlock(block.id, { prompt: e.target.value || undefined } as Partial<EmailBlock>)}
                                rows={2}
                                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                placeholder="e.g. One short heading based on {{productContext}}"
                              />
                            </label>
                            <input
                              type="text"
                              value={block.text}
                              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                              onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })}
                              data-block-id={block.id}
                              data-field="text"
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Fallback heading text"
                            />
                            <div className="flex gap-2">
                              <select value={block.level || 2} onChange={(e) => updateBlock(block.id, { level: Number(e.target.value) as 1 | 2 | 3 })} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
                              </select>
                              <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {block.type === 'llmIntro' && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-sky-700">
                              Filled automatically for Auto weekly; prompt and fallback text are editable.
                            </p>
                            <label className="block text-xs font-medium text-gray-700">
                              Prompt (optional)
                              <textarea
                                value={'prompt' in block ? (block.prompt ?? '') : ''}
                                onChange={(e) => updateBlock(block.id, { prompt: e.target.value || undefined } as Partial<EmailBlock>)}
                                rows={3}
                                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                placeholder="Leave empty to use global intro prompt"
                              />
                            </label>
                            <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                            </select>
                            <textarea
                              value={block.text}
                              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                              onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })}
                              data-block-id={block.id}
                              data-field="text"
                              rows={4}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Fallback intro text for preview"
                            />
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
                                  updateCuratedProducts(block.id, [...block.products, { id: generateId(), handle, title: p.title || '', imageUrl: p.imageUrl || '', url: p.url || '', price: p.price || '', compareAtPrice: p.compareAtPrice || '', savePercent: p.savePercent || '', freeShippingBadge: p.freeShippingBadge === true }]);
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

                        {block.type === 'image' && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                placeholder="Image URL"
                                value={block.url}
                                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                              />
                              <label className="rounded border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-action hover:text-action cursor-pointer">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file || block.type !== 'image') return;
                                    try {
                                      const form = new FormData();
                                      form.set('file', file);
                                      const res = await fetch('/api/admin/email/templates/upload-image', { method: 'POST', body: form });
                                      const data = await res.json();
                                      if (!res.ok) throw new Error(data?.error || 'Upload failed');
                                      if (data?.url) updateBlock(block.id, { url: data.url });
                                    } catch (err) {
                                      setStatusMessage(err instanceof Error ? err.message : 'Upload failed');
                                      setTimeout(() => setStatusMessage(''), 3000);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder="Alt text"
                              value={block.alt ?? ''}
                              onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Link URL (optional)"
                              value={block.linkUrl ?? ''}
                              onChange={(e) => updateBlock(block.id, { linkUrl: e.target.value || undefined })}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm">
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs text-gray-600">
                                Max width
                                <input
                                  type="number"
                                  min={100}
                                  max={600}
                                  value={block.maxWidth ?? 220}
                                  onChange={(e) => updateBlock(block.id, { maxWidth: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                                />
                                px
                              </label>
                            </div>
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
                    {(['heading', 'text', 'llmIntro', 'llmHeading', 'cta', 'productCards', 'curatedProducts', 'image', 'divider', 'footer'] as const).map((type) => (
                      <button key={type} type="button" onClick={() => addBlock(type)} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-action hover:text-action">
                        + {blockTypeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Right: live preview + test send ── */}
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
                    <div className="overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-2" style={{ maxHeight: '60vh' }}>
                      <iframe srcDoc={previewHtml} title="Email preview" className="w-full border-0" style={{ minHeight: '600px' }} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                      Loading preview…
                    </div>
                  )}

                  {/* Send test email */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-semibold text-gray-700">Send test email</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        disabled={isSendingTest}
                        onClick={sendTestEmail}
                        className="rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action disabled:opacity-60"
                      >
                        {isSendingTest ? 'Sending…' : 'Send test'}
                      </button>
                    </div>
                    {testEmailStatus ? (
                      <p className={`mt-1.5 text-xs ${testEmailStatus.startsWith('Test email sent') ? 'text-emerald-600' : 'text-red-600'}`}>
                        {testEmailStatus}
                      </p>
                    ) : null}
                  </div>
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
              <li>Tracking: SES configuration set + SNS webhook to `/api/webhooks/aws/ses-sns`.</li>
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
      <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-gray-700">Pre-approval test inbox</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            className="w-72 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500">Use "Send test" on pending campaigns below.</span>
        </div>
        {testEmailStatus ? (
          <p className={`mt-1.5 text-xs ${testEmailStatus.toLowerCase().includes('sent') ? 'text-emerald-600' : 'text-red-600'}`}>
            {testEmailStatus}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {campaign.status !== 'draft' && campaign.status !== 'scheduled' ? (
              <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                {campaignStatsLoading[campaign.id] ? (
                  <p className="text-xs text-gray-500">Loading engagement stats...</p>
                ) : campaignStatsById[campaign.id] ? (
                  <p className="text-xs text-gray-600">
                    Sent: <span className="font-semibold">{campaignStatsById[campaign.id].sentCount}</span> | Delivered:{' '}
                    <span className="font-semibold">{campaignStatsById[campaign.id].deliveredCount}</span> | Opens:{' '}
                    <span className="font-semibold">{campaignStatsById[campaign.id].uniqueOpenedCount}</span> (
                    {campaignStatsById[campaign.id].openRate}%) | Clicks:{' '}
                    <span className="font-semibold">{campaignStatsById[campaign.id].uniqueClickedCount}</span> (
                    {campaignStatsById[campaign.id].clickRate}%)
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">No engagement data yet.</p>
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
                  {campaign.createdBy === 'auto-resend' ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900">Auto resend</span>
                  ) : null}
                  {campaign.createdBy === 'auto-weekly' || campaign.createdBy === 'auto-campaign' ? (
                    <>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                        Auto campaign
                      </span>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-600">
                          {autoWeeklyEnabled === null ? '…' : autoWeeklyEnabled ? 'Flow on' : 'Flow off'}
                        </span>
                        <input
                          type="checkbox"
                          checked={autoWeeklyEnabled === true}
                          disabled={autoWeeklyEnabled === null || autoWeeklyUpdating}
                          onChange={async () => {
                            if (autoWeeklyEnabled === null || autoWeeklyUpdating) return;
                            setAutoWeeklyUpdating(true);
                            setError('');
                            try {
                              const res = await fetch('/api/admin/email/auto-campaigns/settings', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ enabled: !autoWeeklyEnabled }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to update');
                              setAutoWeeklyEnabled(data.enabled === true);
                              setStatusMessage(data.enabled ? 'Auto campaigns flow enabled.' : 'Auto campaigns flow disabled.');
                            } catch (e) {
                              setError(e instanceof Error ? e.message : 'Failed to update');
                            } finally {
                              setAutoWeeklyUpdating(false);
                            }
                          }}
                          className="h-4 w-8 rounded-full border border-gray-300 bg-gray-200 accent-action transition-colors disabled:opacity-50"
                        />
                      </label>
                    </>
                  ) : null}
                  {campaign.status === 'pending_approval' ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      For approval
                    </span>
                  ) : null}
                  {campaign.metadata?.paused === true ? (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-800">
                      Paused
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500">
                  Status: {campaign.status} | Lists: {(campaign.audience.listIds || []).length} | Segments:{' '}
                  {(campaign.audience.segmentIds || []).length}
                </p>
                {campaign.video ? (
                  <p className="mt-1 text-xs text-gray-600">
                    Video: {campaign.video.status}
                    {campaign.video.videoUrl ? (
                      <>
                        {' '}
                        |{' '}
                        <a href={campaign.video.videoUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                          Preview
                        </a>
                      </>
                    ) : null}
                    {campaign.video.subjectLine ? ` | Subject: ${campaign.video.subjectLine}` : ''}
                    {campaign.video.musicModel ? ` | Music: ${campaign.video.musicModel}` : ''}
                    {campaign.video.videoTemplate ? ` | Template: ${campaign.video.videoTemplate}` : ''}
                    {campaign.video.variantUrls ? (
                      <>
                        {' '}
                        | Variants:{' '}
                        {Object.entries(campaign.video.variantUrls).map(([key, url], index) => (
                          <span key={key}>
                            {index > 0 ? ', ' : ''}
                            <a href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                              {key.replaceAll('_', ' ')}
                            </a>
                          </span>
                        ))}
                      </>
                    ) : null}
                    {campaign.video.errorMessage ? ` | Error: ${campaign.video.errorMessage}` : ''}
                  </p>
                ) : null}
                {renderVideoActionSection(campaign)}
                <SocialPostsPanel campaignId={campaign.id} videoStatus={campaign.video?.status ?? null} />
              </div>
              <details className="w-full rounded-lg border border-gray-200 bg-gray-50/60 p-2">
                <summary className="cursor-pointer text-xs font-semibold text-gray-900">Email Actions</summary>
                {campaign.status === 'pending_approval' &&
                  (campaign.createdBy === 'auto-weekly' || campaign.createdBy === 'auto-campaign') &&
                  campaign.productUsage &&
                  Object.values(campaign.productUsage).some((items) => items.length > 0) ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900">
                    <p className="font-medium text-amber-800">Product reuse in other auto campaigns:</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                      {Object.entries(campaign.productUsage).map(([handle, items]) =>
                        items.length > 0 ? (
                          <li key={handle}>
                            <strong>{handle}</strong> was used in:{' '}
                            {items
                              .map(
                                (u) =>
                                  `${u.campaignName} (${u.scheduledAt ? new Date(u.scheduledAt).toLocaleDateString('en-AU', { dateStyle: 'short' }) : '—'})`
                              )
                              .join('; ')}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-2">
                  <CampaignScheduleControls
                    campaignId={campaign.id}
                    status={campaign.status}
                    scheduledAt={campaign.scheduledAt}
                    paused={campaign.metadata?.paused === true}
                    onUpdated={loadAll}
                    onError={setError}
                    onSuccess={setStatusMessage}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                {(() => {
                  const normalizedStatus = String(campaign.status || '').toLowerCase();
                  const isCancelledStatus = normalizedStatus === 'cancelled';
                  const isCompletedStatus =
                    normalizedStatus === 'completed' ||
                    normalizedStatus === 'complete' ||
                    (normalizedStatus === 'processing' && campaign.completedAt != null);
                  if (isCompletedStatus) {
                    return (
                  <>
                    <button
                      type="button"
                      disabled
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 cursor-default"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={isDuplicatingCampaign}
                      className="rounded-full border border-action px-3 py-1.5 text-xs font-semibold text-action hover:bg-action hover:text-white disabled:opacity-60"
                      onClick={() => duplicateCampaign(campaign)}
                    >
                      {isDuplicatingCampaign ? 'Duplicating…' : 'Duplicate'}
                    </button>
                    <button
                      type="button"
                      disabled={resendingCampaignId === campaign.id}
                      className="rounded-full border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:border-violet-500 disabled:opacity-60"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Resend this campaign only to contacts who did not receive it (skipped/failed/cancelled)? Already-sent recipients will not be emailed again.`
                        );
                        if (!confirmed) return;
                        setResendingCampaignId(campaign.id);
                        setError('');
                        setStatusMessage('');
                        try {
                          const response = await fetch(
                            `/api/admin/email/campaigns/${campaign.id}/resend-unsent`,
                            { method: 'POST' }
                          );
                          const data = await response.json();
                          if (!response.ok) {
                            setError(data?.error || 'Failed to resend unsent recipients');
                            return;
                          }
                          setStatusMessage(
                            `Resent unsent: re-queued ${data.requeuedRecipients ?? 0}, sent ${data.sent ?? 0}, failed ${data.failed ?? 0}, skipped ${data.skipped ?? 0}.`
                          );
                          await loadAll();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to resend unsent recipients');
                        } finally {
                          setResendingCampaignId(null);
                        }
                      }}
                    >
                      {resendingCampaignId === campaign.id ? 'Resending…' : 'Resend unsent'}
                    </button>
                    <button
                      type="button"
                      disabled={resendingNonOpenersId === campaign.id}
                      className="rounded-full border border-fuchsia-300 px-3 py-1.5 text-xs font-semibold text-fuchsia-800 hover:border-fuchsia-500 disabled:opacity-60"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Resend this campaign only to recipients who did NOT open the original email? A new "Resend (non-openers)" campaign will be created with a fresh subject line and sent in the background.`
                        );
                        if (!confirmed) return;
                        setResendingNonOpenersId(campaign.id);
                        setError('');
                        setStatusMessage('');
                        try {
                          const response = await fetch(
                            `/api/admin/email/campaigns/${campaign.id}/resend-non-openers`,
                            { method: 'POST' }
                          );
                          const raw = await response.text();
                          let data: {
                            error?: string;
                            recipientCount?: number;
                            sent?: number;
                            failed?: number;
                            skipped?: number;
                            deferred?: boolean;
                          } = {};
                          try {
                            data = raw ? (JSON.parse(raw) as typeof data) : {};
                          } catch {
                            throw new Error(
                              raw.trim().slice(0, 200) || `Server error (HTTP ${response.status})`
                            );
                          }
                          if (!response.ok) {
                            setError(data?.error || 'Failed to resend to non-openers');
                            return;
                          }
                          if (data.deferred) {
                            setStatusMessage(
                              `Resend to non-openers started: ${data.recipientCount ?? 0} recipients queued. Sending continues in the background — refresh in a few minutes to see progress.`
                            );
                          } else {
                            setStatusMessage(
                              `Resent to non-openers: ${data.recipientCount ?? 0} queued, sent ${data.sent ?? 0}, failed ${data.failed ?? 0}, skipped ${data.skipped ?? 0}.`
                            );
                          }
                          await loadAll();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to resend to non-openers');
                        } finally {
                          setResendingNonOpenersId(null);
                        }
                      }}
                    >
                      {resendingNonOpenersId === campaign.id ? 'Resending…' : 'Resend non-openers'}
                    </button>
                  </>
                    );
                  }
                  if (isCancelledStatus) {
                    return (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 cursor-default"
                      disabled
                    >
                      Cancelled
                    </button>
                    <button
                      type="button"
                      disabled={isDuplicatingCampaign}
                      className="rounded-full border border-action px-3 py-1.5 text-xs font-semibold text-action hover:bg-action hover:text-white disabled:opacity-60"
                      onClick={() => duplicateCampaign(campaign)}
                    >
                      {isDuplicatingCampaign ? 'Duplicating…' : 'Duplicate'}
                    </button>
                  </>
                    );
                  }
                  if (campaign.status === 'pending_approval') {
                    return (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-500 disabled:opacity-60"
                      disabled={sendingCampaignTestId === campaign.id}
                      onClick={() => void sendCampaignTestEmail(campaign.id)}
                    >
                      {sendingCampaignTestId === campaign.id ? 'Sending test…' : 'Send test'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:border-green-500"
                      onClick={async () => {
                        const response = await fetch(`/api/admin/email/campaigns/${campaign.id}/approve`, {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setError(data?.error || 'Failed to approve campaign');
                          return;
                        }
                        setStatusMessage(data?.message || 'Campaign approved.');
                        await loadAll();
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-500"
                      onClick={async () => {
                        if (!window.confirm(`Reject campaign "${campaign.name}"? It will not be sent.`)) return;
                        const response = await fetch(`/api/admin/email/campaigns/${campaign.id}/cancel`, {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setError(data?.error || 'Failed to reject campaign');
                          return;
                        }
                        setStatusMessage('Campaign rejected.');
                        await loadAll();
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-400"
                      onClick={() => applyCampaignToEditor(campaign)}
                    >
                      Edit
                    </button>
                  </>
                    );
                  }
                  if (campaign.status === 'scheduled') {
                    return (
                  <>
                    <button
                      type="button"
                      disabled
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 cursor-default"
                      title={campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : ''}
                    >
                      Scheduled for {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '…'}
                    </button>
                  </>
                    );
                  }
                  return (
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                    onClick={async () => {
                      setError('');
                      setStatusMessage(`Campaign "${campaign.name}" send started.`);
                      const sendRequest = fetch(`/api/admin/email/campaigns/${campaign.id}/send`, {
                        method: 'POST',
                      });
                      await new Promise((resolve) => setTimeout(resolve, 750));
                      await loadAll();
                      const response = await sendRequest;
                      const data = await response.json();
                      if (!response.ok) {
                        setError(data?.error || 'Failed to send campaign');
                        return;
                      }
                      setStatusMessage(
                        `Campaign sent. Sent: ${data.sent || 0}, Failed: ${data.failed || 0}, Skipped: ${data.skipped || 0}.`
                      );
                      await loadAll();
                    }}
                  >
                    Send queued
                  </button>
                  );
                })()}
                {(campaign.status === 'processing' || campaign.status === 'scheduled' || campaign.status === 'draft') && campaignStatsById[campaign.id]?.remainingQueued && campaignStatsById[campaign.id]?.remainingQueued > 0 ? (
                  <button
                    type="button"
                    disabled={cancellingCampaignId === campaign.id}
                    className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-500 disabled:opacity-60"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Cancel sending campaign "${campaign.name}"? ${campaignStatsById[campaign.id]?.remainingQueued || 0} queued recipients will be cancelled and will NOT receive this email.`
                      );
                      if (!confirmed) return;
                      setCancellingCampaignId(campaign.id);
                      setError('');
                      setStatusMessage('');
                      try {
                        const response = await fetch(`/api/admin/email/campaigns/${campaign.id}/cancel`, {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setError(data?.error || 'Failed to cancel campaign');
                          return;
                        }
                        setStatusMessage(
                          `Campaign "${campaign.name}" cancelled. ${data.cancelledQueuedRecipients || 0} queued recipients were cancelled.`
                        );
                        await loadAll();
                      } finally {
                        setCancellingCampaignId(null);
                      }
                    }}
                  >
                    {cancellingCampaignId === campaign.id ? 'Cancelling…' : `Cancel all (${campaignStatsById[campaign.id]?.remainingQueued || 0})`}
                  </button>
                ) : null}
                {campaign.status === 'processing' && campaignStatsById[campaign.id]?.remainingQueued === 0 ? (
                  <button
                    type="button"
                    className="rounded-full border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 hover:border-green-500"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Mark campaign "${campaign.name}" as completed? All recipients have been sent to.`
                      );
                      if (!confirmed) return;
                      try {
                        const response = await fetch(`/api/admin/email/campaigns/${campaign.id}/complete`, {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          setError(data?.error || 'Failed to complete campaign');
                          return;
                        }
                        setStatusMessage(`Campaign "${campaign.name}" marked as completed.`);
                        await loadAll();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to complete campaign');
                      }
                    }}
                  >
                    Mark completed
                  </button>
                ) : null}
                {campaign.status === 'draft' || campaign.status === 'cancelled' ? (
                  <button
                    type="button"
                    className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-400"
                    onClick={() => applyCampaignToEditor(campaign)}
                  >
                    {campaign.status === 'cancelled'
                      ? 'Edit to resend'
                      : duplicatedCampaignId === campaign.id
                        ? 'Edit duplicate'
                        : 'Edit'}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={deletingCampaignId === campaign.id}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400 disabled:opacity-60"
                  onClick={async () => {
                    const recipientCount = campaignStatsById[campaign.id]?.remainingQueued || 0;
                    const message = recipientCount > 0
                      ? `Delete campaign "${campaign.name}"? This will cancel ${recipientCount} queued recipients and permanently remove this campaign.`
                      : `Delete campaign "${campaign.name}"? This will permanently remove this campaign.`;
                    const confirmed = window.confirm(message);
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
                  {deletingCampaignId === campaign.id ? 'Deleting…' : 'Delete'}
                </button>
                </div>
              </details>
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
