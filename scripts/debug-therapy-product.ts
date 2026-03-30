#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '@/lib/shopify/client';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { sql } from '@/lib/db/client';

const PRODUCT_GID = 'gid://shopify/Product/10390130524452';
const HANDLE = 'arcequine-complete-kit';

async function main() {
  const sf = await shopifyFetch<{ product: { id: string; handle: string; title: string; availableForSale: boolean; images: { edges: Array<{ node: { url: string } }> } } | null }>({
    query: `
      query CheckStorefront($id: ID!) {
        product(id: $id) {
          id
          handle
          title
          availableForSale
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
        }
      }
    `,
    variables: { id: PRODUCT_GID },
    cache: 'no-store',
  });

  const admin = await shopifyAdminFetch<{ product: { id: string; handle: string; title: string; status: string } | null }>({
    query: `
      query CheckAdmin($id: ID!) {
        product(id: $id) {
          id
          handle
          title
          status
        }
      }
    `,
    variables: { id: PRODUCT_GID },
  });

  const alloc = await sql`
    SELECT product_id, product_handle, category_path, canonical_path
    FROM product_category_assignments
    WHERE product_id = ${PRODUCT_GID}
  `;

  const overrides = await sql`
    SELECT product_handle, is_published_headless
    FROM product_content_overrides
    WHERE product_handle = ${HANDLE}
  `;

  console.log('Storefront product:', sf.product);
  console.log('Admin product:', admin.product);
  console.log('Allocation rows:', alloc);
  console.log('Override rows:', overrides);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
