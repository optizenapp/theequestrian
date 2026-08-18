#!/usr/bin/env tsx
/** Export draft handle lists for pet Collective vendors. */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { shopifyAdminFetch } from '../lib/shopify/admin-client';

config({ path: resolve(process.cwd(), '.env.local') });

const VENDORS = ['WA Dog Grooming Supplies', 'Pet food Australia'] as const;

async function vendorDraftHandles(vendor: string): Promise<string[]> {
  const gql = `
    query PetDrafts($query: String!, $first: Int!, $after: String) {
      products(first: $first, after: $after, query: $query) {
        edges { node { handle status vendor } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const handles: string[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  const q = vendor.includes(' ') ? `vendor:"${vendor}" status:draft` : `vendor:${vendor} status:draft`;
  while (hasNext) {
    const data = await shopifyAdminFetch<{
      products: {
        edges: Array<{ node: { handle: string; status: string; vendor: string } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>({
      query: gql,
      variables: { query: q, first: 100, after: cursor },
      cache: 'no-store',
    });
    for (const edge of data.products.edges) {
      if (edge.node.status === 'DRAFT') handles.push(edge.node.handle);
    }
    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }
  return [...new Set(handles)].sort();
}

async function main(): Promise<void> {
  for (const vendor of VENDORS) {
    const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const handles = await vendorDraftHandles(vendor);
    const out = resolve(process.cwd(), `exports/${slug}-drafts.csv`);
    fs.writeFileSync(out, `${handles.join('\n')}${handles.length ? '\n' : ''}`);
    console.log(`${vendor}: ${handles.length} → ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
