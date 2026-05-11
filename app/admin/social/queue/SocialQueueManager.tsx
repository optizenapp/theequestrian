'use client';

import { useCallback, useEffect, useState } from 'react';

type Post = {
  id: string;
  platform: string;
  postKind: string;
  variant: string | null;
  status: string;
  content: string;
  title: string | null;
  mediaUrls: string[];
  sourceUrl: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await response.text() || fallback);
  return (await response.json()) as T;
}

export function SocialQueueManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await readJson<{ posts: Post[] }>(await fetch('/api/admin/social/posts', { cache: 'no-store' }), 'Failed to load queue');
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateLocal(id: string, patch: Partial<Post>) {
    setPosts((current) => current.map((post) => post.id === id ? { ...post, ...patch } : post));
  }

  async function action(id: string, label: string, request: () => Promise<void>) {
    setBusy(`${label}-${id}`);
    setError('');
    try {
      await request();
      await load();
    } catch (err) {
      try {
        const data = await readJson<{ posts: Post[] }>(await fetch('/api/admin/social/posts', { cache: 'no-store' }), 'Failed to refresh queue');
        setPosts(data.posts);
        const latest = data.posts.find((post) => post.id === id);
        if (label === 'publish' && latest?.status === 'published') {
          setError('');
          return;
        }
      } catch {
        // Keep the original action error if the refresh also fails.
      }
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {posts.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">No social drafts yet.</div> : null}
      {posts.map((post) => {
        const isUnsupportedYoutubeText = post.platform === 'youtube' && post.postKind !== 'video';
        return (
        <div key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{post.platform} / {post.postKind}{post.variant ? ` / ${post.variant}` : ''}</p>
              <p className="text-xs text-gray-500">Status: {post.status}</p>
              {post.sourceUrl ? <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">Source URL</a> : null}
            </div>
            {post.externalUrl ? <a href={post.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">View live post</a> : null}
          </div>
          <label className="mb-2 block text-xs font-semibold text-gray-600">Title<input value={post.title || ''} onChange={(event) => updateLocal(post.id, { title: event.target.value })} className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm font-normal" /></label>
          <label className="mb-2 block text-xs font-semibold text-gray-600">Copy<textarea value={post.content} onChange={(event) => updateLocal(post.id, { content: event.target.value })} className="mt-1 h-32 w-full rounded border border-gray-200 px-2 py-1 font-mono text-sm font-normal" /></label>
          <label className="mb-2 block text-xs font-semibold text-gray-600">Media URLs<textarea value={post.mediaUrls.join('\n')} onChange={(event) => updateLocal(post.id, { mediaUrls: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="mt-1 h-20 w-full rounded border border-gray-200 px-2 py-1 font-mono text-sm font-normal" /></label>
          {post.mediaUrls.length ? (
            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {post.mediaUrls.slice(0, 10).map((url) => (
                <div key={url} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={url} alt="Media preview" className="h-24 w-full object-cover" />
                  </a>
                  <button
                    type="button"
                    onClick={() => updateLocal(post.id, { mediaUrls: post.mediaUrls.filter((item) => item !== url) })}
                    className="w-full border-t border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {isUnsupportedYoutubeText ? <p className="mb-2 text-xs text-amber-700">YouTube text/community posts cannot be published through the official API. Create a YouTube video/Shorts draft instead.</p> : null}
          {post.status !== 'published' && post.errorMessage && !isUnsupportedYoutubeText ? <p className="mb-2 text-xs text-red-700">{post.errorMessage}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy === `save-${post.id}`} onClick={() => void action(post.id, 'save', async () => {
              await readJson(await fetch(`/api/admin/social/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: post.title, content: post.content, mediaUrls: post.mediaUrls }),
              }), 'Failed to save post');
            })} className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-60">Save</button>
            <button type="button" disabled={isUnsupportedYoutubeText || post.status === 'published' || busy === `publish-${post.id}`} onClick={() => void action(post.id, 'publish', async () => {
              await readJson(await fetch(`/api/admin/social/posts/${post.id}/publish`, { method: 'POST' }), 'Failed to publish post');
            })} className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60">
              {post.status === 'published' ? 'Published' : isUnsupportedYoutubeText ? 'Not supported' : 'Publish'}
            </button>
            <button type="button" disabled={busy === `delete-${post.id}`} onClick={() => void action(post.id, 'delete', async () => {
              await readJson(await fetch(`/api/admin/social/posts/${post.id}`, { method: 'DELETE' }), 'Failed to delete post');
            })} className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-60">Delete</button>
          </div>
        </div>
      );
      })}
    </div>
  );
}
