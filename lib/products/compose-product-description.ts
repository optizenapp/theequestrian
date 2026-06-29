import {
  normaliseVendorDescription,
  stripLeadingHeading,
} from '@/lib/seo-enrichment/description-normalisation';
import type { ProductContentOverride } from '@/lib/content/product-overrides';

export interface ComposeProductDescriptionInput {
  shopifyDescriptionHtml: string;
  override: ProductContentOverride | null | undefined;
  /** Apply render-time normalisation when no stored normalised override exists. */
  applyRenderTimeNormalisation?: boolean;
}

export interface ComposedProductDescription {
  html: string;
  /** True when description_html override is used for the supplier core block. */
  usesNormalisedOverride: boolean;
}

/**
 * Stack PDP description: optional top augment + supplier core + optional bottom augment.
 * Always strips a leading heading from the core block (ProductDescription adds its own H2).
 */
export function composeProductDescriptionHtml(input: ComposeProductDescriptionInput): ComposedProductDescription {
  const { shopifyDescriptionHtml, override, applyRenderTimeNormalisation = true } = input;

  let coreHtml = shopifyDescriptionHtml || '';
  let usesNormalisedOverride = false;

  if (override?.use_headless_description && override.description_html) {
    coreHtml = override.description_html;
    usesNormalisedOverride = true;
  } else if (applyRenderTimeNormalisation && coreHtml.trim()) {
    const normalised = normaliseVendorDescription(coreHtml);
    coreHtml = normalised.html;
  } else {
    coreHtml = stripLeadingHeading(coreHtml);
  }

  const parts: string[] = [];

  if (override?.use_headless_top_description && override.top_description_html?.trim()) {
    parts.push(override.top_description_html.trim());
  }

  if (coreHtml.trim()) {
    parts.push(coreHtml.trim());
  }

  if (override?.use_headless_bottom_description && override.bottom_description_html?.trim()) {
    parts.push(override.bottom_description_html.trim());
  }

  return {
    html: parts.join('\n\n'),
    usesNormalisedOverride,
  };
}
