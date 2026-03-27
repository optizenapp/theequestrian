#!/usr/bin/env tsx
/**
 * Register webhooks on a VENDOR's Shopify store (custom app with Admin API access).
 * Points to the marketplace Next.js handler: /api/webhooks/shopify/vendor-sync
 *
 * Usage:
 *   VENDOR_SHOP_DOMAIN=vendor.myshopify.com VENDOR_SHOP_ADMIN_ACCESS_TOKEN=shpat_xxx \
 *     npx tsx scripts/register-vendor-store-webhooks.ts
 *
 * Requires: NEXT_PUBLIC_SITE_URL, VENDOR_SHOP_DOMAIN, VENDOR_SHOP_ADMIN_ACCESS_TOKEN
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const API_VERSION = '2025-01';
const VENDOR_DOMAIN = process.env.VENDOR_SHOP_DOMAIN;
const VENDOR_TOKEN = process.env.VENDOR_SHOP_ADMIN_ACCESS_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const WEBHOOK_PATH = '/api/webhooks/shopify/vendor-sync';
const TOPICS = ['inventory_levels/update', 'products/update'] as const;

async function register(topic: string): Promise<boolean> {
  const address = `${SITE_URL?.replace(/\/$/, '')}${WEBHOOK_PATH}`;
  const host = VENDOR_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${host}/admin/api/${API_VERSION}/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': VENDOR_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      webhook: { topic, address, format: 'json' },
    }),
  });
  if (!res.ok) {
    console.error(`Failed ${topic}:`, await res.text());
    return false;
  }
  const data = (await res.json()) as { webhook: { id: number } };
  console.log(`OK ${topic} webhook id=${data.webhook.id}`);
  return true;
}

async function main() {
  if (!VENDOR_DOMAIN || !VENDOR_TOKEN || !SITE_URL) {
    console.error('Missing VENDOR_SHOP_DOMAIN, VENDOR_SHOP_ADMIN_ACCESS_TOKEN, or NEXT_PUBLIC_SITE_URL');
    process.exit(1);
  }
  for (const t of TOPICS) {
    await register(t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
