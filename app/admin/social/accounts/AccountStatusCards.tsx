'use client';

import { useCallback, useEffect, useState } from 'react';

type YoutubeStatus = { connected: boolean; accountLabel?: string | null; channelId?: string | null };
type FacebookStatus = {
  connected: boolean;
  source?: 'oauth' | 'system' | null;
  accountLabel?: string | null;
  pageId?: string | null;
  linkedInstagramId?: string | null;
  linkedInstagramUsername?: string | null;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || fallback);
  }
  return (await response.json()) as T;
}

export function AccountStatusCards() {
  const [youtube, setYoutube] = useState<YoutubeStatus>({ connected: false });
  const [facebook, setFacebook] = useState<FacebookStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [youtubeResponse, facebookResponse] = await Promise.all([
        fetch('/api/admin/social/youtube/status', { cache: 'no-store' }),
        fetch('/api/admin/social/facebook/status', { cache: 'no-store' }),
      ]);
      setYoutube(await readJson<YoutubeStatus>(youtubeResponse, 'Failed to load YouTube status'));
      setFacebook(await readJson<FacebookStatus>(facebookResponse, 'Failed to load Facebook status'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect(path: string, label: string) {
    setWorking(label);
    setError('');
    try {
      await readJson<{ ok?: boolean }>(await fetch(path, { method: 'POST' }), `Failed to disconnect ${label}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to disconnect ${label}`);
    } finally {
      setWorking('');
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <AccountCard
        title="Facebook Page"
        status={loading ? 'Loading...' : facebook.connected ? `Connected ${facebook.accountLabel || facebook.pageId || ''}` : 'Not connected'}
        detail={facebook.source === 'system' ? 'Configured via system user token.' : 'Publishes page feed/video posts.'}
        action={facebook.connected ? 'Disconnect' : 'Connect Facebook'}
        href={facebook.connected ? undefined : '/api/admin/social/facebook/auth'}
        disabled={working === 'Facebook' || loading || facebook.source === 'system'}
        onClick={facebook.connected && facebook.source !== 'system' ? () => void disconnect('/api/admin/social/facebook/disconnect', 'Facebook') : undefined}
      />
      <AccountCard
        title="Instagram Business"
        status={loading ? 'Loading...' : facebook.linkedInstagramId ? `Ready @${facebook.linkedInstagramUsername || facebook.linkedInstagramId}` : 'No linked Instagram account found'}
        detail="Requires a linked Instagram Business or Creator account on the Facebook Page."
        action={facebook.connected ? 'Uses Facebook connection' : 'Connect Facebook'}
        href={facebook.connected ? undefined : '/api/admin/social/facebook/auth'}
        disabled={loading || facebook.connected}
      />
      <AccountCard
        title="YouTube + Shorts"
        status={loading ? 'Loading...' : youtube.connected ? `Connected ${youtube.accountLabel || youtube.channelId || ''}` : 'Not connected'}
        detail="Video uploads are supported; text/community posting depends on channel/API capability."
        action={youtube.connected ? 'Disconnect' : 'Connect YouTube'}
        href={youtube.connected ? undefined : '/api/admin/social/youtube/auth'}
        disabled={working === 'YouTube' || loading}
        onClick={youtube.connected ? () => void disconnect('/api/admin/social/youtube/disconnect', 'YouTube') : undefined}
      />
    </div>
  );
}

function AccountCard(props: {
  title: string;
  status: string;
  detail: string;
  action: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const buttonClass = 'rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{props.title}</h3>
          <p className="text-sm text-emerald-700">{props.status}</p>
          <p className="text-xs text-gray-500">{props.detail}</p>
        </div>
        {props.href ? <a href={props.href} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white">{props.action}</a> : (
          <button type="button" disabled={props.disabled} onClick={props.onClick} className={buttonClass}>{props.action}</button>
        )}
      </div>
    </div>
  );
}
