import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function initDb() {
  const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
}

export interface AuditRecord {
  variantId: string;
  productId?: string;
  vendorName?: string;
  tags?: string[];
  vendorPrice?: number;
  vendorCompareAt?: number;
  shippingOffset?: number;
  adjustedPrice?: number;
  adjustedCompareAt?: number;
  tagMatch?: string | null;
  lastSource?: string;
  lastEventId?: string | null;
}

export interface AuditSnapshot {
  vendorPrice: number | null;
  vendorCompareAt: number | null;
  shippingOffset: number | null;
  adjustedPrice: number | null;
  adjustedCompareAt: number | null;
}

export async function getAuditByVariant(variantId: string): Promise<AuditSnapshot | null> {
  const result = await pool.query(
    `
      SELECT vendor_price, vendor_compare_at, shipping_offset, adjusted_price, adjusted_compare_at
      FROM price_offset_audit
      WHERE variant_id = $1
    `,
    [variantId]
  );

  if (result.rowCount === 0) return null;
  return {
    vendorPrice: result.rows[0].vendor_price,
    vendorCompareAt: result.rows[0].vendor_compare_at,
    shippingOffset: result.rows[0].shipping_offset,
    adjustedPrice: result.rows[0].adjusted_price,
    adjustedCompareAt: result.rows[0].adjusted_compare_at,
  };
}

export async function getAuditByVariants(variantIds: string[]): Promise<Map<string, AuditSnapshot>> {
  if (variantIds.length === 0) return new Map();
  const result = await pool.query(
    `
      SELECT variant_id, vendor_price, vendor_compare_at, shipping_offset, adjusted_price, adjusted_compare_at
      FROM price_offset_audit
      WHERE variant_id = ANY($1)
    `,
    [variantIds]
  );

  const map = new Map<string, AuditSnapshot>();
  for (const row of result.rows) {
    map.set(row.variant_id, {
      vendorPrice: row.vendor_price,
      vendorCompareAt: row.vendor_compare_at,
      shippingOffset: row.shipping_offset,
      adjustedPrice: row.adjusted_price,
      adjustedCompareAt: row.adjusted_compare_at,
    });
  }
  return map;
}

export async function upsertAudit(record: AuditRecord) {
  await pool.query(
    `
      INSERT INTO price_offset_audit (
        variant_id,
        product_id,
        vendor_name,
        tags,
        vendor_price,
        vendor_compare_at,
        shipping_offset,
        adjusted_price,
        adjusted_compare_at,
        tag_match,
        last_source,
        last_event_id,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      ON CONFLICT (variant_id)
      DO UPDATE SET
        product_id = EXCLUDED.product_id,
        vendor_name = EXCLUDED.vendor_name,
        tags = EXCLUDED.tags,
        vendor_price = EXCLUDED.vendor_price,
        vendor_compare_at = EXCLUDED.vendor_compare_at,
        shipping_offset = EXCLUDED.shipping_offset,
        adjusted_price = EXCLUDED.adjusted_price,
        adjusted_compare_at = EXCLUDED.adjusted_compare_at,
        tag_match = EXCLUDED.tag_match,
        last_source = EXCLUDED.last_source,
        last_event_id = EXCLUDED.last_event_id,
        updated_at = NOW();
    `,
    [
      record.variantId,
      record.productId || null,
      record.vendorName || null,
      record.tags ? JSON.stringify(record.tags) : null,
      record.vendorPrice ?? null,
      record.vendorCompareAt ?? null,
      record.shippingOffset ?? null,
      record.adjustedPrice ?? null,
      record.adjustedCompareAt ?? null,
      record.tagMatch || null,
      record.lastSource || null,
      record.lastEventId || null,
    ]
  );
}
