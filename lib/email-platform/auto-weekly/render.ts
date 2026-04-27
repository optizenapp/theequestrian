import type { CuratedProductCard, EmailBlock } from '@/lib/email-platform/types';
import type { ShopifyProductCard } from '@/types/shopify';
import { renderTemplateBlocksHtml } from '@/lib/email-platform/templates';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getProductCanonicalUrls } from '@/lib/shopify/products';
import { applyAlternatingProductLayout } from './product-layout';

export type CampaignMetadataOverrides = {
  introText?: string | null;
  generatedHeading?: string | null;
  productHandles?: string[] | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

function stripOuterQuotes(value: string): string {
  return value.trim().replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
}

function shopifyProductToCuratedCard(
  p: ShopifyProductCard,
  siteUrl: string,
  canonicalPath: string
): CuratedProductCard {
  const base = siteUrl.replace(/\/$/, '');
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
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
    url: `${base}${path}`,
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
  const normalizedHeading =
    typeof overrides.generatedHeading === 'string' && overrides.generatedHeading.trim().length > 0
      ? stripOuterQuotes(overrides.generatedHeading)
      : null;
  const hasHeadingOverride = normalizedHeading != null && normalizedHeading.length > 0;
  const hasLlmHeadingBlock = blocks.some((b) => b.type === 'llmHeading');
  const hasCtaLabelOverride = typeof overrides.ctaLabel === 'string' && overrides.ctaLabel.trim().length > 0;
  const hasCtaUrlOverride = typeof overrides.ctaUrl === 'string' && overrides.ctaUrl.trim().length > 0;
  const hasCtaBlock = blocks.some((b) => b.type === 'cta');
  const logoUrl =
    typeof templateMetadata.logoUrl === 'string' && templateMetadata.logoUrl.trim().length > 0
      ? templateMetadata.logoUrl.trim()
      : null;
  let firstTextReplaced = false;
  let firstHeadingReplaced = false;
  let firstImageReplaced = false;
  let firstTextCtaReplaced = false;
  const mergedBlocks: EmailBlock[] = blocks.map((block) => {
    if (hasHeadingOverride && block.type === 'llmHeading') {
      return { ...block, text: normalizedHeading! };
    }
    if (hasHeadingOverride && !hasLlmHeadingBlock && block.type === 'heading' && !firstHeadingReplaced) {
      firstHeadingReplaced = true;
      return { ...block, text: normalizedHeading! };
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
    if (block.type === 'cta' && (hasCtaLabelOverride || hasCtaUrlOverride)) {
      return {
        ...block,
        ...(hasCtaLabelOverride ? { label: overrides.ctaLabel!.trim() } : {}),
        ...(hasCtaUrlOverride ? { url: overrides.ctaUrl!.trim() } : {}),
      };
    }
    if (
      !hasCtaBlock &&
      hasCtaLabelOverride &&
      hasCtaUrlOverride &&
      block.type === 'text' &&
      !firstTextCtaReplaced &&
      /view all/i.test(block.text)
    ) {
      firstTextCtaReplaced = true;
      return { ...block, text: `[${overrides.ctaLabel!.trim()}](${overrides.ctaUrl!.trim()})` };
    }
    if (logoUrl && block.type === 'image' && !firstImageReplaced) {
      firstImageReplaced = true;
      return { ...block, url: logoUrl };
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
    const urlById = await getProductCanonicalUrls(products);
    const cards: CuratedProductCard[] = products.map((p) =>
      shopifyProductToCuratedCard(p, siteUrl, urlById.get(p.id) ?? `/products/${p.handle}`)
    );
    const introText = typeof overrides.introText === 'string' ? overrides.introText : '';
    mergedBlocks.splice(0, mergedBlocks.length, ...applyAlternatingProductLayout(mergedBlocks, cards, introText));
  }

  return renderTemplateBlocksHtml({ blocks: mergedBlocks, metadata: templateMetadata });
}
