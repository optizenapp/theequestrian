'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { HtmlEditor } from '@/components/admin/HtmlEditor';

interface HomeSectionRow {
  key: string;
  type: string;
  enabled: boolean;
  sort_order: number;
  eyebrow?: string;
  title_html?: string;
  subtitle_html?: string;
  body_html?: string;
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  image_url?: string;
  image_alt?: string;
  image_link?: string;
  most_wanted_items_json?: any;
  product_handles?: string;
  faqs_json?: any;
  seen_in_json?: any;
  items_json?: any;
}

export default function AdminHomeSectionsPage() {
  const [sections, setSections] = useState<HomeSectionRow[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/home-sections');
      const data = await response.json();
      setSections(data.sections || []);
    } catch (error) {
      console.error('Failed to load home sections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const active = sections.find((section) => section.key === activeKey) || null;

  const updateActive = (changes: Partial<HomeSectionRow>) => {
    setSections((prev) =>
      prev.map((section) => (section.key === activeKey ? { ...section, ...changes } : section))
    );
  };

  const saveActive = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/home-sections/${active.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(active),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || 'Failed to save');
        return;
      }
      const data = await response.json();
      setSections((prev) =>
        prev.map((section) => (section.key === active.key ? data.section : section))
      );
    } catch (error) {
      console.error('Failed to save home section:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Home Sections" subtitle="Edit homepage layout and content">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sections</h3>
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveKey(section.key)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    activeKey === section.key ? 'border-action text-action' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="font-semibold">{section.key}</div>
                  <div className="text-xs text-gray-500">{section.type}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{active.key}</h3>
                  <p className="text-sm text-gray-500">{active.type}</p>
                </div>
                <button
                  type="button"
                  onClick={saveActive}
                  disabled={saving}
                  className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Section'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enabled</label>
                  <select
                    value={active.enabled ? 'true' : 'false'}
                    onChange={(event) => updateActive({ enabled: event.target.value === 'true' })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    value={active.sort_order ?? 0}
                    onChange={(event) => updateActive({ sort_order: Number(event.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Eyebrow</label>
                  <input
                    value={active.eyebrow || ''}
                    onChange={(event) => updateActive({ eyebrow: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CTA Text</label>
                  <input
                    value={active.cta_text || ''}
                    onChange={(event) => updateActive({ cta_text: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">CTA Link</label>
                  <input
                    value={active.cta_link || ''}
                    onChange={(event) => updateActive({ cta_link: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Secondary CTA Text</label>
                  <input
                    value={active.secondary_cta_text || ''}
                    onChange={(event) => updateActive({ secondary_cta_text: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Secondary CTA Link</label>
                  <input
                    value={active.secondary_cta_link || ''}
                    onChange={(event) => updateActive({ secondary_cta_link: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    value={active.image_url || ''}
                    onChange={(event) => updateActive({ image_url: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Image Alt</label>
                  <input
                    value={active.image_alt || ''}
                    onChange={(event) => updateActive({ image_alt: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Image Link</label>
                  <input
                    value={active.image_link || ''}
                    onChange={(event) => updateActive({ image_link: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Title HTML</label>
                  <HtmlEditor value={active.title_html || ''} onChange={(value) => updateActive({ title_html: value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Subtitle HTML</label>
                  <HtmlEditor value={active.subtitle_html || ''} onChange={(value) => updateActive({ subtitle_html: value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Body HTML</label>
                  <HtmlEditor value={active.body_html || ''} onChange={(value) => updateActive({ body_html: value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Product Handles (comma-separated)</label>
                  <textarea
                    value={active.product_handles || ''}
                    onChange={(event) => updateActive({ product_handles: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">FAQs JSON</label>
                  <textarea
                    value={active.faqs_json ? JSON.stringify(active.faqs_json, null, 2) : ''}
                    onChange={(event) => updateActive({ faqs_json: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Seen In JSON</label>
                  <textarea
                    value={active.seen_in_json ? JSON.stringify(active.seen_in_json, null, 2) : ''}
                    onChange={(event) => updateActive({ seen_in_json: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Most Wanted Items JSON</label>
                  <textarea
                    value={active.most_wanted_items_json ? JSON.stringify(active.most_wanted_items_json, null, 2) : ''}
                    onChange={(event) => updateActive({ most_wanted_items_json: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Best Deals Items JSON</label>
                  <textarea
                    value={active.items_json ? JSON.stringify(active.items_json, null, 2) : ''}
                    onChange={(event) => updateActive({ items_json: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    rows={4}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">Select a section to edit.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
