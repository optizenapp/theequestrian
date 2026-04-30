type ThumbnailMode = 'brand_slides_v1' | 'on_sale_slides_v1' | 'category_slides_v1' | 'default';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'on', 'to', 'in', 'of',
  'at', 'by', 'from', 'is', 'it', 'be', 'as', 'this', 'that', 'our', 'your',
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function compactKeywords(value: string, max = 6): string {
  const words = slugify(value)
    .split('-')
    .filter((w) => w && !STOPWORDS.has(w));
  return words.slice(0, max).join('-');
}

type FilenameContext = {
  mode: ThumbnailMode;
  subjectLine?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
};

export function buildThumbnailFilenameSlug(
  context: FilenameContext,
  variant: 'landscape_16_9' | 'vertical_9_16',
  kind: 'frame' | 'custom'
): string {
  const tokens: string[] = [];
  if (context.mode === 'brand_slides_v1' && context.brandName) {
    tokens.push(slugify(context.brandName));
  } else if (context.mode === 'category_slides_v1' && context.categoryName) {
    tokens.push(slugify(context.categoryName));
  } else if (context.mode === 'on_sale_slides_v1') {
    tokens.push('on-sale');
  }
  if (context.subjectLine) {
    tokens.push(compactKeywords(context.subjectLine, 5));
  }
  tokens.push('thumbnail');
  tokens.push(variant === 'vertical_9_16' ? 'shorts' : 'landscape');
  if (kind === 'custom') tokens.push('branded');
  const combined = tokens.filter(Boolean).join('-').replace(/-+/g, '-');
  return combined.slice(0, 80);
}
