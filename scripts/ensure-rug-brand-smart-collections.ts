#!/usr/bin/env tsx
/**
 * Create missing Shopify smart collections for /brands/{handle} (rug brand links on /horse/rugs).
 * Uses Admin REST API. Rules: product title contains brand keyword (refine in Admin if needed).
 * After create (or if the collection already exists), publishes to the **Headless Storefront**
 * publication so the Storefront API `collection(handle:)` query returns it (Online Store alone is not enough).
 *
 * Requires: SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN in .env.local (`write_publications` scope for publish step)
 * Run: npx tsx scripts/ensure-rug-brand-smart-collections.ts [--dry-run]
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const STORE = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VER = '2024-10';
const DRY = process.argv.includes('--dry-run');

/** Collections to ensure: handle, public title, title-contains condition */
const SPECS: Array<{ handle: string; title: string; titleContains: string }> = [
  { handle: 'kentucky-horsewear', title: 'Kentucky Horsewear', titleContains: 'Kentucky Horsewear' },
  { handle: 'shanga', title: 'Shanga', titleContains: 'Shanga' },
  { handle: 'wild-horse', title: 'Wild Horse', titleContains: 'Wild Horse' },
];

async function adminFetch(path: string, init?: RequestInit) {
  const url = `https://${STORE}/admin/api/${API_VER}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN!,
      ...(init?.headers as Record<string, string>),
    },
  });
  return res;
}

async function adminGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${STORE}/admin/api/${API_VER}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as T;
}

/** Storefront API reads collections published to this channel, not only Online Store. */
async function getHeadlessPublicationGid(): Promise<string | null> {
  type PubQ = {
    data?: { publications?: { edges: Array<{ node: { id: string; name: string } }> } };
    errors?: { message: string }[];
  };
  const q = `query { publications(first: 25) { edges { node { id name } } } }`;
  const json = await adminGraphql<PubQ>(q);
  if (json.errors?.length) {
    console.warn('publications query:', json.errors[0]?.message);
    return null;
  }
  const edges = json.data?.publications?.edges ?? [];
  const headless = edges.find((e) => e.node.name === 'Headless Storefront');
  return headless?.node.id ?? null;
}

async function publishCollectionToHeadless(collectionNumericId: number, publicationGid: string): Promise<void> {
  const collectionGid = `gid://shopify/Collection/${collectionNumericId}`;
  const mutation = `mutation Publish($collectionId: ID!, $publicationId: ID!) {
    publishablePublish(id: $collectionId, input: { publicationId: $publicationId }) {
      userErrors { field message }
      publishable { ... on Collection { handle } }
    }
  }`;
  type PubM = {
    data?: {
      publishablePublish?: {
        userErrors: { field: string[]; message: string }[];
        publishable?: { handle: string } | null;
      };
    };
    errors?: { message: string }[];
  };
  const json = await adminGraphql<PubM>(mutation, {
    collectionId: collectionGid,
    publicationId: publicationGid,
  });
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  const errs = json.data?.publishablePublish?.userErrors ?? [];
  if (errs.length) {
    throw new Error(errs.map((e) => e.message).join('; '));
  }
}

async function getSmartCollectionIdByHandle(handle: string): Promise<number | null> {
  const res = await adminFetch(`/smart_collections.json?handle=${encodeURIComponent(handle)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { smart_collections?: { id: number }[] };
  return data.smart_collections?.[0]?.id ?? null;
}

async function smartCollectionExists(handle: string): Promise<boolean> {
  const res = await adminFetch(`/smart_collections.json?handle=${encodeURIComponent(handle)}`);
  if (!res.ok) return false;
  const data = (await res.json()) as { smart_collections?: { handle: string }[] };
  return (data.smart_collections?.length ?? 0) > 0;
}

async function createSmartCollection(spec: (typeof SPECS)[0]) {
  const body = {
    smart_collection: {
      title: spec.title,
      handle: spec.handle,
      published: true,
      disjunctive: false,
      rules: [
        {
          column: 'title',
          relation: 'contains',
          condition: spec.titleContains,
        },
      ],
    },
  };
  const res = await adminFetch('/smart_collections.json', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as { smart_collection: { id: number; handle: string } };
}

async function main() {
  if (!STORE || !TOKEN) {
    console.log('Skip: SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN not set.');
    process.exit(0);
  }

  let headlessPublicationGid: string | null = null;
  if (!DRY) {
    headlessPublicationGid = await getHeadlessPublicationGid();
    if (!headlessPublicationGid) {
      console.warn('Could not find "Headless Storefront" publication; Storefront API may not see new collections.');
    }
  }

  for (const spec of SPECS) {
    const exists = await smartCollectionExists(spec.handle);
    if (exists) {
      console.log(`Exists: ${spec.handle}`);
    } else if (DRY) {
      console.log(`[dry-run] Would create smart_collection ${spec.handle} (title contains "${spec.titleContains}")`);
      continue;
    } else {
      try {
        const created = await createSmartCollection(spec);
        console.log(`Created: ${created.smart_collection.handle} (id ${created.smart_collection.id})`);
      } catch (e) {
        console.error(`Failed ${spec.handle}:`, e instanceof Error ? e.message : e);
        continue;
      }
    }

    if (DRY || !headlessPublicationGid) continue;

    try {
      const id = await getSmartCollectionIdByHandle(spec.handle);
      if (!id) {
        console.warn(`No collection id for ${spec.handle}; skip Headless publish`);
        continue;
      }
      await publishCollectionToHeadless(id, headlessPublicationGid);
      console.log(`Published to Headless: ${spec.handle}`);
    } catch (e) {
      console.error(`Headless publish failed ${spec.handle}:`, e instanceof Error ? e.message : e);
    }
  }
}

main();
