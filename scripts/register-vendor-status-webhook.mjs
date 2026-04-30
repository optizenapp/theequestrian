#!/usr/bin/env node
/**
 * One-off: ensure products/delete webhook is registered on every vendor with
 * sync_status = true (Ascot, Trialrace). Idempotent — skips topics already
 * registered to our endpoint. Lists final webhook state per shop.
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!dbUrl) throw new Error('Missing DATABASE_URL');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
if (!SITE_URL) throw new Error('Missing NEXT_PUBLIC_SITE_URL');

const API_VERSION = '2025-01';
const WEBHOOK_PATH = '/api/webhooks/shopify/vendor-sync';
const ADDRESS = `${SITE_URL.replace(/\/$/, '')}${WEBHOOK_PATH}`;
const TOPICS_REQUIRED = ['inventory_levels/update', 'products/update', 'products/delete'];

const sql = neon(dbUrl);
const vendors = await sql`
  SELECT id, shop_domain, marketplace_vendor_name, access_token
  FROM vendor_shop_connections
  WHERE is_active = true AND sync_status = true
  ORDER BY id
`;

if (vendors.length === 0) {
  console.log('No vendors with sync_status = true. Run apply-vendor-status-sync.mjs first.');
  process.exit(0);
}

console.log(`Webhook address → ${ADDRESS}`);
console.log(`Vendors: ${vendors.map((v) => v.shop_domain).join(', ')}\n`);

async function listWebhooks(shop, token) {
  const host = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${host}/admin/api/${API_VERSION}/webhooks.json`, {
    headers: { 'X-Shopify-Access-Token': token },
  });
  if (!res.ok) throw new Error(`list webhooks ${shop} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.webhooks ?? [];
}

async function createWebhook(shop, token, topic) {
  const host = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const res = await fetch(`https://${host}/admin/api/${API_VERSION}/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ webhook: { topic, address: ADDRESS, format: 'json' } }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body };
  }
  const data = await res.json();
  return { ok: true, id: data.webhook?.id };
}

for (const v of vendors) {
  console.log(`\n=== ${v.shop_domain} (${v.marketplace_vendor_name})`);
  let existing;
  try {
    existing = await listWebhooks(v.shop_domain, v.access_token);
  } catch (e) {
    console.error('   list failed:', e.message);
    continue;
  }
  const ours = existing.filter((w) => w.address === ADDRESS);
  console.log(
    `   existing webhooks pointing at us: ${ours.length === 0 ? 'none' : ours.map((w) => w.topic).join(', ')}`
  );
  for (const topic of TOPICS_REQUIRED) {
    const have = ours.some((w) => w.topic === topic);
    if (have) {
      console.log(`   - ${topic}: already registered`);
      continue;
    }
    const result = await createWebhook(v.shop_domain, v.access_token, topic);
    if (result.ok) {
      console.log(`   - ${topic}: created (id=${result.id})`);
    } else {
      console.log(`   - ${topic}: FAILED (${result.status}) ${result.body.slice(0, 200)}`);
    }
  }
}

console.log('\ndone');
