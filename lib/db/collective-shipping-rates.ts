import { sql } from '@/lib/db/client';

export type CollectiveShippingRateRow = {
  product_id: string;
  variant_id: string;
  vendor: string;
  handle: string | null;
  standard_rate_aud: number;
  express_rate_aud: number | null;
  currency: string;
  sample_price_aud: number | null;
  fetched_at: string;
};

let ensured = false;

export async function ensureCollectiveShippingRatesTable(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS collective_shipping_rates (
      variant_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      vendor TEXT NOT NULL,
      handle TEXT,
      standard_rate_aud NUMERIC(10, 2) NOT NULL,
      express_rate_aud NUMERIC(10, 2),
      currency TEXT NOT NULL DEFAULT 'AUD',
      sample_price_aud NUMERIC(10, 2),
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_collective_shipping_product ON collective_shipping_rates(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_collective_shipping_vendor ON collective_shipping_rates(vendor)`;
  ensured = true;
}

function stripGid(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}

export async function upsertCollectiveShippingRate(input: {
  productId: string;
  variantId: string;
  vendor: string;
  handle?: string | null;
  standardRateAud: number;
  expressRateAud?: number | null;
  currency?: string;
  samplePriceAud?: number | null;
}): Promise<void> {
  await ensureCollectiveShippingRatesTable();
  const productId = stripGid(input.productId);
  const variantId = stripGid(input.variantId);
  await sql`
    INSERT INTO collective_shipping_rates (
      variant_id,
      product_id,
      vendor,
      handle,
      standard_rate_aud,
      express_rate_aud,
      currency,
      sample_price_aud,
      fetched_at
    )
    VALUES (
      ${variantId},
      ${productId},
      ${input.vendor},
      ${input.handle ?? null},
      ${input.standardRateAud},
      ${input.expressRateAud ?? null},
      ${input.currency ?? 'AUD'},
      ${input.samplePriceAud ?? null},
      NOW()
    )
    ON CONFLICT (variant_id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      vendor = EXCLUDED.vendor,
      handle = EXCLUDED.handle,
      standard_rate_aud = EXCLUDED.standard_rate_aud,
      express_rate_aud = EXCLUDED.express_rate_aud,
      currency = EXCLUDED.currency,
      sample_price_aud = EXCLUDED.sample_price_aud,
      fetched_at = NOW()
  `;
}

export async function getCollectiveShippingRateByVariantId(
  variantId: string
): Promise<CollectiveShippingRateRow | null> {
  await ensureCollectiveShippingRatesTable();
  const id = stripGid(variantId);
  const rows = (await sql`
    SELECT
      product_id,
      variant_id,
      vendor,
      handle,
      standard_rate_aud::float8 AS standard_rate_aud,
      express_rate_aud::float8 AS express_rate_aud,
      currency,
      sample_price_aud::float8 AS sample_price_aud,
      fetched_at::text
    FROM collective_shipping_rates
    WHERE variant_id = ${id}
    LIMIT 1
  `) as CollectiveShippingRateRow[];
  return rows[0] ?? null;
}

export async function getCollectiveShippingRatesByVariantIds(
  variantIds: string[]
): Promise<Map<string, CollectiveShippingRateRow>> {
  await ensureCollectiveShippingRatesTable();
  const ids = [...new Set(variantIds.map(stripGid).filter(Boolean))];
  const map = new Map<string, CollectiveShippingRateRow>();
  if (ids.length === 0) return map;

  // Chunk to avoid oversized ANY() lists
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const rows = (await sql`
      SELECT
        product_id,
        variant_id,
        vendor,
        handle,
        standard_rate_aud::float8 AS standard_rate_aud,
        express_rate_aud::float8 AS express_rate_aud,
        currency,
        sample_price_aud::float8 AS sample_price_aud,
        fetched_at::text
      FROM collective_shipping_rates
      WHERE variant_id = ANY(${chunk})
    `) as CollectiveShippingRateRow[];
    for (const row of rows) {
      map.set(row.variant_id, row);
    }
  }
  return map;
}

export async function getCollectiveShippingRateByProductId(
  productId: string
): Promise<CollectiveShippingRateRow | null> {
  await ensureCollectiveShippingRatesTable();
  const id = stripGid(productId);
  const rows = (await sql`
    SELECT
      product_id,
      variant_id,
      vendor,
      handle,
      standard_rate_aud::float8 AS standard_rate_aud,
      express_rate_aud::float8 AS express_rate_aud,
      currency,
      sample_price_aud::float8 AS sample_price_aud,
      fetched_at::text
    FROM collective_shipping_rates
    WHERE product_id = ${id}
    ORDER BY fetched_at DESC
    LIMIT 1
  `) as CollectiveShippingRateRow[];
  return rows[0] ?? null;
}

/** One rate row per product (newest fetched_at wins). */
export async function getCollectiveShippingRatesByProductIds(
  productIds: string[]
): Promise<Map<string, CollectiveShippingRateRow>> {
  await ensureCollectiveShippingRatesTable();
  const ids = [...new Set(productIds.map(stripGid).filter(Boolean))];
  const map = new Map<string, CollectiveShippingRateRow>();
  if (ids.length === 0) return map;

  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const rows = (await sql`
      SELECT DISTINCT ON (product_id)
        product_id,
        variant_id,
        vendor,
        handle,
        standard_rate_aud::float8 AS standard_rate_aud,
        express_rate_aud::float8 AS express_rate_aud,
        currency,
        sample_price_aud::float8 AS sample_price_aud,
        fetched_at::text
      FROM collective_shipping_rates
      WHERE product_id = ANY(${chunk})
      ORDER BY product_id, fetched_at DESC
    `) as CollectiveShippingRateRow[];
    for (const row of rows) {
      map.set(row.product_id, row);
    }
  }
  return map;
}
