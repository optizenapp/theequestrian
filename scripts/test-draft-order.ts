/**
 * Test Draft Order Creation
 * 
 * Quick script to test if draft order API is working
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testDraftOrder() {
  console.log('🧪 Testing Draft Order API...\n');
  
  // Check env vars
  if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ADMIN_ACCESS_TOKEN not set in .env.local');
    console.log('\nPlease add it to .env.local:');
    console.log('SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx\n');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded');
  console.log(`   Store: ${process.env.SHOPIFY_STORE_DOMAIN}`);
  console.log(`   Admin API Token: ${process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.slice(0, 10)}...`);
  
  // Test data
  const testOrder = {
    items: [
      {
        variantId: 'gid://shopify/ProductVariant/REPLACE_WITH_REAL_VARIANT_ID',
        quantity: 1,
        price: '79.95',
        vendor: 'Ariat',
        tags: [],
        title: 'Test Product'
      }
    ],
    customer: {
      email: 'test@example.com'
    }
  };
  
  console.log('\n📦 Test order data:');
  console.log(JSON.stringify(testOrder, null, 2));
  
  console.log('\n🚀 To test, start your dev server and run:');
  console.log('\ncurl -X POST https://www.theequestrian.com.au/api/checkout/create-draft-order \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log(`  -d '${JSON.stringify(testOrder)}'`);
  
  console.log('\n✅ Setup complete! Follow the instructions in SETUP-DRAFT-ORDERS.md');
}

testDraftOrder().catch(console.error);
