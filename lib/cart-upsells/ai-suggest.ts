import OpenAI from 'openai';
import { getComplementaryTypes } from '@/lib/mapping/complementary-products';
import { shopifyFetch } from '@/lib/shopify/client';
import { GET_PRODUCTS_BY_QUERY } from '@/lib/shopify/queries';
import { filterExcludedFrontendVendors } from '@/lib/shopify/vendor-visibility';
type SuggestCandidate = {
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  availableForSale: boolean;
  images?: { edges: Array<{ node: { url: string } }> };
};

type ProductsResponse = {
  products?: { edges: Array<{ node: SuggestCandidate }> };
};

/**
 * Admin helper: given trigger context, propose candidate product handles via LLM
 * (falls back to complementary-type Shopify search when OpenAI is unavailable).
 */
export async function suggestUpsellHandles(input: {
  triggerType: 'product_handle' | 'product_type' | 'vendor';
  triggerValues: string[];
  limit?: number;
}): Promise<{ handles: string[]; titles: Record<string, string>; source: 'ai' | 'heuristic' }> {
  const limit = Math.min(12, Math.max(3, input.limit ?? 8));
  const triggers = input.triggerValues.map((v) => v.trim()).filter(Boolean);
  if (triggers.length === 0) return { handles: [], titles: {}, source: 'heuristic' };

  const productTypes =
    input.triggerType === 'product_type'
      ? triggers
      : input.triggerType === 'product_handle'
        ? []
        : [];
  const complementary = getComplementaryTypes(
    productTypes.length > 0 ? productTypes : triggers
  );
  const queryParts: string[] = [];
  if (input.triggerType === 'vendor') {
    queryParts.push(...triggers.map((v) => `vendor:"${v.replace(/"/g, '\\"')}"`));
  }
  for (const t of complementary.slice(0, 6)) {
    queryParts.push(`product_type:"${t.replace(/"/g, '\\"')}"`);
  }
  if (queryParts.length === 0) {
    queryParts.push(...triggers.map((t) => `product_type:"${t.replace(/"/g, '\\"')}"`));
  }

  const data = await shopifyFetch<ProductsResponse>({
    query: GET_PRODUCTS_BY_QUERY,
    variables: { query: queryParts.join(' OR '), first: 30 },
    cache: 'no-store',
  });

  let candidates = filterExcludedFrontendVendors(
    data.products?.edges.map((e) => e.node) ?? []
  ).filter((p) => p.availableForSale && p.images?.edges?.length);

  if (input.triggerType === 'product_handle') {
    const exclude = new Set(triggers.map((t) => t.toLowerCase()));
    candidates = candidates.filter((p) => !exclude.has(p.handle.toLowerCase()));
  }

  const titles: Record<string, string> = {};
  for (const p of candidates) titles[p.handle] = p.title;

  const key = process.env.OPENAI_API_KEY;
  if (!key || candidates.length <= limit) {
    const handles = candidates.slice(0, limit).map((p) => p.handle);
    return { handles, titles, source: 'heuristic' };
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const list = candidates
      .slice(0, 30)
      .map((p) => `${p.handle} | ${p.title} | ${p.productType} | ${p.vendor}`)
      .join('\n');
    const prompt = `You pick equestrian cart upsell products. Trigger: ${input.triggerType}=${triggers.join(', ')}. Pick up to ${limit} unique HANDLES from the list that shoppers would add alongside the trigger. Reply JSON array of handles only.\n\n${list}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const content = completion.choices[0]?.message?.content?.trim() || '[]';
    const parsed = JSON.parse(content.replace(/^```\w*\n?|\n?```$/g, '').trim()) as unknown;
    const handles = Array.isArray(parsed)
      ? parsed.filter((h): h is string => typeof h === 'string')
      : [];
    const valid = [...new Set(handles)].filter((h) =>
      candidates.some((c) => c.handle === h)
    );
    if (valid.length === 0) {
      return {
        handles: candidates.slice(0, limit).map((p) => p.handle),
        titles,
        source: 'heuristic',
      };
    }
    return { handles: valid.slice(0, limit), titles, source: 'ai' };
  } catch (err) {
    console.warn('[suggestUpsellHandles] AI failed, using heuristic', err);
    return {
      handles: candidates.slice(0, limit).map((p) => p.handle),
      titles,
      source: 'heuristic',
    };
  }
}