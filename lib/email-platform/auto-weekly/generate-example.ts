import type { EmailBlock } from '@/lib/email-platform/types';
import { normalizeEmailBlocks, normalizeTemplateMetadata } from '@/lib/email-platform/templates';
import { getProductsByHandles } from '@/lib/shopify/products-by-handles';
import { getNextSendSlotInUTC } from './build-campaign';
import { selectProductsForAutoWeekly } from './product-selection';
import { generateAutoWeeklyIntro } from './intro-generator';
import { generateAutoWeeklySubjectLine } from './subject-line-generator';
import { generateAutoWeeklyHeading } from './heading-generator';
import { buildCampaignHtmlWithOverrides } from './render';

function formatProductContext(
  products: Array<{
    title?: string | null;
    vendor?: string | null;
    priceRange?: { minVariantPrice?: { amount?: string } };
    compareAtPriceRange?: { minVariantPrice?: { amount?: string } };
  }>
): string {
  return products
    .map((p, i) => {
      const title = p.title || 'Product';
      const price = p.priceRange?.minVariantPrice?.amount;
      const compareAt = p.compareAtPriceRange?.minVariantPrice?.amount;
      const priceStr = price ? `$${parseFloat(price).toFixed(2)}` : '';
      let saleStr = '';
      if (compareAt && price && parseFloat(compareAt) > parseFloat(price)) {
        const pct = Math.round((1 - parseFloat(price) / parseFloat(compareAt)) * 100);
        saleStr = ` (was $${parseFloat(compareAt).toFixed(2)}, Save ${pct}%)`;
      }
      const vendor = p.vendor ? ` | ${p.vendor}` : '';
      return `Product ${i + 1}: ${title} - ${priceStr}${saleStr}${vendor}`;
    })
    .join('\n');
}

export type GenerateExampleInput = {
  blocks: EmailBlock[];
  metadata: Record<string, unknown>;
  siteUrl: string;
};

export type GenerateExampleResult = {
  html: string;
  subjectLine: string;
  introText: string;
  generatedHeading: string | null;
  productHandles: string[];
  sendDateLabel: string;
};

/**
 * Generate an example email using current template blocks and prompts, with sample product data.
 * Used by the template editor "Generate example" button.
 */
export async function generateExampleEmail(input: GenerateExampleInput): Promise<GenerateExampleResult> {
  const { blocks: rawBlocks, metadata: rawMetadata, siteUrl } = input;
  const blocks = normalizeEmailBlocks(rawBlocks);
  const templateMetadata = normalizeTemplateMetadata(rawMetadata ?? {});

  const slot = await getNextSendSlotInUTC();
  const sendDateLabel = slot?.label ?? 'Mon 17 Mar 2025 at 9:00 AEST';

  const llmIntroBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmIntro' }> => b.type === 'llmIntro');
  const llmHeadingBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'llmHeading' }> => b.type === 'llmHeading');
  const curatedBlock = blocks.find((b): b is Extract<EmailBlock, { type: 'curatedProducts' }> => b.type === 'curatedProducts');
  const subjectPromptFromMeta = typeof rawMetadata?.subjectPrompt === 'string' && rawMetadata.subjectPrompt.trim() ? rawMetadata.subjectPrompt.trim() : null;

  const introPrompt = llmIntroBlock?.prompt?.trim() || null;
  const headingPrompt = llmHeadingBlock?.prompt?.trim() || null;
  const curationPrompt = curatedBlock?.prompt?.trim() || null;

  const productHandles = await selectProductsForAutoWeekly(new Date(), curationPrompt);
  const handles = productHandles.slice(0, 3);
  const products = await getProductsByHandles(handles);
  const productContext = formatProductContext(products);

  const [introText, subjectLine, generatedHeadingResult] = await Promise.all([
    generateAutoWeeklyIntro({ sendDate: sendDateLabel, productContext }, introPrompt),
    generateAutoWeeklySubjectLine({ sendDate: sendDateLabel, productContext }, subjectPromptFromMeta),
    llmHeadingBlock
      ? (headingPrompt
          ? generateAutoWeeklyHeading({ sendDate: sendDateLabel, productContext }, headingPrompt)
          : Promise.resolve(llmHeadingBlock.text?.trim() || null))
      : Promise.resolve(null),
  ]);

  const generatedHeading = generatedHeadingResult?.trim() || null;

  const html = await buildCampaignHtmlWithOverrides({
    blocks,
    templateMetadata,
    overrides: {
      introText,
      generatedHeading: generatedHeading ?? undefined,
      productHandles: handles,
    },
    siteUrl,
  });

  return {
    html,
    subjectLine,
    introText,
    generatedHeading,
    productHandles: handles,
    sendDateLabel,
  };
}
