import { env } from '@/lib/env';
import { getGmcIntegration } from '@/lib/db/gmc';
import { sql } from '@/lib/db/client';
import { ensureCollectiveShippingRatesTable } from '@/lib/db/collective-shipping-rates';
import { formatShippingLabel } from '@/lib/gmc/feed-shipping';
import { getValidAccessToken } from '@/lib/gmc/oauth';

const CONTENT_API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';
const SERVICE_NAME = 'Standard AU';

type ShippingSettingsResource = {
  accountId?: string | number;
  services?: Array<Record<string, unknown>>;
  postalCodeGroups?: Array<Record<string, unknown>>;
  warehouses?: Array<Record<string, unknown>>;
};

function getDefaultShippingAud(): number {
  const raw = process.env.GMC_DEFAULT_SHIPPING_AUD?.trim();
  if (!raw) return 15;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 15;
}

function rateGroupForLabel(label: string, rateAud: number) {
  return {
    applicableShippingLabels: [label],
    singleValue: {
      flatRate: {
        value: rateAud.toFixed(2),
        currency: 'AUD',
      },
    },
  };
}

async function loadCollectiveRateBuckets(): Promise<Array<{ label: string; rateAud: number }>> {
  await ensureCollectiveShippingRatesTable();
  const rows = (await sql`
    SELECT DISTINCT standard_rate_aud::float8 AS rate
    FROM collective_shipping_rates
    ORDER BY rate
  `) as Array<{ rate: number }>;

  const bucketMap = new Map<string, number>();
  bucketMap.set('free', 0);
  for (const row of rows) {
    if (!Number.isFinite(row.rate)) continue;
    bucketMap.set(formatShippingLabel(row.rate), row.rate);
  }
  return [...bucketMap.entries()]
    .map(([label, rateAud]) => ({ label, rateAud }))
    .sort((a, b) => a.rateAud - b.rateAud || a.label.localeCompare(b.label));
}

export async function syncGmcShippingSettings() {
  const integration = await getGmcIntegration();
  const merchantId = integration?.merchant_id ?? env.GMC_MERCHANT_ID ?? null;
  if (!merchantId) {
    throw new Error('Missing GMC merchant ID.');
  }

  const accessToken = await getValidAccessToken();
  const buckets = await loadCollectiveRateBuckets();
  const defaultRate = getDefaultShippingAud();

  const rateGroups = [
    ...buckets.map((bucket) => rateGroupForLabel(bucket.label, bucket.rateAud)),
    rateGroupForLabel('unmapped', defaultRate),
  ];

  const seen = new Set<string>();
  const uniqueRateGroups = rateGroups.filter((group) => {
    const label = group.applicableShippingLabels[0];
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });

  const getResponse = await fetch(
    `${CONTENT_API_BASE}/${merchantId}/shippingsettings/${merchantId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let existing: ShippingSettingsResource = {};
  if (getResponse.ok) {
    existing = (await getResponse.json()) as ShippingSettingsResource;
  } else if (getResponse.status !== 404) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to get GMC shipping settings: ${errorText}`);
  }

  const otherServices = (existing.services || []).filter((service) => {
    const name = typeof service.name === 'string' ? service.name : '';
    return name !== SERVICE_NAME;
  });

  const standardService = {
    name: SERVICE_NAME,
    active: true,
    deliveryCountry: 'AU',
    currency: 'AUD',
    deliveryTime: {
      minTransitTimeInDays: 2,
      maxTransitTimeInDays: 8,
      minHandlingTimeInDays: 1,
      maxHandlingTimeInDays: 2,
    },
    rateGroups: uniqueRateGroups,
  };

  const payload: ShippingSettingsResource = {
    ...existing,
    accountId: merchantId,
    services: [...otherServices, standardService],
  };

  const updateResponse = await fetch(
    `${CONTENT_API_BASE}/${merchantId}/shippingsettings/${merchantId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update GMC shipping settings: ${errorText}`);
  }

  return {
    ok: true as const,
    serviceName: SERVICE_NAME,
    rateGroupCount: uniqueRateGroups.length,
    defaultRateAud: defaultRate,
    labels: uniqueRateGroups.map((group) => group.applicableShippingLabels[0]),
  };
}
