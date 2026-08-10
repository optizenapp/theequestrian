/**
 * Live Shopify Collective shipping via draftOrderCalculate + Collective Carrier Service.
 * @see https://shopify.dev/docs/apps/build/collective/shipping
 */
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { upsertCollectiveShippingRate } from '@/lib/db/collective-shipping-rates';

export const COLLECTIVE_SAMPLE_AU_ADDRESS = {
  address1: '1 George Street',
  city: 'Sydney',
  provinceCode: 'NSW',
  countryCode: 'AU',
  zip: '2000',
} as const;

export type CollectiveCalculatedRate = {
  title: string;
  amount: number;
  currencyCode: string;
};

export type CollectiveShippingQuote = {
  standard: CollectiveCalculatedRate | null;
  express: CollectiveCalculatedRate | null;
  all: CollectiveCalculatedRate[];
};

type DraftOrderCalculateResult = {
  draftOrderCalculate: {
    calculatedDraftOrder: {
      availableShippingRates: Array<{
        title: string;
        price: { amount: string; currencyCode: string };
      }> | null;
    } | null;
    userErrors: Array<{ message: string }>;
  };
};

function pickStandard(rates: CollectiveCalculatedRate[]): CollectiveCalculatedRate | null {
  const standard = rates.find((r) => /standard/i.test(r.title));
  if (standard) return standard;
  if (rates.length === 0) return null;
  return [...rates].sort((a, b) => a.amount - b.amount)[0] ?? null;
}

function pickExpress(rates: CollectiveCalculatedRate[]): CollectiveCalculatedRate | null {
  return rates.find((r) => /express/i.test(r.title)) ?? null;
}

/** Quote Collective (or shop) shipping for line items to a fixed AU address. */
export async function quoteCollectiveShipping(input: {
  lineItems: Array<{ variantId: string; quantity: number }>;
}): Promise<CollectiveShippingQuote> {
  if (input.lineItems.length === 0) {
    return { standard: null, express: null, all: [] };
  }

  const data = await shopifyAdminFetch<DraftOrderCalculateResult>({
    query: `#graphql
      mutation QuoteCollectiveShipping($input: DraftOrderInput!) {
        draftOrderCalculate(input: $input) {
          calculatedDraftOrder {
            availableShippingRates {
              title
              price { amount currencyCode }
            }
          }
          userErrors { message }
        }
      }
    `,
    variables: {
      input: {
        lineItems: input.lineItems.map((line) => ({
          variantId: line.variantId.startsWith('gid://')
            ? line.variantId
            : `gid://shopify/ProductVariant/${line.variantId}`,
          quantity: line.quantity,
        })),
        shippingAddress: { ...COLLECTIVE_SAMPLE_AU_ADDRESS },
      },
    },
  });

  if (data.draftOrderCalculate.userErrors.length > 0) {
    const message = data.draftOrderCalculate.userErrors.map((e) => e.message).join('; ');
    throw new Error(`draftOrderCalculate failed: ${message}`);
  }

  const raw = data.draftOrderCalculate.calculatedDraftOrder?.availableShippingRates || [];
  const all = raw.map((rate) => ({
    title: rate.title,
    amount: Number(rate.price.amount),
    currencyCode: rate.price.currencyCode,
  }));

  return {
    standard: pickStandard(all),
    express: pickExpress(all),
    all,
  };
}

export async function fetchAndCacheCollectiveRate(input: {
  productId: string;
  variantId: string;
  vendor: string;
  handle?: string | null;
  samplePriceAud?: number | null;
}): Promise<CollectiveShippingQuote> {
  const quote = await quoteCollectiveShipping({
    lineItems: [{ variantId: input.variantId, quantity: 1 }],
  });

  if (quote.standard) {
    await upsertCollectiveShippingRate({
      productId: input.productId,
      variantId: input.variantId,
      vendor: input.vendor,
      handle: input.handle,
      standardRateAud: quote.standard.amount,
      expressRateAud: quote.express?.amount ?? null,
      currency: quote.standard.currencyCode,
      samplePriceAud: input.samplePriceAud ?? null,
    });
  }

  return quote;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
