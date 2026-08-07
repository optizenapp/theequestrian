import { z } from 'zod';
import type {
  CollectionEnrichmentPayload,
  ProductCollectiveEnrichmentPayload,
  ProductEnrichmentPayload,
  ProductMetadataEnrichmentPayload,
} from '@/lib/seo-enrichment/types';

const internalLinkSuggestionSchema = z.object({
  target_path: z.string().min(1).max(500),
  anchor_text: z.string().min(1).max(200),
  context: z.string().max(500).optional().default(''),
  link_type: z
    .enum(['contextual', 'navigational', 'hub_spoke', 'related', 'breadcrumb'])
    .optional()
    .default('contextual'),
});

const productSchema = z.object({
  meta_title: z.string().min(1),
  meta_description: z.string().min(1),
  title_override: z.string(),
  description_html: z.string().max(30000),
  top_description_html: z.string().max(15000).default(''),
  bottom_description_html: z.string().max(15000).default(''),
  bullet_points: z.array(z.string().min(1).max(180)).max(10),
  internal_link_suggestions: z.array(internalLinkSuggestionSchema).max(10).default([]),
  reasoning: z.string().max(1000).optional(),
});

const collectionSchema = z.object({
  h1_title: z.string().min(1),
  meta_title: z.string().min(1),
  meta_description: z.string().min(1),
  short_description: z.string().min(1),
  long_description: z.string().min(1).max(40000),
  faq_items: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .max(8)
    .default([]),
  related_categories: z
    .array(
      z.object({
        url: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .max(8)
    .default([]),
  internal_link_suggestions: z.array(internalLinkSuggestionSchema).max(10).default([]),
  reasoning: z.string().max(1000).optional(),
});

function sanitizeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .trim();
}

const productMetadataSchema = z.object({
  meta_title: z.string().min(1),
  meta_description: z.string().min(1),
  title_override: z.string(),
  bullet_points: z.array(z.string().min(1).max(180)).min(3).max(10),
  reasoning: z.string().max(1000).optional(),
});

const productCollectiveAugmentSchema = z.object({
  top_description_html: z.string().max(15000).default(''),
  bottom_description_html: z.string().max(15000).default(''),
  reasoning: z.string().max(1000).optional(),
});

export function validateProductCollectiveAugmentPayload(input: unknown): {
  top_description_html: string;
  bottom_description_html: string;
  reasoning?: string;
} {
  const parsed = productCollectiveAugmentSchema.parse(input);
  return {
    top_description_html: sanitizeHtml(parsed.top_description_html),
    bottom_description_html: sanitizeHtml(parsed.bottom_description_html),
    reasoning: parsed.reasoning,
  };
}

export function buildCollectiveEnrichmentPayload(input: {
  metadata: ProductMetadataEnrichmentPayload;
  top_description_html?: string;
  bottom_description_html?: string;
  description_html?: string;
  use_headless_description?: boolean;
  use_headless_top_description?: boolean;
  use_headless_bottom_description?: boolean;
  normalisation_steps?: string[];
}): ProductCollectiveEnrichmentPayload {
  return {
    ...input.metadata,
    top_description_html: input.top_description_html || '',
    bottom_description_html: input.bottom_description_html || '',
    description_html: input.description_html || '',
    use_headless_description: input.use_headless_description ?? false,
    use_headless_top_description: input.use_headless_top_description ?? false,
    use_headless_bottom_description: input.use_headless_bottom_description ?? false,
    normalisation_steps: input.normalisation_steps || [],
  };
}
function normalizeBulletPoints(value: unknown): string[] | unknown {
  if (!Array.isArray(value)) return value;
  return value
    .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    .map((b) => b.trim().slice(0, 180))
    .slice(0, 10);
}

export function validateProductMetadataPayload(input: unknown): ProductMetadataEnrichmentPayload {
  // Truncate oversized bullet arrays before Zod — models occasionally return >10.
  const normalized =
    input && typeof input === 'object'
      ? {
          ...(input as Record<string, unknown>),
          bullet_points: normalizeBulletPoints((input as { bullet_points?: unknown }).bullet_points),
        }
      : input;
  const parsed = productMetadataSchema.parse(normalized);
  return {
    meta_title: parsed.meta_title.substring(0, 68),
    meta_description: parsed.meta_description.substring(0, 158),
    title_override: parsed.title_override.substring(0, 200),
    bullet_points: parsed.bullet_points,
    reasoning: parsed.reasoning,
  };
}

export function validateProductPayload(input: unknown): ProductEnrichmentPayload {
  const parsed = productSchema.parse(input);
  return {
    ...parsed,
    meta_title: parsed.meta_title.substring(0, 68),
    meta_description: parsed.meta_description.substring(0, 158),
    description_html: sanitizeHtml(parsed.description_html),
    top_description_html: sanitizeHtml(parsed.top_description_html),
    bottom_description_html: sanitizeHtml(parsed.bottom_description_html),
  };
}

export function validateCollectionPayload(input: unknown): CollectionEnrichmentPayload {
  const parsed = collectionSchema.parse(input);
  return {
    ...parsed,
    h1_title: parsed.h1_title.substring(0, 120),
    meta_title: parsed.meta_title.substring(0, 68),
    meta_description: parsed.meta_description.substring(0, 158),
    short_description: parsed.short_description.substring(0, 1200),
    long_description: sanitizeHtml(parsed.long_description),
    faq_items: parsed.faq_items.map(item => ({
      question: item.question.substring(0, 240),
      answer: item.answer.substring(0, 2000),
    })),
    related_categories: parsed.related_categories.map(cat => ({
      url: cat.url.substring(0, 300),
      title: cat.title.substring(0, 200),
      description: cat.description?.substring(0, 300),
    })),
  };
}

