/**
 * Load shipping rates from Postgres database
 * Used by bulk scripts and webhooks in the Webkul price offset service
 */

import { pool } from './index';

export interface VendorRate {
  vendor: string;
  shippingCost: number;
  tagOverrides?: Map<string, number>;
}

export interface TagRate {
  tag: string;
  shippingCost: number;
}

/**
 * Load vendor rates from Postgres
 */
export async function loadVendorRates(): Promise<Map<string, VendorRate>> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        vendor_name,
        base_rate,
        tag_overrides
      FROM vendor_shipping_rates
      WHERE active = true
    `);

    const map = new Map<string, VendorRate>();

    for (const row of result.rows) {
      const tagOverrides = new Map<string, number>();
      
      // Parse tag overrides from JSONB
      if (row.tag_overrides) {
        for (const [tag, rate] of Object.entries(row.tag_overrides)) {
          tagOverrides.set(tag, rate as number);
        }
      }

      map.set(row.vendor_name, {
        vendor: row.vendor_name,
        shippingCost: parseFloat(row.base_rate),
        tagOverrides: tagOverrides.size > 0 ? tagOverrides : undefined,
      });
    }

    return map;
  } finally {
    client.release();
  }
}

/**
 * Load global tag rates from Postgres
 */
export async function loadTagRates(): Promise<Map<string, TagRate>> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT tag, rate
      FROM shipping_tag_rates
      WHERE active = true
    `);

    const map = new Map<string, TagRate>();

    for (const row of result.rows) {
      map.set(row.tag, {
        tag: row.tag,
        shippingCost: parseFloat(row.rate),
      });
    }

    return map;
  } finally {
    client.release();
  }
}
