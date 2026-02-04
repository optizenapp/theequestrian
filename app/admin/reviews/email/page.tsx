'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

type ReviewEmailSettings = {
  enabled: boolean;
  delayDays: number;
  subjectTemplate: string;
  htmlTemplate: string;
  fromName: string;
  fromEmail: string;
  brandPrimary: string;
  brandDark: string;
  logoUrl: string | null;
};

const tokenOptions = [
  { label: 'Customer name', token: '{{customerName}}' },
  { label: 'Product title', token: '{{productTitle}}' },
  { label: 'Product URL', token: '{{productUrl}}' },
  { label: 'Order number', token: '{{orderNumber}}' },
  { label: 'Site URL', token: '{{siteUrl}}' },
  { label: 'Logo section', token: '{{logoSection}}' },
  { label: 'Brand primary', token: '{{brandPrimary}}' },
  { label: 'Brand dark', token: '{{brandDark}}' },
];

function applyTemplate(template: string, variables: Record<string, string>) {
  let output = template;
  Object.entries(variables).forEach(([key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(token, value);
  });
  return output;
}

export default function AdminReviewEmailSettingsPage() {
  const [settings, setSettings] = useState<ReviewEmailSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

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

  useEffect(() => {
    if (!settings || !editorRef.current || isEditorFocused) return;
    editorRef.current.innerHTML = settings.htmlTemplate;
  }, [settings, isEditorFocused]);

  const previewHtml = useMemo(() => {
    if (!settings) return '';
    const logoSection = settings.logoUrl
      ? `<div style="margin-bottom: 16px;"><img src="${settings.logoUrl}" alt="The Equestrian" style="max-width: 180px; height: auto;" /></div>`
      : '';
    return applyTemplate(settings.htmlTemplate, {
      customerName: 'Jono',
      productTitle: 'Synthetic Combo Horse Rug - Eureka Mini',
      productUrl: 'https://www.theequestrian.com.au/products/sample-product#reviews',
      orderNumber: '3599',
      siteUrl: 'https://www.theequestrian.com.au',
      logoSection,
      brandPrimary: settings.brandPrimary,
      brandDark: settings.brandDark,
    });
  }, [settings]);

  const updateSetting = <K extends keyof ReviewEmailSettings>(
    key: K,
    value: ReviewEmailSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    updateSetting('htmlTemplate', editorRef.current.innerHTML);
  };

  const handleSourceChange = (value: string) => {
    updateSetting('htmlTemplate', value);
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  };

  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const insertToken = (token: string) => {
    document.execCommand('insertText', false, token);
    handleEditorInput();
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateSetting('logoUrl', result || null);
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
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

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            <p className="text-sm text-gray-500">Upload a logo and set brand colors.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Brand primary
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
                Brand dark
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Logo upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
                    className="mt-1 block w-full text-sm text-gray-600"
                  />
                </label>
                {settings.logoUrl && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Logo preview</p>
                    <img src={settings.logoUrl} alt="Logo preview" className="max-h-16" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Template Editor</h2>
            <p className="text-sm text-gray-500">
              Use the visual editor or edit HTML directly. Tokens will be replaced when sending.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tokenOptions.map((token) => (
                <button
                  key={token.token}
                  type="button"
                  onClick={() => insertToken(token.token)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-action hover:text-action"
                >
                  {token.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyCommand('bold')} className="editor-btn">
                Bold
              </button>
              <button type="button" onClick={() => applyCommand('italic')} className="editor-btn">
                Italic
              </button>
              <button type="button" onClick={() => applyCommand('underline')} className="editor-btn">
                Underline
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter link URL');
                  if (url) applyCommand('createLink', url);
                }}
                className="editor-btn"
              >
                Link
              </button>
              <button type="button" onClick={() => applyCommand('unlink')} className="editor-btn">
                Unlink
              </button>
              <button
                type="button"
                onClick={() => applyCommand('insertUnorderedList')}
                className="editor-btn"
              >
                Bullet list
              </button>
              <button
                type="button"
                onClick={() => applyCommand('insertOrderedList')}
                className="editor-btn"
              >
                Numbered list
              </button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200">
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  onFocus={() => setIsEditorFocused(true)}
                  onBlur={() => setIsEditorFocused(false)}
                  className="min-h-[320px] px-4 py-3 text-sm text-gray-800 focus:outline-none"
                  suppressContentEditableWarning
                />
              </div>
              <textarea
                ref={sourceRef}
                value={settings.htmlTemplate}
                onChange={(event) => handleSourceChange(event.target.value)}
                className="min-h-[320px] w-full rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-700 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
            {statusMessage ? <p className="text-sm text-gray-600">{statusMessage}</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            <p className="text-sm text-gray-500">Preview with sample data.</p>
            <div
              className="mt-4 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick tips</h3>
            <ul className="space-y-2">
              <li>Use inline styles for best email client support.</li>
              <li>
                Use tokens like {'{{productTitle}}'} and {'{{productUrl}}'} to personalize.
              </li>
              <li>Keep layouts under 600px wide for best rendering.</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .editor-btn {
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
          background: #fff;
        }
        .editor-btn:hover {
          color: #e91e63;
          border-color: #e91e63;
        }
      `}</style>
    </AdminLayout>
  );
}
