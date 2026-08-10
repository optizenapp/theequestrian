'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { DataTable } from '@/components/admin/DataTable';

interface FeedStatusResponse {
  status: string;
  feedUrl: string | null;
  productCount: number | null;
  lastSync: string | null;
  feeds: Array<{
    id: string;
    name: string;
    status: string;
    lastSync: string | null;
    merchantId?: string | null;
    feedId?: string | null;
    feedFetchUrl?: string | null;
  }>;
}

export default function AdminFeedsPage() {
  const [feedStatus, setFeedStatus] = useState<FeedStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState('');
  const [isSavingMerchant, setIsSavingMerchant] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCreatingFeed, setIsCreatingFeed] = useState(false);
  const [isSyncingShipping, setIsSyncingShipping] = useState(false);
  const [shippingMessage, setShippingMessage] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);

  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/feeds');
      const data = await response.json();
      setFeedStatus(data);
      const gmc = data?.feeds?.find((feed: { id: string }) => feed.id === 'gmc');
      if (gmc?.merchantId) {
        setMerchantId(gmc.merchantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    const params = new URLSearchParams(window.location.search);
    const gmc = params.get('gmc');
    const reason = params.get('reason');
    if (gmc === 'connected') {
      setOauthMessage('GMC connected — tokens saved.');
    } else if (gmc === 'error') {
      setOauthMessage(`GMC connect failed: ${reason || 'unknown error'}`);
    }
  }, []);

  const gmcFeed = useMemo(() => feedStatus?.feeds?.find((feed) => feed.id === 'gmc'), [feedStatus]);
  const feedRows = useMemo(
    () => [
      {
        id: '1',
        feed: 'Google Merchant Center',
        status: gmcFeed?.status === 'connected' ? 'Connected' : 'Needs setup',
        items: feedStatus?.productCount ? String(feedStatus.productCount) : '-',
        lastSync: gmcFeed?.lastSync ?? 'N/A',
      },
      { id: '2', feed: 'Facebook Catalog', status: 'Needs setup', items: '-', lastSync: 'N/A' },
      { id: '3', feed: 'Pixel tracking', status: 'Pending', items: '-', lastSync: 'N/A' },
    ],
    [feedStatus, gmcFeed]
  );

  const handleConnect = () => {
    window.location.href = '/api/admin/gmc/auth';
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch('/api/admin/gmc/disconnect', { method: 'POST' });
      await refreshStatus();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveMerchantId = async () => {
    if (!merchantId.trim()) {
      return;
    }
    setIsSavingMerchant(true);
    try {
      await fetch('/api/admin/gmc/merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchantId.trim() }),
      });
      await refreshStatus();
    } finally {
      setIsSavingMerchant(false);
    }
  };

  const handleCreateFeed = async () => {
    setIsCreatingFeed(true);
    setShippingMessage(null);
    try {
      const response = await fetch('/api/admin/gmc/datafeed', { method: 'POST' });
      const data = (await response.json()) as {
        error?: string;
        feedUrl?: string;
        feedId?: string;
        alreadyExists?: boolean;
      };
      if (!response.ok) {
        setShippingMessage(data.error || 'Create / sync GMC feed failed');
        return;
      }
      setShippingMessage(
        data.feedUrl
          ? `Feed ${data.alreadyExists ? 'updated' : 'created'}: ${data.feedUrl}`
          : 'Feed synced'
      );
      await refreshStatus();
    } finally {
      setIsCreatingFeed(false);
    }
  };

  const handleCopyFeedUrl = async () => {
    if (!feedStatus?.feedUrl) return;
    await navigator.clipboard.writeText(feedStatus.feedUrl);
  };

  const handleSyncShipping = async () => {
    setIsSyncingShipping(true);
    setShippingMessage(null);
    try {
      const response = await fetch('/api/admin/gmc/shipping', { method: 'POST' });
      const data = (await response.json()) as {
        error?: string;
        rateGroupCount?: number;
        defaultRateAud?: number;
      };
      if (!response.ok) {
        setShippingMessage(data.error || 'Shipping sync failed');
        return;
      }
      setShippingMessage(
        `Synced ${data.rateGroupCount ?? 0} rate groups (default $${data.defaultRateAud ?? 0} AUD)`
      );
    } finally {
      setIsSyncingShipping(false);
    }
  };

  return (
    <AdminLayout title="Marketing Feeds" subtitle="GMC, Facebook, and pixel integrations">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Feed items" value={feedStatus?.productCount?.toString() ?? '0'} helper={isLoading ? 'Loading...' : 'Ready'} />
        <StatCard label="Errors" value="0" helper="No sync errors" />
        <StatCard label="Warnings" value="0" helper="Review GMC diagnostics" />
        <StatCard label="Last sync" value={feedStatus?.lastSync ?? 'N/A'} helper="Database sync" />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Google Merchant Center</h3>
        <p className="mt-2 text-sm text-gray-600">
          Connect GMC via OAuth, set your merchant ID, and generate the scheduled fetch feed.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">OAuth connection</p>
            <p className="mt-2 text-sm text-gray-600">
              Status: {gmcFeed?.status === 'connected' ? 'Connected' : 'Not connected'}
            </p>
            {oauthMessage ? (
              <p className="mt-2 text-xs text-gray-600">{oauthMessage}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConnect}
                className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
              >
                Connect GMC
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">Merchant Center ID</p>
            <p className="mt-2 text-sm text-gray-600">Required for feed registration.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
                placeholder="123456789"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={handleSaveMerchantId}
                disabled={isSavingMerchant}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingMerchant ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-900">S3 feed URL</p>
          <p className="mt-2 text-sm text-gray-600">
            Merchant Center must fetch the S3 primary feed (headless product URLs). Not the Shopify channel feed.
          </p>
          <p className="mt-2 break-all text-sm text-gray-800">
            {feedStatus?.feedUrl ??
              'Set GMC_FEED_URL or GMC_S3_BUCKET so the S3 feed URL can be resolved.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopyFeedUrl}
              disabled={!feedStatus?.feedUrl}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy S3 feed URL
            </button>
            <button
              type="button"
              onClick={handleCreateFeed}
              disabled={isCreatingFeed}
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingFeed ? 'Creating feed...' : 'Create / sync GMC feed'}
            </button>
            <button
              type="button"
              onClick={handleSyncShipping}
              disabled={isSyncingShipping}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingShipping ? 'Syncing shipping...' : 'Sync shipping settings'}
            </button>
          </div>
          {gmcFeed?.feedId ? (
            <p className="mt-2 text-xs text-gray-500">Registered feed ID: {gmcFeed.feedId}</p>
          ) : null}
          {shippingMessage ? (
            <p className="mt-2 text-xs text-gray-600">{shippingMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          title="Feed status"
          columns={[
            { key: 'feed', header: 'Feed' },
            { key: 'status', header: 'Status' },
            { key: 'items', header: 'Items' },
            { key: 'lastSync', header: 'Last sync' },
          ]}
          rows={feedRows}
        />
      </div>
    </AdminLayout>
  );
}
