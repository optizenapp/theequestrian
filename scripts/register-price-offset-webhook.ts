#!/usr/bin/env tsx
/**
 * Register Price Offset Webhooks in Shopify
 * Registers webhooks for products/create and products/update
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN || !NEXT_PUBLIC_SITE_URL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const WEBHOOK_URL = `${NEXT_PUBLIC_SITE_URL}/api/webhooks/shopify/price-offset`;

async function registerWebhook(topic: string) {
  console.log(`\n📡 Registering webhook: ${topic}`);
  console.log(`   URL: ${WEBHOOK_URL}`);

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: WEBHOOK_URL,
          format: 'json',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed to register ${topic}:`, error);
    return false;
  }

  const data = await response.json();
  console.log(`✅ Registered ${topic}`);
  console.log(`   ID: ${data.webhook.id}`);
  console.log(`   Created: ${new Date(data.webhook.created_at).toLocaleString()}`);
  return true;
}

async function checkExistingWebhooks() {
  console.log('🔍 Checking existing webhooks...\n');

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
    }
  );

  if (!response.ok) {
    console.error('❌ Failed to fetch webhooks');
    return [];
  }

  const data = await response.json();
  const priceOffsetWebhooks = data.webhooks.filter((w: any) => 
    w.address === WEBHOOK_URL
  );

  if (priceOffsetWebhooks.length > 0) {
    console.log('⚠️  Found existing price offset webhooks:');
    priceOffsetWebhooks.forEach((w: any) => {
      console.log(`   ${w.topic} (ID: ${w.id})`);
    });
    console.log('');
  }

  return priceOffsetWebhooks.map((w: any) => w.topic);
}

async function main() {
  console.log('🚀 Price Offset Webhook Registration\n');
  console.log(`Store: ${SHOPIFY_STORE_DOMAIN}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  // Check existing webhooks
  const existingTopics = await checkExistingWebhooks();

  // Register webhooks
  const topics = ['products/create', 'products/update'];
  let registered = 0;

  for (const topic of topics) {
    if (existingTopics.includes(topic)) {
      console.log(`\n⏭️  Skipping ${topic} (already registered)`);
      continue;
    }

    const success = await registerWebhook(topic);
    if (success) registered++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Registration complete: ${registered} new webhooks registered`);
  console.log('='.repeat(60));

  console.log('\n📋 Next Steps:');
  console.log('1. Test the webhooks by creating/updating a product in Shopify');
  console.log('2. Check webhook logs in Shopify Admin → Settings → Notifications → Webhooks');
  console.log('3. Monitor your application logs for webhook events');
  console.log('\n⚠️  Note: Make sure your SHOPIFY_WEBHOOK_SECRET is set in .env.local');
}

main().catch(console.error);
