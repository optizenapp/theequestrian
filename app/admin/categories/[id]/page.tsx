'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CategoryDetail {
  id: number;
  url_path: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  breadcrumb_label: string;
  status: string;
  default_sort: string;
  faq_items: any[];
  related_categories: any[];
}

const formatJson = (value: any) => {
  try {
    return JSON.stringify(value ?? [], null, 2);
  } catch {
    return '[]';
  }
};

export default function CategoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faqJson, setFaqJson] = useState('[]');
  const [relatedJson, setRelatedJson] = useState('[]');

  useEffect(() => {
    fetchCategory();
  }, []);

  const fetchCategory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/categories/${params.id}`);
      const data = await response.json();
      setCategory(data.category);
      setFaqJson(formatJson(data.category?.faq_items));
      setRelatedJson(formatJson(data.category?.related_categories));
    } catch (error) {
      console.error('Failed to load category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!category) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/categories/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...category,
          faq_items: faqJson,
          related_categories: relatedJson,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setCategory(data.category);
        setFaqJson(formatJson(data.category?.faq_items));
        setRelatedJson(formatJson(data.category?.related_categories));
      } else {
        const data = await response.json();
        alert(data?.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this category content?')) return;
    try {
      const response = await fetch(`/api/admin/categories/${params.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/admin/categories');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Category Detail">
        <div className="py-24 text-center text-gray-600">Loading category...</div>
      </AdminLayout>
    );
  }

  if (!category) {
    return (
      <AdminLayout title="Category Detail">
        <div className="py-24 text-center text-gray-600">Category not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Category" subtitle={category.url_path}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">URL Path</label>
            <input
              value={category.url_path}
              onChange={(event) => setCategory({ ...category, url_path: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">H1 Title</label>
            <input
              value={category.h1_title}
              onChange={(event) => setCategory({ ...category, h1_title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Title</label>
            <input
              value={category.meta_title || ''}
              onChange={(event) => setCategory({ ...category, meta_title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Description</label>
            <input
              value={category.meta_description || ''}
              onChange={(event) => setCategory({ ...category, meta_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Breadcrumb Label</label>
            <input
              value={category.breadcrumb_label || ''}
              onChange={(event) => setCategory({ ...category, breadcrumb_label: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={category.status || 'published'}
              onChange={(event) => setCategory({ ...category, status: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Default Sort</label>
            <input
              value={category.default_sort || ''}
              onChange={(event) => setCategory({ ...category, default_sort: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Short Description</label>
            <textarea
              value={category.short_description || ''}
              onChange={(event) => setCategory({ ...category, short_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Long Description (HTML)</label>
            <textarea
              value={category.long_description || ''}
              onChange={(event) => setCategory({ ...category, long_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={6}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">FAQ Items (JSON Array)</label>
            <textarea
              value={faqJson}
              onChange={(event) => setFaqJson(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Related Categories (JSON Array)</label>
            <textarea
              value={relatedJson}
              onChange={(event) => setRelatedJson(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
          >
            Delete
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/categories')}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
