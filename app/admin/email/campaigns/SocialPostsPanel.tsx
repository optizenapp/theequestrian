'use client';

import { useCallback, useEffect, useState } from 'react';

type Channel = 'youtube' | 'facebook' | 'instagram';
type YoutubeCopy = { variant: 'landscape_16_9' | 'vertical_9_16'; title: string; description: string; tags: string[]; hashtags: string[] };
type MetaCopy = { variant: 'landscape_16_9' | 'vertical_9_16'; title: string; caption: string; hashtags?: string[] };
type SocialPost = { id: string; variant: 'landscape_16_9' | 'vertical_9_16'; status: string; copyJson: Record<string, unknown>; externalUrl: string | null; errorMessage: string | null };
type Props = { campaignId: string; videoStatus: string | null };
const CHANNELS: Array<{ key: Channel; label: string }> = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
];

export function SocialPostsPanel({ campaignId, videoStatus }: Props) {
  const [channel, setChannel] = useState<Channel>('youtube');
  const [postsByChannel, setPostsByChannel] = useState<Record<Channel, SocialPost[]>>({ youtube: [], facebook: [], instagram: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async (target: Channel = channel) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}/social/${target}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load social posts');
      setPostsByChannel((prev) => ({ ...prev, [target]: Array.isArray(data?.posts) ? (data.posts as SocialPost[]) : [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social posts');
    } finally {
      setLoading(false);
    }
  }, [campaignId, channel]);

  useEffect(() => {
    if (videoStatus === 'approved') void loadPosts();
  }, [videoStatus, channel, loadPosts]);

  async function runAction(key: string, request: () => Promise<void>) {
    setBusy(key);
    setError('');
    try {
      await request();
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  async function patchCopy(postId: string, copy: YoutubeCopy | MetaCopy) {
    const response = await fetch(`/api/admin/email/campaigns/${campaignId}/social/${channel}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, copy }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to save copy');
  }

  if (videoStatus !== 'approved') return null;
  const posts = postsByChannel[channel];
  const hasPosts = posts.length > 0;
  const buildLabel = channel === 'youtube' ? 'Build YouTube posts' : `Build ${CHANNELS.find((item) => item.key === channel)?.label} post`;
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-900">Social Publishing</summary>
      <div className="mt-2 mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-700">Video approved. You can now build and publish social posts.</p>
        <a href="/admin/social/accounts" className="text-xs text-blue-700 underline">Manage channels</a>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {CHANNELS.map((item) => (
          <button key={item.key} type="button" onClick={() => setChannel(item.key)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${channel === item.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
            {item.label}
          </button>
        ))}
      </div>
      {error ? <p className="mb-2 text-xs text-red-700">{error}</p> : null}
      {!hasPosts ? (
        <button
          type="button"
          disabled={loading || busy === 'build'}
          onClick={() => void runAction('build', async () => {
            const response = await fetch(`/api/admin/email/campaigns/${campaignId}/social/${channel}/build`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || `Failed to build ${channel} posts`);
          })}
          className="rounded-full border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-700 hover:border-indigo-500 disabled:opacity-60"
        >
          {busy === 'build' ? 'Building…' : buildLabel}
        </button>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {posts.map((post) => {
            const copy = post.copyJson as YoutubeCopy & MetaCopy;
            const isYoutube = channel === 'youtube';
            return (
              <div key={post.id} className="rounded-lg border border-gray-200 bg-white p-2">
                <p className="text-xs font-semibold text-gray-700">
                  {isYoutube ? (post.variant === 'vertical_9_16' ? 'YouTube Shorts (9:16)' : 'YouTube Landscape (16:9)') : CHANNELS.find((item) => item.key === channel)?.label}
                </p>
                <p className="mb-1 text-xs text-gray-500">Status: {post.status}</p>
                <input className="mb-1 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={copy.title || ''} onChange={(e) => setPostsByChannel((prev) => ({ ...prev, [channel]: prev[channel].map((it) => it.id === post.id ? { ...it, copyJson: { ...copy, title: e.target.value } } : it) }))} />
                <textarea className="mb-1 h-56 w-full rounded border border-gray-200 px-2 py-1 font-mono text-[11px] leading-snug" value={(isYoutube ? copy.description : copy.caption) || ''} onChange={(e) => setPostsByChannel((prev) => ({ ...prev, [channel]: prev[channel].map((it) => it.id === post.id ? { ...it, copyJson: { ...copy, [isYoutube ? 'description' : 'caption']: e.target.value } } : it) }))} />
                {isYoutube ? <input className="mb-2 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={Array.isArray(copy.tags) ? copy.tags.join(', ') : ''} onChange={(e) => setPostsByChannel((prev) => ({ ...prev, [channel]: prev[channel].map((it) => it.id === post.id ? { ...it, copyJson: { ...copy, tags: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } } : it) }))} /> : null}
                <div className="flex flex-wrap gap-1">
                  <button type="button" disabled={busy === `save-${post.id}`} onClick={() => void runAction(`save-${post.id}`, async () => {
                    await patchCopy(post.id, copy);
                  })} className="rounded-full border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-60">{busy === `save-${post.id}` ? 'Saving…' : 'Save'}</button>
                  <button type="button" disabled={busy === `regen-${post.id}`} onClick={() => void runAction(`regen-${post.id}`, async () => {
                    const response = await fetch(`/api/admin/email/campaigns/${campaignId}/social/${channel}/regenerate-copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variant: post.variant }) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data?.error || 'Failed to regenerate copy');
                  })} className="rounded-full border border-purple-300 px-2 py-1 text-[11px] font-semibold text-purple-700 disabled:opacity-60">{busy === `regen-${post.id}` ? 'Regenerating…' : 'Regenerate copy'}</button>
                  <button type="button" disabled={busy === `pub-${post.id}`} onClick={() => void runAction(`pub-${post.id}`, async () => {
                    const response = await fetch(`/api/admin/email/campaigns/${campaignId}/social/${channel}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variant: post.variant }) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data?.error || `Failed to publish to ${channel}`);
                  })} className="rounded-full border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 disabled:opacity-60">{busy === `pub-${post.id}` ? 'Publishing…' : `Publish to ${CHANNELS.find((item) => item.key === channel)?.label}`}</button>
                </div>
                {post.externalUrl ? <a href={post.externalUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-blue-700 underline">View live post</a> : null}
                {post.errorMessage ? <p className="mt-1 text-xs text-red-700">{post.errorMessage}</p> : null}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">X publishing cards are next.</p>
    </details>
  );
}
