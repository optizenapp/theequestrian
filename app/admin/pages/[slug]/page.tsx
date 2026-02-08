'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { HtmlEditor } from '@/components/admin/HtmlEditor';

interface StaticPageDetail {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  intro_html: string | null;
  body_html: string | null;
  bottom_html: string | null;
  status: string | null;
}

export default function AdminStaticPageDetail({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [page, setPage] = useState<StaticPageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/static-pages/${params.slug}`);
      const data = await response.json();
      setPage(data.page);
    } catch (error) {
      console.error('Failed to load page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/static-pages/${params.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || 'Failed to save');
        return;
      }
      const data = await response.json();
      setPage(data.page);
    } catch (error) {
      console.error('Failed to save page:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this static page entry?')) return;
    try {
      const response = await fetch(`/api/admin/static-pages/${params.slug}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/admin/pages');
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Static Page">
        <div className="py-24 text-center text-gray-600">Loading page...</div>
      </AdminLayout>
    );
  }

  if (!page) {
    return (
      <AdminLayout title="Static Page">
        <div className="py-24 text-center text-gray-600">Page not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Static Page" subtitle={`/${page.slug}`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              value={page.title}
              onChange={(event) => setPage({ ...page, title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={page.status || 'published'}
              onChange={(event) => setPage({ ...page, status: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Title</label>
            <input
              value={page.meta_title || ''}
              onChange={(event) => setPage({ ...page, meta_title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Meta Description</label>
            <input
              value={page.meta_description || ''}
              onChange={(event) => setPage({ ...page, meta_description: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Intro HTML</label>
            <HtmlEditor value={page.intro_html || ''} onChange={(value) => setPage({ ...page, intro_html: value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Body HTML</label>
            <HtmlEditor value={page.body_html || ''} onChange={(value) => setPage({ ...page, body_html: value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Bottom HTML</label>
            <HtmlEditor value={page.bottom_html || ''} onChange={(value) => setPage({ ...page, bottom_html: value })} />
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
              onClick={() => router.push('/admin/pages')}
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
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
