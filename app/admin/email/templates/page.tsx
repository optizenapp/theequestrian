'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type {
  CuratedProductCard,
  EmailBlock,
  TemplateCategory,
} from '@/lib/email-platform/types';

type TemplateRow = {
  id: string;
  name: string;
  templateType: string;
  activeVersionId: string | null;
  category: TemplateCategory;
  updatedAt: string;
};

type TemplateVisualSettings = {
  category: TemplateCategory;
  deliveryMode: 'post_fulfillment' | 'manual_or_campaign';
  enabled: boolean;
  delayDays: number;
  baseFontSize: number;
  subjectTemplate: string;
  blocks: EmailBlock[];
  fromName: string;
  fromEmail: string;
  brandPrimary: string;
  brandDark: string;
  headerBackground: string;
  linkColor: string;
  logoUrl: string | null;
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

function getDefaultBlocks(category: TemplateCategory): EmailBlock[] {
  if (category === 'subscriber_standard') {
    return [
      { id: generateId(), type: 'heading', level: 2, align: 'center', text: 'Latest updates from The Equestrian' },
      { id: generateId(), type: 'text', align: 'left', text: 'Hi {{customerName}},' },
      {
        id: generateId(),
        type: 'text',
        align: 'left',
        text:
          'Here are this week\'s featured picks for you. Explore the latest products and offers from our store.',
      },
      {
        id: generateId(),
        type: 'curatedProducts',
        showDividers: false,
        products: [{ id: generateId(), handle: '', title: '', imageUrl: '', url: '' }],
      },
      { id: generateId(), type: 'cta', label: 'Shop now', url: '{{siteUrl}}' },
      { id: generateId(), type: 'footer', text: 'The Equestrian\nAustralian Owned | Global Brands\n{{siteUrl}}' },
    ];
  }
  return [
    { id: generateId(), type: 'heading', level: 2, align: 'center', text: 'Thanks for recent order of the {{productTitle}}.' },
    { id: generateId(), type: 'text', align: 'left', text: 'Hi {{customerName}},' },
    {
      id: generateId(),
      type: 'text',
      align: 'left',
      text:
        "We are just touching base to see how you're getting along. Feel free to leave a review of the product. It helps us understand what our customers and product quality.\n\nYour product is below. Please click the review button and you can leave a review directly on the product page.",
    },
    { id: generateId(), type: 'productCards', mode: 'all' },
    { id: generateId(), type: 'divider' },
    { id: generateId(), type: 'text', align: 'center', text: 'Order #{{orderNumber}}' },
    { id: generateId(), type: 'footer', text: 'The Equestrian\nAustralian Owned | Global Brands\n{{siteUrl}}' },
  ];
}

function getDefaultSettings(category: TemplateCategory): TemplateVisualSettings {
  return {
    category,
    deliveryMode: category === 'subscriber_standard' ? 'manual_or_campaign' : 'post_fulfillment',
    enabled: true,
    delayDays: category === 'subscriber_standard' ? 0 : 10,
    baseFontSize: 16,
    subjectTemplate:
      category === 'subscriber_standard'
        ? 'Latest from The Equestrian'
        : '[RE] How is your recent purchase going? - {{productTitle}}?',
    blocks: getDefaultBlocks(category),
    fromName: 'The Equestrian',
    fromEmail: 'noreply@theequestrian.com.au',
    brandPrimary: '#000000',
    brandDark: '#000000',
    headerBackground: '#ffffff',
    linkColor: '#de8e94',
    logoUrl: 'https://www.theequestrian.com.au/email-logo.png',
  };
}

function defaultTemplateName(category: TemplateCategory): string {
  return category === 'subscriber_standard' ? 'Subscriber Standard' : 'Email Order Reviews';
}

function categoryLabel(category: TemplateCategory): string {
  return category === 'subscriber_standard' ? 'Subscriber Standard' : 'Order Review';
}

function buildMetadataFromSettings(settings: TemplateVisualSettings) {
  return {
    category: settings.category,
    deliveryMode: settings.category === 'subscriber_standard' ? 'manual_or_campaign' : 'post_fulfillment',
    enabled: settings.enabled,
    ...(settings.category === 'order_review' ? { delayDays: settings.delayDays } : {}),
    baseFontSize: settings.baseFontSize,
    brandPrimary: settings.brandPrimary,
    brandDark: settings.brandDark,
    headerBackground: settings.headerBackground,
    linkColor: settings.linkColor,
    logoUrl: settings.logoUrl,
  };
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState(defaultTemplateName('order_review'));
  const [settings, setSettings] = useState<TemplateVisualSettings>(getDefaultSettings('order_review'));
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [lastFocusedInput, setLastFocusedInput] = useState<{ blockId: string; field: 'text' | 'label' | 'url' } | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [newCuratedHandles, setNewCuratedHandles] = useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewHandle, setPreviewHandle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewProduct, setPreviewProduct] = useState<{
    title: string;
    imageUrl: string | null;
    url: string;
    price?: string;
    compareAtPrice?: string;
    savePercent?: string;
    freeShippingBadge?: boolean;
  } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoaded, setPreviewLoaded] = useState(false);

  async function loadTemplates() {
    const response = await fetch('/api/admin/email/templates');
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to load templates');
    setTemplates(Array.isArray(data.templates) ? data.templates : []);
  }

  useEffect(() => {
    loadTemplates().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load templates'));
  }, []);

  const updateSetting = <K extends keyof TemplateVisualSettings>(key: K, value: TemplateVisualSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const fetchPreviewHtml = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/email/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: previewHandle || null,
          subjectTemplate: settings.subjectTemplate,
          blocks: settings.blocks,
          metadata: buildMetadataFromSettings(settings),
        }),
      });
      const data = await response.json();
      if (response.ok && data.html) setPreviewHtml(data.html);
    } catch (err) {
      console.error('Failed to fetch preview HTML:', err);
    } finally {
      setPreviewLoaded(true);
    }
  }, [previewHandle, settings]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPreviewHtml();
    }, 500);
    return () => clearTimeout(t);
  }, [fetchPreviewHtml]);

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    updateSetting(
      'blocks',
      settings.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)) as EmailBlock[]
    );
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const idx = settings.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= settings.blocks.length) return;
    const updated = [...settings.blocks];
    const [block] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, block);
    updateSetting('blocks', updated);
  };

  const removeBlock = (id: string) => {
    updateSetting('blocks', settings.blocks.filter((b) => b.id !== id));
  };

  const addBlock = (type: EmailBlock['type']) => {
    const id = generateId();
    if (type === 'heading') updateSetting('blocks', [...settings.blocks, { id, type, level: 2, text: 'Your heading here' }]);
    if (type === 'text') updateSetting('blocks', [...settings.blocks, { id, type, text: 'Your text here' }]);
    if (type === 'cta') updateSetting('blocks', [...settings.blocks, { id, type, label: 'Write review', url: '{{productUrl}}', align: 'center' }]);
    if (type === 'productCards') updateSetting('blocks', [...settings.blocks, { id, type, mode: 'single', align: 'center' }]);
    if (type === 'curatedProducts') {
      updateSetting('blocks', [
        ...settings.blocks,
        {
          id,
          type,
          showDividers: false,
          align: 'center',
          products: [{ id: generateId(), handle: '', title: '', imageUrl: '', url: '' }],
        },
      ]);
    }
    if (type === 'divider') updateSetting('blocks', [...settings.blocks, { id, type, align: 'center' }]);
    if (type === 'footer') updateSetting('blocks', [...settings.blocks, { id, type, text: 'Footer text here', align: 'center' }]);
  };

  const resetToDefaults = () => {
    updateSetting('blocks', getDefaultBlocks(settings.category));
    setStatusMessage('Blocks reset to defaults.');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const updateCuratedProducts = (blockId: string, products: CuratedProductCard[]) => {
    const block = settings.blocks.find((item) => item.id === blockId);
    if (!block || block.type !== 'curatedProducts') return;
    updateBlock(blockId, { products } as Partial<EmailBlock>);
  };

  const fetchCuratedProduct = async (blockId: string, productId: string) => {
    const block = settings.blocks.find((item) => item.id === blockId);
    if (!block || block.type !== 'curatedProducts') return;
    const product = block.products.find((item) => item.id === productId);
    if (!product || !product.handle.trim()) {
      setStatusMessage('Enter a handle before fetching product.');
      setTimeout(() => setStatusMessage(''), 2500);
      return;
    }
    try {
      const response = await fetch('/api/admin/email/templates/preview-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: product.handle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to fetch product');
      const updated = block.products.map((item) =>
        item.id === productId
          ? {
              ...item,
              title: payload.product?.title || item.title,
              imageUrl: payload.product?.imageUrl || item.imageUrl || '',
              url: payload.product?.url || item.url,
              price: payload.product?.price || item.price || '',
              compareAtPrice: payload.product?.compareAtPrice || item.compareAtPrice || '',
              savePercent: payload.product?.savePercent || item.savePercent || '',
              freeShippingBadge: payload.product?.freeShippingBadge !== false,
            }
          : item
      );
      updateCuratedProducts(blockId, updated);
      setStatusMessage('Product hydrated from handle.');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to load product');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const addCuratedProductByHandle = async (blockId: string) => {
    const handle = (newCuratedHandles[blockId] || '').trim();
    if (!handle) {
      setStatusMessage('Enter a product handle to add a product card.');
      setTimeout(() => setStatusMessage(''), 2500);
      return;
    }
    const block = settings.blocks.find((item) => item.id === blockId);
    if (!block || block.type !== 'curatedProducts') return;
    try {
      const response = await fetch('/api/admin/email/templates/preview-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load product');
      const nextProduct = {
        id: generateId(),
        handle,
        title: payload.product?.title || '',
        imageUrl: payload.product?.imageUrl || '',
        url: payload.product?.url || '',
        price: payload.product?.price || '',
        compareAtPrice: payload.product?.compareAtPrice || '',
        savePercent: payload.product?.savePercent || '',
        freeShippingBadge: payload.product?.freeShippingBadge !== false,
      };
      updateCuratedProducts(blockId, [...block.products, nextProduct]);
      setNewCuratedHandles((prev) => ({ ...prev, [blockId]: '' }));
      setStatusMessage('Product card added with all fields populated.');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to add product card');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const loadPreviewProduct = async () => {
    if (!previewHandle) {
      setPreviewError('Enter a product handle.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const response = await fetch('/api/admin/email/templates/preview-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: previewHandle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load product');
      setPreviewProduct(payload.product);
      fetchPreviewHtml();
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load product');
      setPreviewProduct(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateSetting('logoUrl', result || null);
      setStatusMessage('Warning: upload logo to public URL for sent emails.');
      setTimeout(() => setStatusMessage(''), 5000);
    };
    reader.readAsDataURL(file);
  };

  const loadTemplateIntoEditor = async (templateId: string) => {
    setLoadingTemplateId(templateId);
    setError('');
    try {
      const response = await fetch(`/api/admin/email/templates/${templateId}`);
      const data = await response.json();
      if (!response.ok || !data?.template) {
        throw new Error(data?.error || 'Failed to load template');
      }
      const template = data.template;
      const metadata = (template.version?.metadata || {}) as Record<string, unknown>;
      const category = metadata.category === 'subscriber_standard' ? 'subscriber_standard' : 'order_review';
      setIsEditorOpen(true);
      setEditorMode('edit');
      setSelectedTemplateId(template.id);
      setName(template.name || '');
      setSettings({
        category,
        deliveryMode:
          metadata.deliveryMode === 'manual_or_campaign'
            ? 'manual_or_campaign'
            : category === 'subscriber_standard'
              ? 'manual_or_campaign'
              : 'post_fulfillment',
        enabled: metadata.enabled !== false,
        delayDays: typeof metadata.delayDays === 'number' ? metadata.delayDays : category === 'order_review' ? 10 : 0,
        baseFontSize: typeof metadata.baseFontSize === 'number' ? metadata.baseFontSize : 16,
        subjectTemplate: template.version?.subjectTemplate || '',
        blocks: Array.isArray(template.version?.blocks) ? template.version.blocks : getDefaultBlocks(category),
        fromName: template.version?.fromName || 'The Equestrian',
        fromEmail: template.version?.fromEmail || 'support@theequestrian.com.au',
        brandPrimary:
          typeof metadata.brandPrimary === 'string' && metadata.brandPrimary.trim()
            ? metadata.brandPrimary
            : '#000000',
        brandDark:
          typeof metadata.brandDark === 'string' && metadata.brandDark.trim() ? metadata.brandDark : '#000000',
        headerBackground:
          typeof metadata.headerBackground === 'string' && metadata.headerBackground.trim()
            ? metadata.headerBackground
            : '#ffffff',
        linkColor:
          typeof metadata.linkColor === 'string' && metadata.linkColor.trim() ? metadata.linkColor : '#de8e94',
        logoUrl: typeof metadata.logoUrl === 'string' ? metadata.logoUrl : null,
      });
      setStatusMessage(`Editing template: ${template.name}`);
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoadingTemplateId(null);
    }
  };

  const startNewTemplate = (category: TemplateCategory) => {
    setIsEditorOpen(true);
    setEditorMode('create');
    setSelectedTemplateId(null);
    setName(defaultTemplateName(category));
    setSettings(getDefaultSettings(category));
    setStatusMessage('New template ready.');
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedTemplateId(null);
    setEditorMode('create');
    setError('');
  };

  const saveTemplateFromBuilder = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    setIsSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const endpoint =
        editorMode === 'edit' && selectedTemplateId
          ? `/api/admin/email/templates/${selectedTemplateId}`
          : '/api/admin/email/templates';
      const method = editorMode === 'edit' && selectedTemplateId ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          subjectTemplate: settings.subjectTemplate,
          blocks: settings.blocks,
          fromName: settings.fromName,
          fromEmail: settings.fromEmail,
          templateType: 'campaign',
          metadata: buildMetadataFromSettings(settings),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || 'Failed to create template');
        return;
      }
      setStatusMessage(editorMode === 'edit' ? 'Template updated.' : 'Template created.');
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setStatusMessage('Enter a test email address.');
      return;
    }
    setIsSendingTest(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/admin/email/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          handle: previewHandle || null,
          subjectTemplate: settings.subjectTemplate,
          blocks: settings.blocks,
          fromName: settings.fromName,
          fromEmail: settings.fromEmail,
          metadata: buildMetadataFromSettings(settings),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Test email failed');
      setStatusMessage('Test email sent.');
    } catch (err) {
      console.error('Failed to send test email:', err);
      setStatusMessage('Failed to send test email.');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <AdminLayout title="Email Templates" subtitle="Same builder and settings as review emails">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {!isEditorOpen ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <p className="mt-1 text-sm text-gray-500">Select a template card to view or edit it.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => startNewTemplate('order_review')}
                className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-action hover:bg-action/5"
              >
                <p className="text-sm font-semibold text-gray-900">+ New Order Review</p>
                <p className="mt-1 text-xs text-gray-500">Post-fulfillment template with delay settings.</p>
              </button>
              <button
                type="button"
                onClick={() => startNewTemplate('subscriber_standard')}
                className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left transition hover:border-action hover:bg-action/5"
              >
                <p className="text-sm font-semibold text-gray-900">+ New Subscriber Template</p>
                <p className="mt-1 text-xs text-gray-500">Standard campaign email without delay.</p>
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplateIntoEditor(template.id)}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300"
                >
                  <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {categoryLabel(template.category)} · {template.templateType}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {template.activeVersionId ? `Active: ${template.activeVersionId.slice(0, 8)}...` : 'No active version'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Updated {new Date(template.updatedAt).toLocaleString()}</p>
                  {loadingTemplateId === template.id ? (
                    <p className="mt-2 text-xs text-action">Opening...</p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">{editorMode === 'edit' ? 'Edit Template' : 'Create Template'}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                >
                  ← Back to templates
                </button>
                <button
                  type="button"
                  onClick={() => startNewTemplate('order_review')}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                >
                  + New Order Review
                </button>
                <button
                  type="button"
                  onClick={() => startNewTemplate('subscriber_standard')}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                >
                  + New Subscriber
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <select
                value={settings.category}
                onChange={(e) => {
                  const category = e.target.value as TemplateCategory;
                  updateSetting('category', category);
                  updateSetting('deliveryMode', category === 'subscriber_standard' ? 'manual_or_campaign' : 'post_fulfillment');
                  if (category === 'subscriber_standard') {
                    updateSetting('delayDays', 0);
                  }
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="order_review">Order Review</option>
                <option value="subscriber_standard">Subscriber Standard</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delivery Settings</h2>
                <p className="text-sm text-gray-500">
                  {settings.category === 'order_review'
                    ? 'Control delay and enable or disable sending.'
                    : 'Subscriber templates do not use fulfilment delay.'}
                </p>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <span>Enabled</span>
                <input type="checkbox" checked={settings.enabled} onChange={(e) => updateSetting('enabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-action focus:ring-action" />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {settings.category === 'order_review' ? (
                <label className="block text-sm font-medium text-gray-700">
                  Delay (days after fulfillment)
                  <input type="number" min={0} max={365} value={settings.delayDays} onChange={(e) => updateSetting('delayDays', Number(e.target.value || 0))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
              ) : null}
              <label className="block text-sm font-medium text-gray-700">
                Subject line
                <input type="text" value={settings.subjectTemplate} onChange={(e) => updateSetting('subjectTemplate', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                From name
                <input type="text" value={settings.fromName} onChange={(e) => updateSetting('fromName', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                From email
                <input type="email" value={settings.fromEmail} onChange={(e) => updateSetting('fromEmail', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            <p className="text-sm text-gray-500">Upload a logo and set brand colors.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Base font size (email)
                <input
                  type="number"
                  min={12}
                  max={24}
                  value={settings.baseFontSize}
                  onChange={(e) => updateSetting('baseFontSize', Number(e.target.value || 16))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Brand primary (buttons)
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={settings.brandPrimary} onChange={(e) => updateSetting('brandPrimary', e.target.value)} className="h-10 w-12 rounded border border-gray-300" />
                  <input type="text" value={settings.brandPrimary} onChange={(e) => updateSetting('brandPrimary', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Brand dark (text)
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={settings.brandDark} onChange={(e) => updateSetting('brandDark', e.target.value)} className="h-10 w-12 rounded border border-gray-300" />
                  <input type="text" value={settings.brandDark} onChange={(e) => updateSetting('brandDark', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Header background
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={settings.headerBackground} onChange={(e) => updateSetting('headerBackground', e.target.value)} className="h-10 w-12 rounded border border-gray-300" />
                  <input type="text" value={settings.headerBackground} onChange={(e) => updateSetting('headerBackground', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Link color
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={settings.linkColor} onChange={(e) => updateSetting('linkColor', e.target.value)} className="h-10 w-12 rounded border border-gray-300" />
                  <input type="text" value={settings.linkColor} onChange={(e) => updateSetting('linkColor', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </label>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Logo URL (must be publicly accessible)
                  <input type="text" value={settings.logoUrl || ''} onChange={(e) => updateSetting('logoUrl', e.target.value || null)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
                <p className="mt-1 text-xs text-gray-500">Or upload a file (for preview only - won&apos;t work in sent emails):</p>
                <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0])} className="mt-1 block w-full text-sm text-gray-600" />
                {settings.logoUrl && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium text-gray-500">Logo preview</p>
                    <img src={settings.logoUrl} alt="Logo preview" className="max-h-16" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Email Content Blocks</h2>
                <p className="text-sm text-gray-500">Reorder, edit, or add blocks. Click tokens below to copy.</p>
              </div>
              <button type="button" onClick={resetToDefaults} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-action hover:text-action">Reset to defaults</button>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[
                { label: 'Customer name', token: '{{customerName}}' },
                { label: 'Order number', token: '{{orderNumber}}' },
                { label: 'Product title', token: '{{productTitle}}' },
                { label: 'Product URL', token: '{{productUrl}}' },
                { label: 'Product price', token: '{{productPrice}}' },
                { label: 'Compare at price', token: '{{productCompareAtPrice}}' },
                { label: 'Save %', token: '{{productSavePercent}}' },
                { label: 'Site URL', token: '{{siteUrl}}' },
              ].map((item) => (
                <button key={item.token} type="button" onClick={() => {
                  if (!lastFocusedInput) {
                    navigator.clipboard.writeText(item.token);
                    setStatusMessage(`Copied ${item.token}`);
                    setTimeout(() => setStatusMessage(''), 2000);
                    return;
                  }
                  const block = settings.blocks.find((b) => b.id === lastFocusedInput.blockId);
                  if (!block) return;
                  const field = lastFocusedInput.field;
                  if (block.type === 'heading' || block.type === 'text') {
                    const currentText = block.text || '';
                    const input = document.querySelector(`[data-block-id="${block.id}"][data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement;
                    if (input) {
                      const start = input.selectionStart || currentText.length;
                      const end = input.selectionEnd || currentText.length;
                      const newText = currentText.slice(0, start) + item.token + currentText.slice(end);
                      updateBlock(block.id, { text: newText });
                    }
                  } else if (block.type === 'cta' && (field === 'label' || field === 'url')) {
                    const currentValue = block[field] || '';
                    const input = document.querySelector(`[data-block-id="${block.id}"][data-field="${field}"]`) as HTMLInputElement;
                    if (input) {
                      const start = input.selectionStart || currentValue.length;
                      const end = input.selectionEnd || currentValue.length;
                      const newValue = currentValue.slice(0, start) + item.token + currentValue.slice(end);
                      updateBlock(block.id, { [field]: newValue });
                    }
                  }
                }} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-action hover:bg-action/5 hover:text-action">{item.label}</button>
              ))}
            </div>
            <div className="space-y-3">
              {settings.blocks.map((block, idx) => (
                <div key={block.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-gray-500">{blockTypeLabels[block.type]}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={idx === settings.blocks.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeBlock(block.id)} className="p-1 text-red-400 hover:text-red-600">×</button>
                    </div>
                  </div>
                  {block.type === 'heading' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select value={block.level || 2} onChange={(e) => updateBlock(block.id, { level: Number(e.target.value) as 1 | 2 | 3 })} className="w-24 rounded border border-gray-300 px-2 py-1 text-sm">
                          <option value={1}>H1</option>
                          <option value={2}>H2</option>
                          <option value={3}>H3</option>
                        </select>
                        <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                        <input
                          type="number"
                          min={10}
                          max={48}
                          value={block.fontSize || 28}
                          onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 28) })}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <input type="text" value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })} data-block-id={block.id} data-field="text" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  )}
                  {block.type === 'text' && (
                    <div className="space-y-2">
                      <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                      <input
                        type="number"
                        min={10}
                        max={48}
                        value={block.fontSize || 16}
                        onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 16) })}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <textarea value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })} data-block-id={block.id} data-field="text" rows={3} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                    </div>
                  )}
                  {block.type === 'cta' && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input type="text" value={block.label} onChange={(e) => updateBlock(block.id, { label: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'label' })} data-block-id={block.id} data-field="label" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                      <input type="text" value={block.url} onChange={(e) => updateBlock(block.id, { url: e.target.value })} onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'url' })} data-block-id={block.id} data-field="url" className="rounded border border-gray-300 px-3 py-2 text-sm" />
                      <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2">
                        <option value="left">Align left</option>
                        <option value="center">Align center</option>
                        <option value="right">Align right</option>
                      </select>
                      <input
                        type="number"
                        min={10}
                        max={48}
                        value={block.fontSize || 15}
                        onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 15) })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
                      />
                    </div>
                  )}
                  {block.type === 'productCards' && (
                    <div className="space-y-2">
                      <select value={block.mode} onChange={(e) => updateBlock(block.id, { mode: e.target.value as 'single' | 'all' })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                        <option value="single">Single product</option>
                        <option value="all">All products</option>
                      </select>
                      <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="left">Align left</option>
                        <option value="center">Align center</option>
                        <option value="right">Align right</option>
                      </select>
                      <input
                        type="number"
                        min={10}
                        max={48}
                        value={block.fontSize || 16}
                        onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 16) })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                  {block.type === 'curatedProducts' && (
                    <div className="space-y-2">
                      <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="left">Align left</option>
                        <option value="center">Align center</option>
                        <option value="right">Align right</option>
                      </select>
                      <label className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={block.showDividers === true}
                          onChange={(e) => updateBlock(block.id, { showDividers: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-action focus:ring-action"
                        />
                        Show divider between product cards
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={48}
                        value={block.fontSize || 16}
                        onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 16) })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <div className="grid grid-cols-1 gap-2 rounded border border-gray-200 bg-white p-3 md:grid-cols-[1fr_auto]">
                        <input
                          type="text"
                          placeholder="Handle to add new product card"
                          value={newCuratedHandles[block.id] || ''}
                          onChange={(e) =>
                            setNewCuratedHandles((prev) => ({ ...prev, [block.id]: e.target.value }))
                          }
                          className="rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => addCuratedProductByHandle(block.id)}
                          className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                        >
                          + Add from handle
                        </button>
                      </div>
                      {block.products.map((product) => (
                        <div key={product.id} className="rounded border border-gray-200 bg-white p-3">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <input
                              type="text"
                              placeholder="Product handle"
                              value={product.handle}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, handle: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => fetchCuratedProduct(block.id, product.id)}
                                className="rounded border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                              >
                                Fetch
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCuratedProducts(
                                    block.id,
                                    block.products.filter((item) => item.id !== product.id)
                                  )
                                }
                                className="rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400"
                              >
                                Remove
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Title"
                              value={product.title || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, title: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Product URL"
                              value={product.url || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, url: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Image URL"
                              value={product.imageUrl || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, imageUrl: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                            />
                            <input
                              type="text"
                              placeholder="Price (e.g. $99.95)"
                              value={product.price || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, price: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Compare at price (optional)"
                              value={product.compareAtPrice || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, compareAtPrice: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Save percent (e.g. 25%)"
                              value={product.savePercent || ''}
                              onChange={(e) =>
                                updateCuratedProducts(
                                  block.id,
                                  block.products.map((item) =>
                                    item.id === product.id ? { ...item, savePercent: e.target.value } : item
                                  )
                                )
                              }
                              className="rounded border border-gray-300 px-3 py-2 text-sm"
                            />
                            <label className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700">
                              <input
                                type="checkbox"
                                checked={product.freeShippingBadge !== false}
                                onChange={(e) =>
                                  updateCuratedProducts(
                                    block.id,
                                    block.products.map((item) =>
                                      item.id === product.id
                                        ? { ...item, freeShippingBadge: e.target.checked }
                                        : item
                                    )
                                  )
                                }
                                className="h-4 w-4 rounded border-gray-300 text-action focus:ring-action"
                              />
                              Show FREE SHIPPING badge
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateCuratedProducts(block.id, [
                            ...block.products,
                            { id: generateId(), handle: '', title: '', imageUrl: '', url: '' },
                          ])
                        }
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-action hover:text-action"
                      >
                        + Add blank product card
                      </button>
                    </div>
                  )}
                  {block.type === 'divider' && (
                    <div className="space-y-2">
                      <p className="text-xs italic text-gray-400">Horizontal line</p>
                      <select value={block.align || 'center'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="left">Align left</option>
                        <option value="center">Align center</option>
                        <option value="right">Align right</option>
                      </select>
                    </div>
                  )}
                  {block.type === 'footer' && (
                    <div className="space-y-2">
                      <textarea value={block.text} onChange={(e) => updateBlock(block.id, { text: e.target.value })} rows={2} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                      <input
                        type="number"
                        min={10}
                        max={48}
                        value={block.fontSize || 12}
                        onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value || 12) })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <select value={block.align || 'left'} onChange={(e) => updateBlock(block.id, { align: e.target.value as 'left' | 'center' | 'right' })} className="rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="left">Align left</option>
                        <option value="center">Align center</option>
                        <option value="right">Align right</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(['heading', 'text', 'cta', 'productCards', 'curatedProducts', 'divider', 'footer'] as const).map((type) => (
                <button key={type} type="button" onClick={() => addBlock(type)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-action hover:text-action">+ {blockTypeLabels[type]}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={saveTemplateFromBuilder} disabled={isSaving} className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Saving...' : editorMode === 'edit' ? 'Save new version' : 'Save settings'}</button>
            <div className="flex flex-wrap items-center gap-2">
              <input type="email" placeholder="Test email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="w-48 rounded-full border border-gray-300 px-4 py-2 text-sm" />
              <button type="button" onClick={sendTestEmail} disabled={isSendingTest} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60">{isSendingTest ? 'Sending...' : 'Send test'}</button>
            </div>
            {statusMessage ? <p className="text-sm text-gray-600">{statusMessage}</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            <p className="text-sm text-gray-500">Preview with sample data.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input type="text" placeholder="Preview product handle" value={previewHandle} onChange={(e) => setPreviewHandle(e.target.value)} className="w-64 rounded-full border border-gray-300 px-4 py-2 text-sm" />
              <button type="button" onClick={loadPreviewProduct} disabled={previewLoading} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60">{previewLoading ? 'Loading...' : 'Load product'}</button>
              <button type="button" onClick={fetchPreviewHtml} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">Refresh preview</button>
              {previewProduct ? (
                <span className="text-xs text-gray-500">
                  Previewing: {previewProduct.title}
                  {previewProduct.price ? ` · ${previewProduct.price}` : ''}
                  {previewProduct.savePercent ? ` · Save ${previewProduct.savePercent}` : ''}
                </span>
              ) : null}
              {previewError ? <span className="text-xs text-red-600">{previewError}</span> : null}
            </div>
            {previewLoaded ? (
              <div className="mt-4 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-4" style={{ maxHeight: '70vh' }}>
                <iframe srcDoc={previewHtml} title="Email preview" className="w-full border-0" style={{ minHeight: '600px' }} />
              </div>
            ) : (
              <div className="mt-4 py-12 text-center text-gray-400">Loading preview...</div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Quick tips</h3>
            <ul className="space-y-2">
              <li>React Email guarantees cross-client style rendering.</li>
              <li>Use tokens like {'{{productTitle}}'} and {'{{productUrl}}'} to personalize.</li>
              <li>Add, reorder, or remove blocks to customize the email.</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </AdminLayout>
  );
}
