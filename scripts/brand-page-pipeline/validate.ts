import type { BrandSEOContent } from './types';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

/** Hard checks before applying a brand SEO module. */
export function validateBrandContent(
  content: BrandSEOContent,
  expectedHandle: string,
  matchCount: number
): ValidationResult {
  const errors: string[] = [];

  if (content.handle !== expectedHandle) {
    errors.push(`handle mismatch: got "${content.handle}", expected "${expectedHandle}"`);
  }
  if (!content.title?.trim()) errors.push('title is required');
  if (!content.meta_title?.trim()) errors.push('meta_title is required');
  if (!content.meta_description?.trim()) errors.push('meta_description is required');
  if (!content.h1_title?.trim()) errors.push('h1_title is required');
  if (!content.quick_answer?.trim()) errors.push('quick_answer is required');
  if (!content.short_description?.includes('<!--read-more-trigger-->')) {
    errors.push('short_description must include <!--read-more-trigger-->');
  }
  if (!content.long_description?.includes('<ul>')) {
    errors.push('long_description must include at least one <ul>');
  }
  if (!content.rules?.length) errors.push('rules must be non-empty');
  if (!content.faq_items?.length) errors.push('faq_items must be non-empty');
  if (matchCount <= 0) errors.push('product match count must be > 0');

  const processWords = /\b(GSC|search demand|Ahrefs|impressions)\b/i;
  const blob = [
    content.meta_title,
    content.meta_description,
    content.quick_answer,
    content.short_description,
    content.long_description,
  ].join('\n');
  if (processWords.test(blob)) {
    errors.push('content contains process/SEO tooling language');
  }

  return { ok: errors.length === 0, errors };
}
