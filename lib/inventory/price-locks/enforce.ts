import { neon } from '@neondatabase/serverless';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const SHOPIFY_API_VERSION = '2024-01';

const sql = neon(DATABASE_URL);

type LockRow = {
  variant_id: string;
  product_id: string;
  product_handle: string | null;
  locked_price: string | number;
  locked_compare_at: string | number | null;
};

type ShopifyVariant = {
  id: number;
  price: string;
  compare_at_price: string | null;
};

export interface EnforcementResult {
  scanned: number;
  reverted: number;
  unchanged: number;
  errors: number;
  details: Array<
    | { variantId: string; status: 'reverted'; previousPrice: string; newPrice: string }
    | { variantId: string; status: 'unchanged'; price: string }
    | { variantId: string; status: 'error'; error: string }
  >;
}

async function fetchVariant(variantId: string): Promise<ShopifyVariant | null> {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify GET variant ${response.status}: ${text.slice(0, 300)}`);
  }
  const json = (await response.json()) as { variant: ShopifyVariant };
  return json.variant;
}

async function putVariantPrice(
  variantId: string,
  price: string,
  compareAtPrice: string | null
): Promise<void> {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variant: {
        id: Number(variantId),
        price,
        compare_at_price: compareAtPrice,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify PUT variant ${response.status}: ${text.slice(0, 300)}`);
  }
}

function priceDiffers(currentRaw: string | null | undefined, target: number | null): boolean {
  if (target == null) {
    if (currentRaw == null || String(currentRaw).trim() === '') return false;
    const parsed = parseFloat(String(currentRaw));
    if (Number.isNaN(parsed)) return false;
    return Math.abs(parsed) > 0.005;
  }
  if (currentRaw == null) return true;
  const parsed = parseFloat(String(currentRaw));
  if (Number.isNaN(parsed)) return true;
  return Math.abs(parsed - target) > 0.005;
}

/**
 * Scan every row in marketplace_price_locks. For any variant where the live
 * Shopify price (or compare-at) has drifted from the locked value, push the
 * locked value back via the Admin API. Idempotent - matching variants are
 * left alone.
 */
export async function enforceAllPriceLocks(): Promise<EnforcementResult> {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are required');
  }
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const rows = (await sql`
    SELECT variant_id, product_id, product_handle, locked_price, locked_compare_at
    FROM marketplace_price_locks
  `) as LockRow[];

  const result: EnforcementResult = {
    scanned: rows.length,
    reverted: 0,
    unchanged: 0,
    errors: 0,
    details: [],
  };

  for (const row of rows) {
    const variantId = String(row.variant_id);
    const lockedPrice = Number(row.locked_price);
    const lockedCompareAt =
      row.locked_compare_at == null ? null : Number(row.locked_compare_at);
    if (Number.isNaN(lockedPrice)) {
      result.errors += 1;
      result.details.push({
        variantId,
        status: 'error',
        error: `Invalid locked_price for variant ${variantId}`,
      });
      continue;
    }

    try {
      const variant = await fetchVariant(variantId);
      if (!variant) {
        result.errors += 1;
        result.details.push({
          variantId,
          status: 'error',
          error: 'variant_not_found',
        });
        continue;
      }

      const drifted =
        priceDiffers(variant.price, lockedPrice) ||
        priceDiffers(variant.compare_at_price, lockedCompareAt);

      if (!drifted) {
        result.unchanged += 1;
        result.details.push({ variantId, status: 'unchanged', price: variant.price });
        continue;
      }

      const targetPrice = lockedPrice.toFixed(2);
      const targetCompareAt = lockedCompareAt != null ? lockedCompareAt.toFixed(2) : null;
      await putVariantPrice(variantId, targetPrice, targetCompareAt);

      result.reverted += 1;
      result.details.push({
        variantId,
        status: 'reverted',
        previousPrice: variant.price,
        newPrice: targetPrice,
      });
      console.log(
        `[price-lock-watchdog] Reverted variant ${variantId} ($${variant.price} → $${targetPrice})`
      );
    } catch (error) {
      result.errors += 1;
      result.details.push({
        variantId,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[price-lock-watchdog] Failed variant ${variantId}`, error);
    }
  }

  return result;
}
