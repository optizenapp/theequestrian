'use client';

import { useCallback, useEffect, useState } from 'react';

type Prompt = { id: string; name: string; description: string | null; systemPrompt: string; userPrompt: string; isActive: boolean };
const blank: Prompt = { id: '', name: '', description: '', systemPrompt: '', userPrompt: '', isActive: true };

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await response.text() || fallback);
  return (await response.json()) as T;
}

export function PromptEditor() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [draft, setDraft] = useState<Prompt>(blank);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await readJson<{ prompts: Prompt[] }>(await fetch('/api/admin/social/prompts', { cache: 'no-store' }), 'Failed to load prompts');
      setPrompts(data.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy('save');
    setError('');
    try {
      await readJson(await fetch(draft.id ? `/api/admin/social/prompts/${draft.id}` : '/api/admin/social/prompts', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      }), 'Failed to save prompt');
      setDraft(blank);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setBusy('');
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await readJson(await fetch(`/api/admin/social/prompts/${id}`, { method: 'DELETE' }), 'Failed to delete prompt');
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-2">{prompts.map((prompt) => (
        <div key={prompt.id} className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="font-semibold text-gray-900">{prompt.name}</p>
          <p className="text-xs text-gray-500">{prompt.description || 'No description'}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setDraft(prompt)} className="rounded-full border px-3 py-1 text-xs font-semibold">Edit</button>
            <button type="button" disabled={busy === prompt.id} onClick={() => void remove(prompt.id)} className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700">Delete</button>
          </div>
        </div>
      ))}</div>
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-gray-900">{draft.id ? 'Edit prompt' : 'New prompt'}</h3>
        <Input label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Input label="Description" value={draft.description || ''} onChange={(value) => setDraft({ ...draft, description: value })} />
        <Text label="System prompt" value={draft.systemPrompt} onChange={(value) => setDraft({ ...draft, systemPrompt: value })} />
        <Text label="User prompt" value={draft.userPrompt} onChange={(value) => setDraft({ ...draft, userPrompt: value })} />
        <p className="text-xs text-gray-500">Variables: {'{{platform}}'}, {'{{sourceUrl}}'}, {'{{sourceTitle}}'}, {'{{sourceDescription}}'}, {'{{sourceContent}}'}</p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <button type="button" disabled={busy === 'save'} onClick={() => void save()} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white">Save prompt</button>
          <button type="button" onClick={() => setDraft(blank)} className="rounded-full border px-4 py-2 text-sm font-semibold">New</button>
        </div>
      </div>
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-gray-700">{props.label}<input value={props.value} onChange={(event) => props.onChange(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 font-normal" /></label>;
}

function Text(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-gray-700">{props.label}<textarea value={props.value} onChange={(event) => props.onChange(event.target.value)} className="mt-1 h-36 w-full rounded border border-gray-200 px-3 py-2 font-mono text-sm font-normal" /></label>;
}
