#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

(async () => {
  const variantId = process.argv[2];

  if (!variantId) {
    console.error('Usage: npx tsx verify-price-update.ts <variantId>');
    process.exit(1);
  }

  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/variants/${variantId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch variant:', await response.text());
    process.exit(1);
  }

  const data = await response.json();
  const variant = data.variant;

  console.log('\n✅ Current price in Shopify:');
  console.log(`   Variant ID: ${variant.id}`);
  console.log(`   Product: ${variant.product_id}`);
  console.log(`   Price: $${variant.price}`);
  console.log(`   Compare At: ${variant.compare_at_price || 'N/A'}`);
  console.log(`   SKU: ${variant.sku}`);
  console.log(`   Updated: ${variant.updated_at}\n`);
})();
