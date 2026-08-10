import { env } from '@/lib/env';
import { getGmcIntegration } from '@/lib/db/gmc';
import { getValidAccessToken } from '@/lib/gmc/oauth';

const CONTENT_API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';

/** Refuse cleanup if the feed looks empty/broken. */
export const GMC_CLEANUP_MIN_FEED_ITEMS = 1000;

type GmcProduct = {
  id?: string;
  offerId?: string;
  channel?: string;
  contentLanguage?: string;
  targetCountry?: string;
};

function isOurOfferId(offerId: string): boolean {
  // Custom S3 feed uses bare Shopify variant numeric IDs.
  return /^\d{8,}$/.test(offerId);
}

async function listAllGmcProducts(merchantId: string, accessToken: string): Promise<GmcProduct[]> {
  const products: GmcProduct[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${CONTENT_API_BASE}/${merchantId}/products`);
    url.searchParams.set('maxResults', '250');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list GMC products: ${errorText}`);
    }

    const payload = (await response.json()) as {
      resources?: GmcProduct[];
      nextPageToken?: string;
    };
    products.push(...(payload.resources || []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return products;
}

export async function cleanupStaleGmcOffers(input: {
  feedVariantIds: string[];
  itemCount: number;
  dryRun?: boolean;
}) {
  if (input.itemCount < GMC_CLEANUP_MIN_FEED_ITEMS) {
    return {
      skipped: true as const,
      reason: `Feed itemCount ${input.itemCount} below floor ${GMC_CLEANUP_MIN_FEED_ITEMS}`,
      listed: 0,
      stale: 0,
      deleted: 0,
      dryRun: Boolean(input.dryRun),
    };
  }

  const integration = await getGmcIntegration();
  const merchantId = integration?.merchant_id ?? env.GMC_MERCHANT_ID ?? null;
  if (!merchantId) {
    throw new Error('Missing GMC merchant ID.');
  }

  const accessToken = await getValidAccessToken();
  const feedIds = new Set(input.feedVariantIds);
  const products = await listAllGmcProducts(merchantId, accessToken);

  const stale = products.filter((product) => {
    const offerId = product.offerId || '';
    if (!isOurOfferId(offerId)) return false;
    return !feedIds.has(offerId);
  });

  if (input.dryRun) {
    return {
      skipped: false as const,
      listed: products.length,
      stale: stale.length,
      deleted: 0,
      dryRun: true as const,
      sampleOfferIds: stale.slice(0, 20).map((product) => product.offerId).filter(Boolean),
    };
  }

  let deleted = 0;
  const errors: string[] = [];

  // Content API custombatch max 1000; use smaller chunks.
  const chunkSize = 100;
  for (let i = 0; i < stale.length; i += chunkSize) {
    const chunk = stale.slice(i, i + chunkSize);
    const entries = chunk.map((product, index) => ({
      batchId: i + index,
      merchantId,
      method: 'delete',
      productId: product.id,
    }));

    const batchResponse = await fetch(`${CONTENT_API_BASE}/${merchantId}/products/custombatch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries }),
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      errors.push(errorText);
      continue;
    }

    const batchPayload = (await batchResponse.json()) as {
      entries?: Array<{ errors?: { message?: string }; product?: unknown }>;
    };
    for (const entry of batchPayload.entries || []) {
      if (entry.errors) {
        errors.push(entry.errors.message || 'Unknown delete error');
      } else {
        deleted += 1;
      }
    }
  }

  return {
    skipped: false as const,
    listed: products.length,
    stale: stale.length,
    deleted,
    dryRun: false as const,
    errorCount: errors.length,
    sampleErrors: errors.slice(0, 5),
  };
}
