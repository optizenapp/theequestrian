import { env } from '@/lib/env';
import { getGmcIntegration, saveGmcFeedConfig } from '@/lib/db/gmc';
import { getValidAccessToken } from '@/lib/gmc/oauth';
import { getGmcS3Config } from '@/lib/gmc/s3';

const CONTENT_API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';

const FEED_NAME = 'The Equestrian - Dynamic Products';
const FEED_TIME_ZONE = 'Australia/Sydney';
/** Daily backup fetch hour (Sydney). Primary freshness uses fetchNow after each 4h upload. */
const FEED_BACKUP_HOUR = 3;

export type GmcDatafeedResult = {
  feedId: string;
  feedName: string;
  feedUrl: string;
  alreadyExists: boolean;
};

function isDeprecatedSiteFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, '') === '/api/feeds/gmc';
  } catch {
    return false;
  }
}

/** S3 primary feed URL. Ignores legacy site `/api/feeds/gmc` if set as GMC_FEED_URL. */
export function getConfiguredGmcFeedUrl(): string {
  const explicitFeedUrl = process.env.GMC_FEED_URL?.trim();
  if (explicitFeedUrl && !isDeprecatedSiteFeedUrl(explicitFeedUrl)) {
    return explicitFeedUrl;
  }

  const { bucket, region, key } = getGmcS3Config();
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${safeKey}`;
}

export function getGmcBaseUrl(): string {
  const baseUrl = env.GMC_BASE_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error('Missing GMC_BASE_URL or NEXT_PUBLIC_SITE_URL.');
  }
  return baseUrl.replace(/\/+$/, '');
}

async function getMerchantContext() {
  const integration = await getGmcIntegration();
  const merchantId = integration?.merchant_id ?? env.GMC_MERCHANT_ID ?? null;
  if (!merchantId) {
    throw new Error('Missing GMC merchant ID.');
  }
  const accessToken = await getValidAccessToken();
  return { integration, merchantId, accessToken };
}

function buildFetchSchedule(feedUrl: string) {
  return {
    fetchUrl: feedUrl,
    hour: FEED_BACKUP_HOUR,
    timeZone: FEED_TIME_ZONE,
  };
}

async function updateDatafeedSchedule(
  merchantId: string,
  accessToken: string,
  feedId: string,
  feedUrl: string
): Promise<GmcDatafeedResult> {
  const getResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds/${feedId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to get GMC datafeed: ${errorText}`);
  }

  const existing = (await getResponse.json()) as Record<string, unknown>;
  const updateResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds/${feedId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...existing,
      fetchSchedule: buildFetchSchedule(feedUrl),
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update GMC datafeed schedule: ${errorText}`);
  }

  const updated = (await updateResponse.json()) as { id: string; name?: string };
  const feedName = updated.name ?? FEED_NAME;
  await saveGmcFeedConfig({
    feedId: updated.id,
    feedName,
    feedFetchUrl: feedUrl,
  });

  return {
    feedId: updated.id,
    feedName,
    feedUrl,
    alreadyExists: true,
  };
}

export async function syncGmcDatafeedFetchSchedule(): Promise<GmcDatafeedResult> {
  const { integration, merchantId, accessToken } = await getMerchantContext();
  const feedUrl = getConfiguredGmcFeedUrl();
  const feedId = integration?.feed_id;
  if (!feedId) {
    return ensureGmcDatafeed();
  }
  return updateDatafeedSchedule(merchantId, accessToken, feedId, feedUrl);
}

/** Trigger an immediate GMC pull of the S3 feed (used after each 4h upload). */
export async function fetchGmcDatafeedNow(): Promise<{ feedId: string; ok: true }> {
  const { integration, merchantId, accessToken } = await getMerchantContext();
  const feedId = integration?.feed_id;
  if (!feedId) {
    throw new Error('Missing GMC feed ID. Create the datafeed first.');
  }

  const response = await fetch(
    `${CONTENT_API_BASE}/${merchantId}/datafeeds/${feedId}/fetchNow`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetchNow GMC datafeed: ${errorText}`);
  }

  return { feedId, ok: true };
}

export async function ensureGmcDatafeed(): Promise<GmcDatafeedResult> {
  const { integration, merchantId, accessToken } = await getMerchantContext();
  const feedUrl = getConfiguredGmcFeedUrl();

  // Always repoint the registered feed to the current S3 URL (fixes stale /api/feeds/gmc).
  if (integration?.feed_id) {
    return updateDatafeedSchedule(merchantId, accessToken, integration.feed_id, feedUrl);
  }

  const listResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Failed to list GMC datafeeds: ${errorText}`);
  }
  const listPayload = (await listResponse.json()) as {
    resources?: Array<{ id: string; fetchSchedule?: { fetchUrl?: string }; name?: string }>;
  };
  const existing = listPayload.resources?.find((feed) => feed.fetchSchedule?.fetchUrl === feedUrl);
  if (existing?.id) {
    await saveGmcFeedConfig({
      feedId: existing.id,
      feedName: existing.name ?? FEED_NAME,
      feedFetchUrl: feedUrl,
    });
    return updateDatafeedSchedule(merchantId, accessToken, existing.id, feedUrl);
  }

  const createResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/datafeeds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FEED_NAME,
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
      fetchSchedule: buildFetchSchedule(feedUrl),
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create GMC datafeed: ${errorText}`);
  }

  const created = (await createResponse.json()) as { id: string; name?: string };
  const feedName = created.name ?? FEED_NAME;
  await saveGmcFeedConfig({
    feedId: created.id,
    feedName,
    feedFetchUrl: feedUrl,
  });

  return {
    feedId: created.id,
    feedName,
    feedUrl,
    alreadyExists: false,
  };
}
