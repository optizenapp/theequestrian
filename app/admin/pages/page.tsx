'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface StaticPageRow {
  slug: string;
  title: string;
  status: string;
  updated_at?: string;
}

const defaultPages = [
  { slug: 'about', title: 'About' },
  { slug: 'contact', title: 'Contact' },
  { slug: 'faq', title: 'FAQ' },
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-of-service', title: 'Terms of Service' },
  { slug: 'returns-refunds', title: 'Returns & Refunds' },
  { slug: 'shipping-delivery', title: 'Shipping & Delivery' },
];

export default function AdminStaticPagesPage() {
  const [pages, setPages] = useState<StaticPageRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await fetch('/api/admin/static-pages');
      const data = await response.json();
      const existing = data.pages || [];
      const map = new Map(existing.map((page: StaticPageRow) => [page.slug, page]));
      const merged = defaultPages.map((page) => map.get(page.slug) || { ...page, status: 'missing' });
      setPages([...merged, ...existing.filter((page: StaticPageRow) => !map.has(page.slug))]);
    } catch (error) {
      console.error('Failed to load static pages:', error);
    }
  };

  const handleCreate = async () => {
    if (!slug.trim() || !title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/static-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title }),
      });
      if (response.ok) {
        setSlug('');
        setTitle('');
        setShowCreate(false);
        loadPages();
      } else {
        const data = await response.json();
        alert(data?.error || 'Failed to create page');
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Static Pages" subtitle="Edit SEO and HTML content for static pages">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Static Pages</h2>
          <p className="text-sm text-gray-500">Manage About, FAQ, policy, and contact pages.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? 'Close' : 'New Page'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Create Static Page</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Slug</label>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="about"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="About The Equestrian"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Page'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {pages.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No pages found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.slug} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">/{page.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{page.title || 'Untitled'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{page.status}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <Link href={`/admin/pages/${page.slug}`} className="text-action hover:text-pink-700">
                        Edit
                      </Link>
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
