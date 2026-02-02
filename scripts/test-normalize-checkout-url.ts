#!/usr/bin/env tsx
/**
 * Test the normalizeCheckoutUrl function
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';

const testUrls = [
  'https://www.theequestrian.com.au/cart/c/hWN8JqVEiFTSK7H6vWo39xj8?key=19603a650087bb47765085cec39d811f',
  'https://checkout.theequestrian.com.au/cart/c/hWN8Krht62jJW2xjNfKV5hDg?key=e6bd810978364a678544e52c1b685d96',
  'https://theequestrian.myshopify.com/checkouts/cn/Z2NwLXVzLWNlbnRyYWwxOjAxSkZ...',
  'https://theequestrian.myshopify.com/cart/c/abc123?key=xyz',
];

console.log('🧪 Testing normalizeCheckoutUrl function\n');

testUrls.forEach((url) => {
  console.log(`Input:  ${url}`);
  console.log(`Output: ${normalizeCheckoutUrl(url)}`);
  console.log('');
});
