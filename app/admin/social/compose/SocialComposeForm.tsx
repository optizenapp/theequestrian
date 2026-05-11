'use client';

import { useEffect, useState } from 'react';

type Platform = 'facebook' | 'instagram' | 'youtube';
type Mode = 'manual' | 'url' | 'video';
type Prompt = { id: string; name: string; isActive: boolean };
const textPlatforms: Platform[] = ['facebook', 'instagram'];
const videoPlatforms: Platform[] = ['facebook', 'instagram', 'youtube'];

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await response.text() || fallback);
  return (await response.json()) as T;
}

export function SocialComposeForm() {
  const [mode, setMode] = useState<Mode>('manual');
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [variant, setVariant] = useState<'landscape_16_9' | 'vertical_9_16'>('vertical_9_16');
  const [sourceUrl, setSourceUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [promptTemplateId, setPromptTemplateId] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPrompts() {
      try {
        const response = await fetch('/api/admin/social/prompts', { cache: 'no-store' });
        const data = await readJson<{ prompts: Prompt[] }>(response, 'Failed to load prompts');
        setPrompts(data.prompts.filter((prompt) => prompt.isActive));
      } catch {
        setPrompts([]);
      }
    }
    void loadPrompts();
  }, []);

  async function generateFromUrl() {
    setBusy('generate');
    setError('');
    try {
      const data = await readJson<{ result: { text: string; images: string[]; sourceUrl: string } }>(
        await fetch('/api/admin/social/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl, platform, promptTemplateId: promptTemplateId || undefined }),
        }),
        'Failed to generate copy'
      );
      setContent(data.result.text);
      setSourceUrl(data.result.sourceUrl);
      setMediaUrls(data.result.images.join('\n'));
      setMessage('Generated copy and image candidates from URL.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate copy');
    } finally {
      setBusy('');
    }
  }

  async function saveDraft() {
    setBusy('save');
    setError('');
    try {
      if (mode === 'video') {
        await readJson(await fetch('/api/admin/social/url-video/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl, platform, variant, videoUrl }),
        }), 'Failed to create URL video draft');
      } else {
        await readJson(await fetch('/api/admin/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            postKind: mediaUrls.trim() ? 'image' : 'text',
            content,
            title,
            sourceUrl: sourceUrl || null,
            sourceType: mode === 'url' ? 'url_context' : 'manual',
            mediaUrls: mediaUrls.split('\n').map((item) => item.trim()).filter(Boolean),
          }),
        }), 'Failed to save draft');
      }
      setMessage('Draft saved to the social queue.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setBusy('');
    }
  }

  const mediaPreviewUrls = mediaUrls.split('\n').map((item) => item.trim()).filter(Boolean);
  function removeMediaUrl(targetUrl: string) {
    setMediaUrls(mediaPreviewUrls.filter((url) => url !== targetUrl).join('\n'));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {(['manual', 'url', 'video'] as const).map((item) => (
          <button key={item} type="button" onClick={() => {
            setMode(item);
            if (item !== 'video' && platform === 'youtube') setPlatform('facebook');
          }} className={`rounded-full border px-3 py-1 text-sm font-semibold ${mode === item ? 'border-action bg-action text-white' : 'border-gray-200 text-gray-700'}`}>
            {item === 'manual' ? 'Manual' : item === 'url' ? 'Generate from URL' : 'Create video from URL'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Platform" value={platform} onChange={(value) => setPlatform(value as Platform)} options={mode === 'video' ? videoPlatforms : textPlatforms} />
        {mode === 'url' ? <Select label="Prompt template" value={promptTemplateId} onChange={setPromptTemplateId} options={['', ...prompts.map((prompt) => prompt.id)]} labels={{ '': 'Default prompt', ...Object.fromEntries(prompts.map((prompt) => [prompt.id, prompt.name])) }} /> : null}
        {mode === 'video' ? <Select label="Video variant" value={variant} onChange={(value) => setVariant(value as 'landscape_16_9' | 'vertical_9_16')} options={['vertical_9_16', 'landscape_16_9']} /> : null}
        <label className="text-sm font-semibold text-gray-700">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 font-normal" /></label>
      </div>
      {mode !== 'manual' ? <label className="block text-sm font-semibold text-gray-700">Source URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 font-normal" /></label> : null}
      {mode === 'video' ? <label className="block text-sm font-semibold text-gray-700">Rendered video URL (optional)<input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 font-normal" /></label> : null}
      <label className="block text-sm font-semibold text-gray-700">Post copy<textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-1 h-52 w-full rounded border border-gray-200 px-3 py-2 font-mono text-sm font-normal" /></label>
      <label className="block text-sm font-semibold text-gray-700">Media URLs, one per line<textarea value={mediaUrls} onChange={(event) => setMediaUrls(event.target.value)} className="mt-1 h-24 w-full rounded border border-gray-200 px-3 py-2 font-mono text-sm font-normal" /></label>
      {mediaPreviewUrls.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {mediaPreviewUrls.slice(0, 8).map((url) => (
            <div key={url} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <a href={url} target="_blank" rel="noreferrer" className="block">
                <img src={url} alt="Media preview" className="h-28 w-full object-cover" />
              </a>
              <button type="button" onClick={() => removeMediaUrl(url)} className="w-full border-t border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        {mode === 'url' ? <button type="button" disabled={busy === 'generate'} onClick={() => void generateFromUrl()} className="rounded-full border border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700 disabled:opacity-60">Generate</button> : null}
        <button type="button" disabled={busy === 'save'} onClick={() => void saveDraft()} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save draft</button>
      </div>
    </div>
  );
}

function Select(props: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-gray-700">{props.label}<select value={props.value} onChange={(event) => props.onChange(event.target.value)} className="mt-1 w-full rounded border border-gray-200 px-3 py-2 font-normal">{props.options.map((option) => <option key={option || 'default'} value={option}>{props.labels?.[option] || option}</option>)}</select></label>;
}
