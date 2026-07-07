import type { ProductContentOverride } from '@/lib/content/product-overrides';
import { SHIPPING_CHECKOUT_MESSAGE } from '@/lib/shipping/messaging';

const DEFAULT_SITE_NAME = 'The Equestrian';
const DEFAULT_TITLE_MAX_LENGTH = 68;
const DEFAULT_DESCRIPTION_MAX_LENGTH = 158;

interface ProductSeoInput {
  displayTitle: string;
  productDescription?: string | null;
  override?: ProductContentOverride | null;
}

interface ProductSeoOutput {
  currentTitle: string;
  currentDescription: string;
  proposedTitle: string;
  proposedDescription: string;
}

function cleanText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function truncateAtWordBoundary(input: string, maxLength: number): string {
  const text = cleanText(input);
  if (text.length <= maxLength) {
    return text;
  }

  const sliced = text.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace > Math.floor(maxLength * 0.7)) {
    return `${sliced.slice(0, lastSpace).trim()}...`;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function buildCurrentTitle(displayTitle: string, override?: ProductContentOverride | null): string {
  const fallback = `${displayTitle} | ${DEFAULT_SITE_NAME}`;
  if (override?.use_headless_meta_title) {
    return cleanText(override.meta_title || fallback);
  }
  return cleanText(fallback);
}

function buildCurrentDescription(displayTitle: string, productDescription?: string | null, override?: ProductContentOverride | null): string {
  const fallback = productDescription || `Shop ${displayTitle} at ${DEFAULT_SITE_NAME}. Quality equestrian supplies and equipment.`;
  if (override?.use_headless_meta_description) {
    return cleanText(override.meta_description || fallback);
  }
  return cleanText(fallback);
}

function buildProposedTitle(displayTitle: string): string {
  const fullCandidate = cleanText(`${displayTitle} | ${DEFAULT_SITE_NAME}`);
  if (fullCandidate.length <= DEFAULT_TITLE_MAX_LENGTH) {
    return fullCandidate;
  }

  const maxTitleLength = Math.max(12, DEFAULT_TITLE_MAX_LENGTH - ` | ${DEFAULT_SITE_NAME}`.length);
  const shortenedTitle = truncateAtWordBoundary(displayTitle, maxTitleLength).replace(/\.\.\.$/, '');
  return cleanText(`${shortenedTitle} | ${DEFAULT_SITE_NAME}`);
}

function buildProposedDescription(displayTitle: string, productDescription?: string | null): string {
  const baseDescription = productDescription && productDescription.trim().length > 0
    ? cleanText(productDescription)
    : `Shop ${displayTitle} at ${DEFAULT_SITE_NAME}.`;

  return truncateAtWordBoundary(`${baseDescription} ${SHIPPING_CHECKOUT_MESSAGE}`, DEFAULT_DESCRIPTION_MAX_LENGTH);
}

export function resolveProductPageTitle(
  seo: ProductSeoOutput,
  override?: ProductContentOverride | null
): string {
  if (override?.use_headless_meta_title && override.meta_title?.trim()) {
    return seo.currentTitle;
  }
  return seo.proposedTitle;
}

export function resolveProductPageDescription(
  seo: ProductSeoOutput,
  override?: ProductContentOverride | null
): string {
  if (override?.use_headless_meta_description && override.meta_description?.trim()) {
    return seo.currentDescription;
  }
  return seo.proposedDescription;
}

export function buildProductSeoMetadata(input: ProductSeoInput): ProductSeoOutput {
  const { displayTitle, productDescription, override } = input;

  const currentTitle = buildCurrentTitle(displayTitle, override);
  const currentDescription = buildCurrentDescription(displayTitle, productDescription, override);
  const legacyProposedTitle = buildProposedTitle(displayTitle);
  const legacyProposedDescription = buildProposedDescription(displayTitle, productDescription);

  // Collective enrichment: enriched meta wins over legacy product title template
  const hasEnrichedMetaTitle =
    Boolean(override?.use_headless_meta_title && override.meta_title?.trim());
  const hasEnrichedMetaDescription =
    Boolean(override?.use_headless_meta_description && override.meta_description?.trim());

  return {
    currentTitle,
    currentDescription,
    proposedTitle: hasEnrichedMetaTitle ? currentTitle : legacyProposedTitle,
    proposedDescription: hasEnrichedMetaDescription ? currentDescription : legacyProposedDescription,
  };
}
