import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

export type CollectiveVariant = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  inventoryItem: { unitCost: { amount: string } | null } | null;
};

export type CollectiveProduct = {
  handle: string;
  vendor: string;
  status: string;
  variants: { nodes: CollectiveVariant[] };
};

type Page = {
  products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: CollectiveProduct[] };
};

const QUERY = `query($q: String!, $after: String) {
  products(first: 100, after: $after, query: $q) {
    pageInfo { hasNextPage endCursor }
    nodes { handle vendor status variants(first: 100) { nodes { id title price compareAtPrice inventoryItem { unitCost { amount } } } } }
  }
}`;

/** All products tagged "Shopify Collective" (optionally one vendor), with variant price + Collective cost. */
export async function fetchCollectiveProducts(vendor?: string): Promise<CollectiveProduct[]> {
  const q = `tag:"Shopify Collective"${vendor ? ` AND vendor:"${vendor.replace(/"/g, '\\"')}"` : ''}`;
  const out: CollectiveProduct[] = [];
  let after: string | null = null;
  do {
    const data: Page = await shopifyAdminFetch<Page>({ query: QUERY, variables: { q, after } });
    out.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return out;
}

export const collectiveVariantCost = (v: CollectiveVariant) => Number(v.inventoryItem?.unitCost?.amount ?? 0);
