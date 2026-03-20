import type { CuratedProductCard, EmailBlock } from '@/lib/email-platform/types';
import type { ShopifyProductCard } from '@/types/shopify';
import { renderTemplateBlocksHtml } from '@/lib/email-platform/templates';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';

export type CampaignMetadataOverrides = {
  introText?: string | null;
  generatedHeading?: string | null;
  productHandles?: string[] | null;
};

function shopifyProductToCuratedCard(p: ShopifyProductCard, siteUrl: string): CuratedProductCard {
  const base = siteUrl.replace(/\/$/, '');
  const price = p.priceRange?.minVariantPrice?.amount ?? '';
  const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount;
  let savePercent = '';
  if (compareAt && price && parseFloat(compareAt) > parseFloat(price)) {
    const pct = Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100);
    savePercent = `${pct}%`;
  }
  const imageUrl = p.images?.edges?.[0]?.node?.url ?? null;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title ?? undefined,
    imageUrl: imageUrl ?? undefined,
    url: `${base}/products/${p.handle}`,
    price: price ? `$${parseFloat(price).toFixed(2)}` : '',
    compareAtPrice: compareAt ? `$${parseFloat(compareAt).toFixed(2)}` : undefined,
    savePercent: savePercent || undefined,
    freeShippingBadge: true,
  };
}

/**
 * Build HTML for a campaign that uses metadata overrides (intro + product handles).
 * Merges campaign intro and fetched products into the template blocks and renders.
 */
export async function buildCampaignHtmlWithOverrides(input: {
  blocks: EmailBlock[];
  templateMetadata: Record<string, unknown>;
  overrides: CampaignMetadataOverrides;
  siteUrl: string;
}): Promise<string> {
  const { blocks, templateMetadata, overrides, siteUrl } = input;
  const hasIntroOverride = overrides.introText != null && overrides.introText !== '';
  const hasLlmIntroBlock = blocks.some((b) => b.type === 'llmIntro');
  const hasHeadingOverride = overrides.generatedHeading != null && overrides.generatedHeading !== '';
  let firstTextReplaced = false;
  const mergedBlocks: EmailBlock[] = blocks.map((block) => {
    if (hasHeadingOverride && block.type === 'llmHeading') {
      return { ...block, text: overrides.generatedHeading! };
    }
    if (hasIntroOverride) {
      if (block.type === 'llmIntro') {
        return { ...block, text: overrides.introText! };
      }
      if (!hasLlmIntroBlock && block.type === 'text' && !firstTextReplaced) {
        firstTextReplaced = true;
        return { ...block, text: overrides.introText! };
      }
    }
    if (
      block.type === 'curatedProducts' &&
      Array.isArray(overrides.productHandles) &&
      overrides.productHandles.length > 0
    ) {
      return { ...block, products: [] };
    }
    return block;
  });

  if (
    Array.isArray(overrides.productHandles) &&
    overrides.productHandles.length > 0
  ) {
    const products = await getProductsByHandles(overrides.productHandles);
    const cards: CuratedProductCard[] = products.map((p) =>
      shopifyProductToCuratedCard(p, siteUrl)
    );
    const idx = mergedBlocks.findIndex((b) => b.type === 'curatedProducts');
    if (idx !== -1) {
      const block = mergedBlocks[idx];
      if (block.type === 'curatedProducts') {
        mergedBlocks[idx] = { ...block, products: cards };
      }
    }
  }

  return renderTemplateBlocksHtml({ blocks: mergedBlocks, metadata: templateMetadata });
}
