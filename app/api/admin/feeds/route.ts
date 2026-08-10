import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getGmcIntegration } from '@/lib/db/gmc';
import { getDatabaseStats } from '@/lib/db/client';
import { getConfiguredGmcFeedUrl } from '@/lib/gmc/content';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [integration, dbStats] = await Promise.all([
    getGmcIntegration(),
    getDatabaseStats(),
  ]);

  const hasTokens = Boolean(integration?.access_token && integration?.refresh_token);
  const feedUrl = (() => {
    try {
      const configured = getConfiguredGmcFeedUrl();
      const stored = integration?.feed_fetch_url?.trim() || null;
      // Prefer live S3 config over a stale DB value (e.g. legacy /api/feeds/gmc).
      if (!stored || stored.includes('/api/feeds/gmc')) {
        return configured;
      }
      return stored;
    } catch {
      return integration?.feed_fetch_url ?? null;
    }
  })();

  return NextResponse.json({
    status: hasTokens ? 'connected' : 'not_configured',
    feedUrl,
    productCount: dbStats?.totalProducts ?? null,
    lastSync: dbStats?.lastSync?.completed_at ?? null,
    feeds: [
      {
        id: 'gmc',
        name: 'Google Merchant Center',
        status: hasTokens ? 'connected' : 'pending',
        lastSync: integration?.updated_at ?? null,
        merchantId: integration?.merchant_id ?? null,
        feedId: integration?.feed_id ?? null,
        feedFetchUrl: integration?.feed_fetch_url ?? feedUrl,
      },
      { id: 'facebook', name: 'Facebook Catalog', status: 'pending', lastSync: null },
      { id: 'pixel', name: 'Pixel tracking', status: 'pending', lastSync: null },
    ],
  });
}
