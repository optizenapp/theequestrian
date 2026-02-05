'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

type ReviewEmailBlock =
  | { id: string; type: 'heading'; text: string; level?: 1 | 2 | 3; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'text'; text: string; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'cta'; label: string; url: string }
  | { id: string; type: 'productCards'; mode: 'single' | 'all' }
  | { id: string; type: 'divider' }
  | { id: string; type: 'footer'; text: string };

type ReviewEmailSettings = {
  enabled: boolean;
  delayDays: number;
  subjectTemplate: string;
  blocks: ReviewEmailBlock[];
  fromName: string;
  fromEmail: string;
  brandPrimary: string;
  brandDark: string;
  headerBackground: string;
  linkColor: string;
  logoUrl: string | null;
};

const blockTypeLabels: Record<ReviewEmailBlock['type'], string> = {
  heading: 'Heading',
  text: 'Text',
  cta: 'Button',
  productCards: 'Product Cards',
  divider: 'Divider',
  footer: 'Footer',
};

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminReviewEmailSettingsPage() {
  const [settings, setSettings] = useState<ReviewEmailSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewHandle, setPreviewHandle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewProduct, setPreviewProduct] = useState<{
    title: string;
    imageUrl: string | null;
    url: string;
  } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [lastFocusedInput, setLastFocusedInput] = useState<{
    blockId: string;
    field: 'text' | 'label' | 'url';
  } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/reviews/email-settings');
        const data = await response.json();
        setSettings(data.settings);
      } catch (error) {
        console.error('Failed to load review email settings:', error);
      }
    }
    loadSettings();
  }, []);

  const fetchPreviewHtml = useCallback(async () => {
    if (!settings) return;
    try {
      const response = await fetch('/api/admin/reviews/email-settings/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: previewHandle || null,
          blocks: settings.blocks,
          brandPrimary: settings.brandPrimary,
          brandDark: settings.brandDark,
          headerBackground: settings.headerBackground,
          logoUrl: settings.logoUrl,
          fromName: settings.fromName,
        }),
      });
      const data = await response.json();
      if (response.ok && data.html) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Failed to fetch preview HTML:', error);
    } finally {
      setPreviewLoaded(true);
    }
  }, [settings, previewHandle]);

  useEffect(() => {
    if (settings) {
      const timeoutId = setTimeout(() => {
        fetchPreviewHtml();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [settings, fetchPreviewHtml]);

  const updateSetting = <K extends keyof ReviewEmailSettings>(
    key: K,
    value: ReviewEmailSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateBlock = (id: string, patch: Partial<ReviewEmailBlock>) => {
    if (!settings) return;
    const updated = settings.blocks.map((block) =>
      block.id === id ? { ...block, ...patch } : block
    ) as ReviewEmailBlock[];
    updateSetting('blocks', updated);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    if (!settings) return;
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
    if (!settings) return;
    updateSetting(
      'blocks',
      settings.blocks.filter((b) => b.id !== id)
    );
  };

  const addBlock = (type: ReviewEmailBlock['type']) => {
    if (!settings) return;
    let newBlock: ReviewEmailBlock;
    const id = generateId();
    switch (type) {
      case 'heading':
        newBlock = { id, type, level: 2, text: 'Your heading here' };
        break;
      case 'text':
        newBlock = { id, type, text: 'Your text here' };
        break;
      case 'cta':
        newBlock = { id, type, label: 'Write a Review', url: '{{productUrl}}' };
        break;
      case 'productCards':
        newBlock = { id, type, mode: 'single' };
        break;
      case 'divider':
        newBlock = { id, type };
        break;
      case 'footer':
        newBlock = { id, type, text: 'Footer text here' };
        break;
      default:
        return;
    }
    updateSetting('blocks', [...settings.blocks, newBlock]);
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all blocks to default template? This cannot be undone.')) return;
    try {
      const response = await fetch('/api/admin/reviews/email-settings/reset-blocks', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Reset API error:', errorData);
        throw new Error(errorData.error || 'Reset failed');
      }
      const data = await response.json();
      setSettings(data.settings);
      setStatusMessage('Reset to defaults.');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to reset blocks:', error);
      setStatusMessage('Failed to reset.');
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
      const response = await fetch('/api/admin/reviews/email-settings/preview-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: previewHandle }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load product');
      }
      setPreviewProduct(payload.product);
      fetchPreviewHtml();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load product';
      setPreviewError(message);
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
      setStatusMessage('⚠️ Warning: Upload logo to a public URL for emails. Data URLs may not work in all email clients.');
      setTimeout(() => setStatusMessage(''), 5000);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/admin/reviews/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error('Save failed');
      }
      const data = await response.json();
      setSettings(data.settings);
      setStatusMessage('Saved successfully.');
    } catch (error) {
      console.error('Failed to save review email settings:', error);
      setStatusMessage('Failed to save settings.');
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
      const response = await fetch('/api/admin/reviews/email-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail, handle: previewHandle || null }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Test email failed');
      }
      setStatusMessage('Test email sent.');
    } catch (error) {
      console.error('Failed to send test email:', error);
      setStatusMessage('Failed to send test email.');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  if (!settings) {
    return (
      <AdminLayout title="Review Email Settings" subtitle="Customize review email timing and template">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Loading settings...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Review Email Settings" subtitle="Customize timing, branding, and template">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Delivery Settings */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delivery Settings</h2>
                <p className="text-sm text-gray-500">Control delay and enable or disable sending.</p>
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <span>Enabled</span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => updateSetting('enabled', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-action focus:ring-action"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Delay (days after fulfillment)
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={settings.delayDays}
                  onChange={(event) => updateSetting('delayDays', Number(event.target.value || 0))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Subject line
                <input
                  type="text"
                  value={settings.subjectTemplate}
                  onChange={(event) => updateSetting('subjectTemplate', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                From name
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(event) => updateSetting('fromName', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                From email
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(event) => updateSetting('fromEmail', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                />
              </label>
            </div>
          </div>

          {/* Branding */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            <p className="text-sm text-gray-500">Upload a logo and set brand colors.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Brand primary (buttons)
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.brandPrimary}
                    onChange={(event) => updateSetting('brandPrimary', event.target.value)}
                    className="h-10 w-12 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.brandPrimary}
                    onChange={(event) => updateSetting('brandPrimary', event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Brand dark (text)
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.brandDark}
                    onChange={(event) => updateSetting('brandDark', event.target.value)}
                    className="h-10 w-12 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.brandDark}
                    onChange={(event) => updateSetting('brandDark', event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Header background
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.headerBackground}
                    onChange={(event) => updateSetting('headerBackground', event.target.value)}
                    className="h-10 w-12 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.headerBackground}
                    onChange={(event) => updateSetting('headerBackground', event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Link color
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.linkColor}
                    onChange={(event) => updateSetting('linkColor', event.target.value)}
                    className="h-10 w-12 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.linkColor}
                    onChange={(event) => updateSetting('linkColor', event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                </div>
              </label>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Logo URL (must be publicly accessible)
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(event) => updateSetting('logoUrl', event.target.value || null)}
                    placeholder="https://yourdomain.com/logo.png"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Or upload a file (for preview only - won't work in sent emails):
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                  className="mt-1 block w-full text-sm text-gray-600"
                />
                {settings.logoUrl && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Logo preview</p>
                    <img src={settings.logoUrl} alt="Logo preview" className="max-h-16" />
                    {settings.logoUrl.startsWith('data:') && (
                      <p className="mt-2 text-xs text-amber-600">
                        ⚠️ Data URL - won't work in sent emails. Upload to a public URL instead.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Block Editor */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Email Content Blocks</h2>
                <p className="text-sm text-gray-500">
                  Reorder, edit, or add blocks. Click tokens below to copy.
                </p>
              </div>
              <button
                type="button"
                onClick={resetToDefaults}
                className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-red-500 hover:text-red-600"
              >
                Reset to defaults
              </button>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[
                { label: 'Customer name', token: '{{customerName}}' },
                { label: 'Order number', token: '{{orderNumber}}' },
                { label: 'Product title', token: '{{productTitle}}' },
                { label: 'Product URL', token: '{{productUrl}}' },
                { label: 'Site URL', token: '{{siteUrl}}' },
              ].map((item) => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => {
                    if (!lastFocusedInput) {
                      navigator.clipboard.writeText(item.token);
                      setStatusMessage(`Copied ${item.token}`);
                      setTimeout(() => setStatusMessage(''), 2000);
                      return;
                    }
                    const block = settings?.blocks.find((b) => b.id === lastFocusedInput.blockId);
                    if (!block) return;
                    const field = lastFocusedInput.field;
                    if (block.type === 'heading' || block.type === 'text') {
                      const currentText = block.text || '';
                      const input = document.querySelector(
                        `[data-block-id="${block.id}"][data-field="${field}"]`
                      ) as HTMLInputElement | HTMLTextAreaElement;
                      if (input) {
                        const start = input.selectionStart || currentText.length;
                        const end = input.selectionEnd || currentText.length;
                        const newText =
                          currentText.slice(0, start) + item.token + currentText.slice(end);
                        updateBlock(block.id, { text: newText });
                        setTimeout(() => {
                          input.focus();
                          input.setSelectionRange(start + item.token.length, start + item.token.length);
                        }, 0);
                      }
                    } else if (block.type === 'cta' && (field === 'label' || field === 'url')) {
                      const currentValue = block[field] || '';
                      const input = document.querySelector(
                        `[data-block-id="${block.id}"][data-field="${field}"]`
                      ) as HTMLInputElement;
                      if (input) {
                        const start = input.selectionStart || currentValue.length;
                        const end = input.selectionEnd || currentValue.length;
                        const newValue =
                          currentValue.slice(0, start) + item.token + currentValue.slice(end);
                        updateBlock(block.id, { [field]: newValue });
                        setTimeout(() => {
                          input.focus();
                          input.setSelectionRange(start + item.token.length, start + item.token.length);
                        }, 0);
                      }
                    }
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-action hover:bg-action/5 hover:text-action"
                  title={`Click to insert ${item.token}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {settings.blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {blockTypeLabels[block.type]}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={idx === settings.blocks.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {block.type === 'heading' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={block.level || 2}
                          onChange={(e) =>
                            updateBlock(block.id, { level: Number(e.target.value) as 1 | 2 | 3 })
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value={1}>H1</option>
                          <option value={2}>H2</option>
                          <option value={3}>H3</option>
                        </select>
                        <select
                          value={block.align || 'left'}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              align: e.target.value as 'left' | 'center' | 'right',
                            })
                          }
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })}
                        data-block-id={block.id}
                        data-field="text"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {block.type === 'text' && (
                    <div className="space-y-2">
                      <select
                        value={block.align || 'left'}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            align: e.target.value as 'left' | 'center' | 'right',
                          })
                        }
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                      <textarea
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'text' })}
                        data-block-id={block.id}
                        data-field="text"
                        rows={3}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {block.type === 'cta' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={block.label}
                        onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                        onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'label' })}
                        data-block-id={block.id}
                        data-field="label"
                        placeholder="Button label"
                        className="rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={block.url}
                        onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                        onFocus={() => setLastFocusedInput({ blockId: block.id, field: 'url' })}
                        data-block-id={block.id}
                        data-field="url"
                        placeholder="URL or {{productUrl}}"
                        className="rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {block.type === 'productCards' && (
                    <select
                      value={block.mode}
                      onChange={(e) =>
                        updateBlock(block.id, { mode: e.target.value as 'single' | 'all' })
                      }
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="single">Single product</option>
                      <option value="all">All products</option>
                    </select>
                  )}
                  {block.type === 'divider' && (
                    <p className="text-xs text-gray-400 italic">Horizontal line</p>
                  )}
                  {block.type === 'footer' && (
                    <textarea
                      value={block.text}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      rows={2}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(['heading', 'text', 'cta', 'productCards', 'divider', 'footer'] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-action hover:text-action"
                  >
                    + {blockTypeLabels[type]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Save / Test */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                placeholder="Test email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                className="w-48 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
              <button
                type="button"
                onClick={sendTestEmail}
                disabled={isSendingTest}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingTest ? 'Sending...' : 'Send test'}
              </button>
            </div>
            {statusMessage ? <p className="text-sm text-gray-600">{statusMessage}</p> : null}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            <p className="text-sm text-gray-500">Preview with sample data.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Preview product handle"
                value={previewHandle}
                onChange={(event) => setPreviewHandle(event.target.value)}
                className="w-64 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
              <button
                type="button"
                onClick={loadPreviewProduct}
                disabled={previewLoading}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewLoading ? 'Loading...' : 'Load product'}
              </button>
              <button
                type="button"
                onClick={fetchPreviewHtml}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action"
              >
                Refresh preview
              </button>
              {previewProduct ? (
                <span className="text-xs text-gray-500">Previewing: {previewProduct.title}</span>
              ) : null}
              {previewError ? <span className="text-xs text-red-600">{previewError}</span> : null}
            </div>
            {previewLoaded ? (
              <div
                className="mt-4 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-4"
                style={{ maxHeight: '70vh' }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Email preview"
                  className="w-full border-0"
                  style={{ minHeight: '600px' }}
                />
              </div>
            ) : (
              <div className="mt-4 text-center text-gray-400 py-12">Loading preview...</div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick tips</h3>
            <ul className="space-y-2">
              <li>React Email guarantees cross-client rendering.</li>
              <li>Use tokens like {'{{productTitle}}'} and {'{{productUrl}}'} to personalize.</li>
              <li>Add, reorder, or remove blocks to customize the email.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
