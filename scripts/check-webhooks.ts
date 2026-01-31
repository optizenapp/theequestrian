/**
 * Check Registered Shopify Webhooks
 * Shows all webhooks currently registered in Shopify
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

async function checkWebhooks() {
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.error('❌ Missing Shopify credentials');
    process.exit(1);
  }

  console.log('🔍 Checking registered webhooks in Shopify...\n');

  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    console.error('❌ Failed to fetch webhooks:', response.statusText);
    process.exit(1);
  }

  const data = await response.json();
  
  console.log('📡 Registered Shopify Webhooks:\n');
  
  if (data.webhooks && data.webhooks.length > 0) {
    data.webhooks.forEach((webhook: any) => {
      console.log(`✅ ${webhook.topic}`);
      console.log(`   ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.address}`);
      console.log(`   Created: ${new Date(webhook.created_at).toLocaleString()}`);
      console.log(`   Format: ${webhook.format}`);
      console.log(`   API Version: ${webhook.api_version}`);
      console.log('');
    });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total webhooks: ${data.webhooks.length}`);
    
    // Check for product webhooks specifically
    const productUpdate = data.webhooks.find((w: any) => w.topic === 'products/update');
    const productDelete = data.webhooks.find((w: any) => w.topic === 'products/delete');
    
    console.log('\n🔍 Product Sync Status:');
    console.log(`   products/update: ${productUpdate ? '✅ Active' : '❌ Not registered'}`);
    console.log(`   products/delete: ${productDelete ? '✅ Active' : '❌ Not registered'}`);
    
  } else {
    console.log('❌ No webhooks registered in Shopify');
    console.log('\n💡 To enable real-time sync, you need to register webhooks.');
  }
}

checkWebhooks().catch(console.error);
