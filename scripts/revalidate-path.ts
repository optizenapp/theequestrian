#!/usr/bin/env tsx
/**
 * Trigger revalidation for a path so the frontend shows fresh data (e.g. after adding a product allocation).
 * Uses INTERNAL_REVALIDATE_SECRET or REVALIDATE_SECRET and NEXT_PUBLIC_SITE_URL from .env.local.
 *
 * Usage: npx tsx scripts/revalidate-path.ts /horse/boots/therapy
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

const path = process.argv[2] || '/horse/boots/therapy';
const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '').replace(/\/$/, '');
const secret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;

if (!baseUrl) {
  console.error('Set NEXT_PUBLIC_SITE_URL or VERCEL_URL in .env.local');
  process.exit(1);
}
if (!secret) {
  console.error('Set INTERNAL_REVALIDATE_SECRET or REVALIDATE_SECRET in .env.local');
  process.exit(1);
}

const url = `${baseUrl}/api/internal/revalidate-shopify`;
(async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': secret,
    },
    body: JSON.stringify({ paths: [path] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Revalidate failed:', res.status, data);
    process.exit(1);
  }
  console.log('Revalidated:', path, data);
})();
