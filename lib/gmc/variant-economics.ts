/**
 * Admin API loader for variant unit cost + inventory used by GMC custom labels.
 */
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

export type VariantEconomics = {
  unitCostAud: number | null;
  quantityAvailable: number | null;
  tracked: boolean | null;
  inventoryPolicy: string | null;
};

type EconomicsPage = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        variants: {
          edges: Array<{
            node: {
              id: string;
              inventoryQuantity: number | null;
              inventoryPolicy: string | null;
              inventoryItem: {
                tracked: boolean;
                unitCost: { amount: string } | null;
              } | null;
            };
          }>;
        };
      };
    }>;
  };
};

function stripGid(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

const ECONOMICS_QUERY = `
  query GmcVariantEconomics($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          variants(first: 100) {
            edges {
              node {
                id
                inventoryQuantity
                inventoryPolicy
                inventoryItem {
                  tracked
                  unitCost { amount }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Load variant economics for the full Admin catalogue.
 * Keys are numeric Shopify variant IDs (no gid prefix).
 */
export async function loadVariantEconomicsMap(): Promise<Map<string, VariantEconomics>> {
  const map = new Map<string, VariantEconomics>();
  let cursor: string | null = null;
  let pages = 0;

  while (true) {
    const data: EconomicsPage = await shopifyAdminFetch<EconomicsPage>({
      query: ECONOMICS_QUERY,
      variables: { cursor },
    });
    pages += 1;

    for (const productEdge of data.products.edges) {
      for (const variantEdge of productEdge.node.variants.edges) {
        const variant = variantEdge.node;
        const costRaw = variant.inventoryItem?.unitCost?.amount;
        const costNum = costRaw != null ? Number(costRaw) : NaN;
        map.set(stripGid(variant.id), {
          unitCostAud: Number.isFinite(costNum) && costNum > 0 ? costNum : null,
          quantityAvailable: variant.inventoryQuantity,
          tracked: variant.inventoryItem?.tracked ?? null,
          inventoryPolicy: variant.inventoryPolicy,
        });
      }
    }

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  console.log(`[gmc:feed] Variant economics: ${map.size} variants across ${pages} Admin pages`);
  return map;
}
