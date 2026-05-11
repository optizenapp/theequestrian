'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

type YoutubeStatus = {
  connected: boolean;
  accountLabel?: string | null;
  channelId?: string | null;
  expiresAt?: string | null;
};

type FacebookStatus = {
  connected: boolean;
  source?: 'oauth' | 'system' | null;
  accountLabel?: string | null;
  pageId?: string | null;
  expiresAt?: string | null;
  linkedInstagramId?: string | null;
  linkedInstagramUsername?: string | null;
};

export default function SocialChannelsPage() {
  const [youtubeStatus, setYoutubeStatus] = useState<YoutubeStatus>({ connected: false });
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const youtubeResponse = await fetch('/api/admin/social/youtube/status', { cache: 'no-store' });
      const youtubeData = (await youtubeResponse.json()) as YoutubeStatus & { error?: string };
      if (!youtubeResponse.ok) {
        throw new Error(youtubeData.error || 'Failed to load YouTube status');
      }
      const facebookResponse = await fetch('/api/admin/social/facebook/status', { cache: 'no-store' });
      const facebookData = (await facebookResponse.json()) as FacebookStatus & { error?: string };
      if (!facebookResponse.ok) {
        throw new Error(facebookData.error || 'Failed to load Facebook status');
      }
      setYoutubeStatus({
        connected: Boolean(youtubeData.connected),
        accountLabel: youtubeData.accountLabel,
        channelId: youtubeData.channelId,
        expiresAt: youtubeData.expiresAt,
      });
      setFacebookStatus({
        connected: Boolean(facebookData.connected),
        accountLabel: facebookData.accountLabel,
        pageId: facebookData.pageId,
        source: facebookData.source,
        expiresAt: facebookData.expiresAt,
        linkedInstagramId: facebookData.linkedInstagramId,
        linkedInstagramUsername: facebookData.linkedInstagramUsername,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channel status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function disconnectYoutube() {
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/admin/social/youtube/disconnect', { method: 'POST' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect YouTube');
      }
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect YouTube');
    } finally {
      setWorking(false);
    }
  }

  async function disconnectFacebook() {
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/admin/social/facebook/disconnect', { method: 'POST' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Facebook');
      }
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Facebook');
    } finally {
      setWorking(false);
    }
  }

  return (
    <AdminLayout title="Social Channels" subtitle="Connect publishing channels for campaign videos">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/email/campaigns" className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-action hover:text-action">
          Back to campaigns
        </Link>
      </div>
      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">YouTube</h3>
              {loading ? (
                <p className="text-sm text-gray-500">Loading status…</p>
              ) : youtubeStatus.connected ? (
                <p className="text-sm text-emerald-700">
                  Connected {youtubeStatus.accountLabel ? `as ${youtubeStatus.accountLabel}` : ''}{' '}
                  {youtubeStatus.channelId ? `(${youtubeStatus.channelId})` : ''}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not connected.</p>
              )}
            </div>
            {youtubeStatus.connected ? (
              <button
                type="button"
                onClick={() => void disconnectYoutube()}
                disabled={working || loading}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Disconnect
              </button>
            ) : (
              <a href="/api/admin/social/youtube/auth" className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600">
                Connect YouTube
              </a>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Facebook + Instagram</h3>
              {loading ? (
                <p className="text-sm text-gray-500">Loading status…</p>
              ) : facebookStatus.connected ? (
                <div className="text-sm text-emerald-700">
                  <p>
                    Facebook connected {facebookStatus.accountLabel ? `as ${facebookStatus.accountLabel}` : ''}{' '}
                    {facebookStatus.pageId ? `(${facebookStatus.pageId})` : ''}
                  </p>
                  {facebookStatus.source === 'system' ? <p className="text-gray-700">Configured via system user token.</p> : null}
                  <p className="text-gray-700">
                    Instagram:{' '}
                    {facebookStatus.linkedInstagramId
                      ? `${facebookStatus.linkedInstagramUsername ? `@${facebookStatus.linkedInstagramUsername}` : facebookStatus.linkedInstagramId}`
                      : 'No linked Instagram business account found for selected page'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not connected.</p>
              )}
            </div>
            {facebookStatus.connected && facebookStatus.source === 'system' ? (
              <button type="button" disabled className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-400">
                Env configured
              </button>
            ) : facebookStatus.connected ? (
              <button
                type="button"
                onClick={() => void disconnectFacebook()}
                disabled={working || loading}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Disconnect
              </button>
            ) : (
              <a href="/api/admin/social/facebook/auth" className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600">
                Connect Facebook
              </a>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">X (Twitter)</h3>
              <p className="text-sm text-gray-500">Coming soon.</p>
            </div>
            <button type="button" disabled className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-400">
              Coming soon
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
