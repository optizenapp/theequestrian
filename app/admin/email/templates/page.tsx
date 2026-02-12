'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

type TemplateRow = {
  id: string;
  name: string;
  templateType: string;
  activeVersionId: string | null;
};

const defaultHtml = `<div style="font-family:Arial,sans-serif;">
  <h2>Hello {{customerName}}</h2>
  <p>Thanks for being part of The Equestrian community.</p>
  <p><a href="{{siteUrl}}">Visit our store</a></p>
</div>`;

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [name, setName] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('News from The Equestrian');
  const [htmlTemplate, setHtmlTemplate] = useState(defaultHtml);
  const [error, setError] = useState('');

  async function loadTemplates() {
    const response = await fetch('/api/admin/email/templates');
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to load templates');
    setTemplates(Array.isArray(data.templates) ? data.templates : []);
  }

  useEffect(() => {
    loadTemplates().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load templates'));
  }, []);

  return (
    <AdminLayout title="Email Templates" subtitle="Reusable block/HTML templates for campaigns and sequences">
      <div className="mb-4">
        <Link href="/admin/email" className="text-sm font-semibold text-action hover:underline">← Back to Email Platform</Link>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Create template</h3>
        <div className="mt-3 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={subjectTemplate} onChange={(e) => setSubjectTemplate(e.target.value)} placeholder="Subject template" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={htmlTemplate} onChange={(e) => setHtmlTemplate(e.target.value)} rows={8} className="rounded border border-gray-300 px-3 py-2 text-sm font-mono" />
          <button
            type="button"
            className="w-fit rounded bg-action px-4 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              const response = await fetch('/api/admin/email/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, subjectTemplate, htmlTemplate, templateType: 'campaign' }),
              });
              const data = await response.json();
              if (!response.ok) {
                setError(data?.error || 'Failed to create template');
                return;
              }
              setName('');
              await loadTemplates();
            }}
          >
            Create template
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Active Version</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{template.name}</td>
                <td className="px-3 py-2">{template.templateType}</td>
                <td className="px-3 py-2">{template.activeVersionId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
