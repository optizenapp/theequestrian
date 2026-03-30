import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';
import { getCollectionWithPagination } from '@/lib/shopify/collections';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import OpenAI from 'openai';
import { getProductHandlesUsedInMonth } from './used-products';

export type ProductCandidate = {
  handle: string;
  title: string;
  source: 'best_seller' | 'on_sale' | 'branded';
  quantity?: number;
  revenue?: number;
};

const DAYS_AGO = 30;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch order line items from Shopify Admin API for the last N days,
 * aggregated by product handle. Returns handles with quantity and revenue.
 */
async function getSalesByProductHandle(
  startDate: string,
  endDate: string
): Promise<Map<string, { quantity: number; revenue: number; vendor: string }>> {
  const query = `
    query Orders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
        edges {
          node {
            lineItems(first: 100) {
              edges {
                node {
                  quantity
                  originalTotalSet { shopMoney { amount } }
                  originalUnitPriceSet { shopMoney { amount } }
                  variant {
                    product {
                      id
                      handle
                      vendor
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const dateQuery = `created_at:>=${startDate} created_at:<=${endDate}`;
  const map = new Map<string, { quantity: number; revenue: number; vendor: string }>();
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 20;

  while (page < maxPages) {
    const result: any = await shopifyAdminFetch<any>({
      query,
      variables: { first: 100, after: cursor, query: dateQuery },
    });
    const edges = result.orders?.edges ?? [];
    for (const edge of edges) {
      const lineItems = edge.node?.lineItems?.edges ?? [];
      for (const li of lineItems) {
        const product = li.node?.variant?.product;
        if (!product?.handle) continue;
        const handle = product.handle as string;
        const vendor = (product.vendor as string) || '';
        const quantity = Number(li.node.quantity ?? 0);
        const total =
          Number(li.node.originalTotalSet?.shopMoney?.amount ?? 0) ||
          Number(li.node.originalUnitPriceSet?.shopMoney?.amount ?? 0) * quantity;
        const existing = map.get(handle) ?? { quantity: 0, revenue: 0, vendor };
        map.set(handle, {
          quantity: existing.quantity + quantity,
          revenue: existing.revenue + total,
          vendor: existing.vendor || vendor,
        });
      }
    }
    const pageInfo = result.orders?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
    page += 1;
  }

  return map;
}

/**
 * Best sellers: top by quantity from sales in last 30 days.
 */
async function getBestSellerCandidates(
  salesMap: Map<string, { quantity: number; revenue: number; vendor: string }>,
  limit: number
): Promise<ProductCandidate[]> {
  const sorted = Array.from(salesMap.entries())
    .map(([handle, data]) => ({ handle, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
  return sorted.map((s) => ({
    handle: s.handle,
    title: s.handle.replace(/-/g, ' '),
    source: 'best_seller' as const,
    quantity: s.quantity,
    revenue: s.revenue,
  }));
}

/**
 * On-sale: products in the on-sale collection, ranked by 30-day sales.
 */
async function getOnSaleCandidates(
  salesMap: Map<string, { quantity: number; revenue: number; vendor: string }>,
  limit: number
): Promise<ProductCandidate[]> {
  const pageData = getSalePageByPath('/on-sale');
  const collectionHandle = pageData?.handle || 'on-sale';
  const { products } = await getCollectionWithPagination(collectionHandle, 100);
  const withSales = products
    .map((p) => ({
      handle: p.handle,
      title: p.title || p.handle,
      quantity: salesMap.get(p.handle)?.quantity ?? 0,
      revenue: salesMap.get(p.handle)?.revenue ?? 0,
    }))
    .filter((p) => p.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
  return withSales.map((s) => ({
    handle: s.handle,
    title: s.title,
    source: 'on_sale' as const,
    quantity: s.quantity,
    revenue: s.revenue,
  }));
}

/**
 * Branded: products whose vendor is in the site's brand list, ranked by 30-day sales.
 */
async function getBrandedCandidates(
  salesMap: Map<string, { quantity: number; revenue: number; vendor: string }>,
  limit: number
): Promise<ProductCandidate[]> {
  const brands = await getAllPublishedBrandContent();
  const vendorSet = new Set(brands.map((b) => b.title.trim().toLowerCase()));
  const branded = Array.from(salesMap.entries())
    .filter(([, data]) => vendorSet.has(data.vendor.trim().toLowerCase()))
    .map(([handle, data]) => ({ handle, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
  return branded.map((s) => ({
    handle: s.handle,
    title: s.handle.replace(/-/g, ' '),
    source: 'branded' as const,
    quantity: s.quantity,
    revenue: s.revenue,
  }));
}

/**
 * Use LLM to pick 3 product handles from candidates with a mix of sources.
 * Optional curationPrompt guides the selection (e.g. "Focus on grooming and winter gear").
 */
async function pickThreeWithLLM(
  candidates: ProductCandidate[],
  curationPrompt?: string | null
): Promise<string[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= 3) return [...new Set(candidates.map((c) => c.handle))].slice(0, 3);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const bestSeller = candidates.filter((c) => c.source === 'best_seller').slice(0, 1);
    const onSale = candidates.filter((c) => c.source === 'on_sale').slice(0, 1);
    const branded = candidates.filter((c) => c.source === 'branded').slice(0, 1);
    const fallback = [...bestSeller, ...onSale, ...branded]
      .filter(Boolean)
      .map((c) => c.handle)
      .slice(0, 3);
    return [...new Set(fallback)];
  }

  const openai = new OpenAI({ apiKey: key });
  const list = candidates.slice(0, 30).map((c) => `${c.handle} (${c.source}: ${c.title})`).join('\n');
  const guidance =
    (curationPrompt && curationPrompt.trim()) ||
    'Prefer a mix: at least one best_seller, one on_sale, and one branded when possible.';
  const prompt = `You are choosing 3 products for a weekly equestrian email. Pick exactly 3 unique product HANDLES from the list below. ${guidance} Reply with only a JSON array of 3 handles, e.g. ["handle-a","handle-b","handle-c"]. No other text.\n\nCandidates:\n${list}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
  const content = completion.choices[0]?.message?.content?.trim() || '[]';
  const parsed = JSON.parse(content.replace(/^```\w*\n?|\n?```$/g, '').trim());
  const handles = Array.isArray(parsed) ? parsed.filter((h: unknown) => typeof h === 'string') : [];
  const valid = handles.slice(0, 3).filter((h: string) =>
    candidates.some((c) => c.handle === h)
  );
  if (valid.length < 3) {
    const fallback = [...new Set(candidates.map((c) => c.handle))].slice(0, 3);
    return fallback;
  }
  return valid;
}

/**
 * Select 3 product handles for the auto weekly email: best sellers, on-sale, and branded mix.
 * When forDate is provided, products already used in an auto weekly campaign in that calendar month are excluded.
 * When curationPrompt is provided (from the Curated Products block), it guides the LLM selection (e.g. focus on grooming, winter gear).
 */
export async function selectProductsForAutoWeekly(
  forDate?: Date,
  curationPrompt?: string | null
): Promise<string[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DAYS_AGO);
  const startDate = formatDate(start);
  const endDate = formatDate(end);

  const [salesMap, usedThisMonth] = await Promise.all([
    getSalesByProductHandle(startDate, endDate),
    forDate ? getProductHandlesUsedInMonth(forDate) : Promise.resolve([]),
  ]);

  const excludeHandles = new Set(usedThisMonth);

  const [bestSellers, onSale, branded] = await Promise.all([
    getBestSellerCandidates(salesMap, 12),
    getOnSaleCandidates(salesMap, 12),
    getBrandedCandidates(salesMap, 12),
  ]);

  const candidates: ProductCandidate[] = [];
  const seen = new Set<string>();
  for (const c of [...bestSellers, ...onSale, ...branded]) {
    if (!seen.has(c.handle) && !excludeHandles.has(c.handle)) {
      seen.add(c.handle);
      candidates.push(c);
    }
  }

  return pickThreeWithLLM(candidates, curationPrompt);
}
