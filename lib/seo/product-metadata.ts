import type { ProductContentOverride } from '@/lib/content/product-overrides';

const DEFAULT_SITE_NAME = 'The Equestrian';
const DEFAULT_TITLE_MAX_LENGTH = 68;
const DEFAULT_DESCRIPTION_MAX_LENGTH = 158;
const FREE_SHIPPING_SUFFIX = ' | FREE Shipping Australia';
const FREE_SHIPPING_SHORT_SUFFIX = ' | FREE Shipping AU';

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
  const fullCandidate = cleanText(`${displayTitle}${FREE_SHIPPING_SUFFIX} | ${DEFAULT_SITE_NAME}`);
  if (fullCandidate.length <= DEFAULT_TITLE_MAX_LENGTH) {
    return fullCandidate;
  }

  // If over limit, drop brand suffix first to keep the "FREE Shipping" message.
  const noBrandCandidate = cleanText(`${displayTitle}${FREE_SHIPPING_SUFFIX}`);
  if (noBrandCandidate.length <= DEFAULT_TITLE_MAX_LENGTH) {
    return noBrandCandidate;
  }

  // If still too long, shorten shipping suffix before truncating product title.
  const shortSuffixCandidate = cleanText(`${displayTitle}${FREE_SHIPPING_SHORT_SUFFIX}`);
  if (shortSuffixCandidate.length <= DEFAULT_TITLE_MAX_LENGTH) {
    return shortSuffixCandidate;
  }

  const maxTitleLength = Math.max(12, DEFAULT_TITLE_MAX_LENGTH - FREE_SHIPPING_SHORT_SUFFIX.length);
  const shortenedTitle = truncateAtWordBoundary(displayTitle, maxTitleLength).replace(/\.\.\.$/, '');
  return cleanText(`${shortenedTitle}${FREE_SHIPPING_SHORT_SUFFIX}`);
}

function buildProposedDescription(displayTitle: string, productDescription?: string | null): string {
  const baseDescription = productDescription && productDescription.trim().length > 0
    ? cleanText(productDescription)
    : `Shop ${displayTitle} at ${DEFAULT_SITE_NAME}.`;

  const cta = 'FREE shipping Australia-wide. Price shown is your final delivered price.';
  return truncateAtWordBoundary(`${baseDescription} ${cta}`, DEFAULT_DESCRIPTION_MAX_LENGTH);
}

export function buildProductSeoMetadata(input: ProductSeoInput): ProductSeoOutput {
  const { displayTitle, productDescription, override } = input;

  const currentTitle = buildCurrentTitle(displayTitle, override);
  const currentDescription = buildCurrentDescription(displayTitle, productDescription, override);

  return {
    currentTitle,
    currentDescription,
    proposedTitle: buildProposedTitle(displayTitle),
    proposedDescription: buildProposedDescription(displayTitle, productDescription),
  };
}
