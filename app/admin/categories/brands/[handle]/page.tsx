'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { HtmlEditor } from '@/components/admin/HtmlEditor';

interface BrandBase {
  title: string;
  handle: string;
  h1_title?: string;
  meta_title?: string;
  meta_description?: string;
  short_description?: string;
  long_description?: string;
  breadcrumb_label?: string;
  faq_json?: string;
}

interface BrandOverride {
  title: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  faq_json: string;
  status: string;
}

export default function AdminBrandDetail({ params }: { params: { handle: string } }) {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandBase | null>(null);
  const [override, setOverride] = useState<BrandOverride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBrand();
  }, []);

  const loadBrand = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/brands/${params.handle}`);
      const data = await response.json();
      setBrand(data.brand || null);
      if (data.override) {
        setOverride({
          title: data.override.title || data.brand?.title || '',
          h1_title: data.override.h1_title || '',
          meta_title: data.override.meta_title || '',
          meta_description: data.override.meta_description || '',
          short_description: data.override.short_description || '',
          long_description: data.override.long_description || '',
          breadcrumb_label: data.override.breadcrumb_label || '',
          faq_json: data.override.faq_json || '',
          status: data.override.status || 'published',
        });
      } else {
        setOverride({
          title: data.brand?.title || '',
          h1_title: data.brand?.h1_title || '',
          meta_title: data.brand?.meta_title || '',
          meta_description: data.brand?.meta_description || '',
          short_description: data.brand?.short_description || '',
          long_description: data.brand?.long_description || '',
          breadcrumb_label: data.brand?.breadcrumb_label || '',
          faq_json: data.brand?.faq_json || '[]',
          status: 'published',
        });
      }
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!override || !brand) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/brands/${params.handle}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || 'Failed to save');
        return;
      }
      const data = await response.json();
      setOverride({
        title: data.override.title || override.title,
        h1_title: data.override.h1_title || override.h1_title,
        meta_title: data.override.meta_title || override.meta_title,
        meta_description: data.override.meta_description || override.meta_description,
        short_description: data.override.short_description || override.short_description,
        long_description: data.override.long_description || override.long_description,
        breadcrumb_label: data.override.breadcrumb_label || override.breadcrumb_label,
        faq_json: data.override.faq_json || override.faq_json,
        status: data.override.status || override.status,
      });
    } catch (error) {
      console.error('Failed to save brand:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Brand Content">
        <div className="py-24 text-center text-gray-600">Loading brand...</div>
      </AdminLayout>
    );
  }

  if (!brand || !override) {
    return (
      <AdminLayout title="Brand Content">
        <div className="py-24 text-center text-gray-600">Brand not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Brand Page" subtitle={`/brands/${brand.handle}`}>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/admin/categories/brands')}
          className="text-sm font-semibold text-action"
        >
          ← Back to Brands
        </button>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              value={override.title}
              onChange={(event) => setOverride({ ...override, title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={override.status}
              onChange={(event) => setOverride({ ...override, status: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">H1 Title</label>
            <input
              value={override.h1_title}
              onChange={(event) => setOverride({ ...override, h1_title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Breadcrumb Label</label>
            <input
              value={override.breadcrumb_label}
              onChange={(event) => setOverride({ ...override, breadcrumb_label: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Title</label>
            <input
              value={override.meta_title}
              onChange={(event) => setOverride({ ...override, meta_title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Description</label>
            <input
              value={override.meta_description}
              onChange={(event) => setOverride({ ...override, meta_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Short Description</label>
            <textarea
              value={override.short_description}
              onChange={(event) => setOverride({ ...override, short_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Long Description (HTML)</label>
            <HtmlEditor
              value={override.long_description}
              onChange={(value) => setOverride({ ...override, long_description: value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">FAQ JSON</label>
            <textarea
              value={override.faq_json}
              onChange={(event) => setOverride({ ...override, faq_json: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Brand'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
