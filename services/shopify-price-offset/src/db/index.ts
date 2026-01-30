import { Pool } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.database.url,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS shopify_price_audit (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        vendor_name TEXT,
        tags TEXT[],
        shopify_price NUMERIC(10, 2) NOT NULL,
        shopify_compare_at NUMERIC(10, 2),
        shipping_offset NUMERIC(10, 2),
        adjusted_price NUMERIC(10, 2),
        adjusted_compare_at NUMERIC(10, 2),
        tag_match TEXT,
        last_source TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(variant_id)
      );

      CREATE INDEX IF NOT EXISTS idx_shopify_audit_product ON shopify_price_audit(product_id);
      CREATE INDEX IF NOT EXISTS idx_shopify_audit_variant ON shopify_price_audit(variant_id);
      CREATE INDEX IF NOT EXISTS idx_shopify_audit_updated ON shopify_price_audit(updated_at);
    `);
    console.log('[DB] Tables initialized');
  } finally {
    client.release();
  }
}

export interface AuditRecord {
  variantId: string;
  productId: string;
  vendorName: string | null;
  tags: string[];
  shopifyPrice: number;
  shopifyCompareAt?: number;
  shippingOffset: number | null;
  adjustedPrice: number | null;
  adjustedCompareAt: number | null;
  tagMatch: string | null;
  lastSource: string;
}

export async function upsertAudit(record: AuditRecord): Promise<void> {
  await pool.query(
    `
      INSERT INTO shopify_price_audit (
        variant_id, product_id, vendor_name, tags,
        shopify_price, shopify_compare_at, shipping_offset,
        adjusted_price, adjusted_compare_at, tag_match, last_source, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (variant_id) DO UPDATE SET
        vendor_name = EXCLUDED.vendor_name,
        tags = EXCLUDED.tags,
        shopify_price = EXCLUDED.shopify_price,
        shopify_compare_at = EXCLUDED.shopify_compare_at,
        shipping_offset = EXCLUDED.shipping_offset,
        adjusted_price = EXCLUDED.adjusted_price,
        adjusted_compare_at = EXCLUDED.adjusted_compare_at,
        tag_match = EXCLUDED.tag_match,
        last_source = EXCLUDED.last_source,
        updated_at = NOW()
    `,
    [
      record.variantId,
      record.productId,
      record.vendorName,
      record.tags,
      record.shopifyPrice,
      record.shopifyCompareAt || null,
      record.shippingOffset,
      record.adjustedPrice,
      record.adjustedCompareAt,
      record.tagMatch,
      record.lastSource,
    ]
  );
}

export async function getAuditByVariant(variantId: string): Promise<AuditRecord | null> {
  const result = await pool.query(
    `SELECT * FROM shopify_price_audit WHERE variant_id = $1`,
    [variantId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    variantId: row.variant_id,
    productId: row.product_id,
    vendorName: row.vendor_name,
    tags: row.tags || [],
    shopifyPrice: Number(row.shopify_price),
    shopifyCompareAt: row.shopify_compare_at ? Number(row.shopify_compare_at) : undefined,
    shippingOffset: row.shipping_offset ? Number(row.shipping_offset) : null,
    adjustedPrice: row.adjusted_price ? Number(row.adjusted_price) : null,
    adjustedCompareAt: row.adjusted_compare_at ? Number(row.adjusted_compare_at) : null,
    tagMatch: row.tag_match,
    lastSource: row.last_source,
  };
}
