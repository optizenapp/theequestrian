'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CategoryRow {
  id: number | null;
  url_path: string;
  category_level: number;
  parent_url: string | null;
  status: string;
  h1_title: string;
  meta_title: string;
  product_count: number;
  has_content: boolean;
}

const emptyForm = {
  url_path: '',
  h1_title: '',
  meta_title: '',
  meta_description: '',
  short_description: '',
  long_description: '',
  breadcrumb_label: '',
  status: 'published',
  default_sort: 'best-selling',
  faq_items: '[]',
  related_categories: '[]',
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [search, status]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      const response = await fetch(`/api/admin/categories?${params.toString()}`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      if (response.ok) {
        setFormState({ ...emptyForm });
        setShowCreate(false);
        fetchCategories();
      } else {
        const data = await response.json();
        alert(data?.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Category Manager" subtitle="Create and manage category pages and content">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Category Pages</h2>
          <p className="text-sm text-gray-500">
            Manage top-level, sub-category, and sub-sub-category content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? 'Close' : 'New Category'}
        </button>
      </div>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Brand Pages</h3>
            <p className="text-xs text-gray-500">Edit brand landing pages from the same suite.</p>
          </div>
          <Link
            href="/admin/categories/brands"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action"
          >
            Manage Brands
          </Link>
        </div>
      </div>

      {showCreate && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Create New Category Page</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">URL Path</label>
              <input
                value={formState.url_path}
                onChange={(event) => setFormState({ ...formState, url_path: event.target.value })}
                placeholder="/horse/boots/bell-boots"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">H1 Title</label>
              <input
                value={formState.h1_title}
                onChange={(event) => setFormState({ ...formState, h1_title: event.target.value })}
                placeholder="Horse Boots & Leg Protection"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Meta Title</label>
              <input
                value={formState.meta_title}
                onChange={(event) => setFormState({ ...formState, meta_title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Meta Description</label>
              <input
                value={formState.meta_description}
                onChange={(event) => setFormState({ ...formState, meta_description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Breadcrumb Label</label>
              <input
                value={formState.breadcrumb_label}
                onChange={(event) => setFormState({ ...formState, breadcrumb_label: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={formState.status}
                onChange={(event) => setFormState({ ...formState, status: event.target.value })}
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
                value={formState.default_sort}
                onChange={(event) => setFormState({ ...formState, default_sort: event.target.value })}
                placeholder="best-selling"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Short Description</label>
              <textarea
                value={formState.short_description}
                onChange={(event) => setFormState({ ...formState, short_description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Long Description (HTML)</label>
              <textarea
                value={formState.long_description}
                onChange={(event) => setFormState({ ...formState, long_description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={6}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">FAQ Items (JSON Array)</label>
              <textarea
                value={formState.faq_items}
                onChange={(event) => setFormState({ ...formState, faq_items: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Related Categories (JSON Array)</label>
              <textarea
                value={formState.related_categories}
                onChange={(event) => setFormState({ ...formState, related_categories: event.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Category'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
          />
          <div className="flex gap-2">
            {['all', 'published', 'draft', 'archived'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                  status === value ? 'bg-action text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-600">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No categories found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.url_path} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{category.url_path}</div>
                      <div className="text-xs text-gray-500">{category.h1_title || 'No content yet'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{category.category_level}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {category.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{category.product_count}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      {category.id ? (
                        <Link
                          href={`/admin/categories/${category.id}`}
                          className="text-action hover:text-pink-700"
                        >
                          Edit
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">No content</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
