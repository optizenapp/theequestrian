import { env } from '@/lib/env';
import { getGmcIntegration, saveGmcFeedConfig } from '@/lib/db/gmc';
import { getValidAccessToken } from '@/lib/gmc/oauth';

const CONTENT_API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';

export function getGmcBaseUrl(): string {
  const baseUrl = env.GMC_BASE_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error('Missing GMC_BASE_URL or NEXT_PUBLIC_SITE_URL.');
  }
  return baseUrl.replace(/\/+$/, '');
}

export async function ensureGmcDatafeed() {
  const integration = await getGmcIntegration();
  const merchantId = integration?.merchant_id ?? env.GMC_MERCHANT_ID ?? null;
  if (!merchantId) {
    throw new Error('Missing GMC merchant ID.');
  }

  const accessToken = await getValidAccessToken();
  const feedUrl = `${getGmcBaseUrl()}/api/feeds/gmc`;
  const feedName = 'The Equestrian - Dynamic Products';

  if (integration?.feed_id && integration.feed_fetch_url === feedUrl) {
    return { feedId: integration.feed_id, feedName, feedUrl, alreadyExists: true };
  }

  const listResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Failed to list GMC datafeeds: ${errorText}`);
  }
  const listPayload = await listResponse.json() as { resources?: Array<{ id: string; fetchSchedule?: { fetchUrl?: string }; name?: string }> };
  const existing = listPayload.resources?.find((feed) => feed.fetchSchedule?.fetchUrl === feedUrl);
  if (existing?.id) {
    await saveGmcFeedConfig({ feedId: existing.id, feedName: existing.name ?? feedName, feedFetchUrl: feedUrl });
    return { feedId: existing.id, feedName: existing.name ?? feedName, feedUrl, alreadyExists: true };
  }

  const createResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: feedName,
      fileName: 'the-equestrian-gmc.xml',
      contentType: 'products',
      attributeLanguage: 'en',
      targets: [
        {
          country: 'AU',
          language: 'en',
          targetCountries: ['AU'],
        },
      ],
      fetchSchedule: {
        fetchUrl: feedUrl,
        hour: 3,
        timeZone: 'Australia/Sydney',
      },
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create GMC datafeed: ${errorText}`);
  }

  const created = await createResponse.json() as { id: string; name?: string };
  await saveGmcFeedConfig({
    feedId: created.id,
    feedName: created.name ?? feedName,
    feedFetchUrl: feedUrl,
  });

  return { feedId: created.id, feedName: created.name ?? feedName, feedUrl, alreadyExists: false };
}
