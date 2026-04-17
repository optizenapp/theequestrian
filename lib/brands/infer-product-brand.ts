export type BrandInferenceResult = {
  inferredBrand: string;
  confidence: number;
  evidenceSources: string;
  evidenceText: string;
  needsReview: boolean;
};

export type ProductBrandAuditInput = {
  handle: string;
  title: string;
  descriptionHtml: string;
  vendor: string | null;
  tags: string[];
  titleOverride: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  overrideDescriptionHtml: string | null;
  /** Distinct vendor + brand_content labels, longest first */
  lexicon: string[];
};

const GENERIC_VENDORS = new Set(
  ['unknown', 'generic', 'various', 'unbranded', 'n/a', 'na', 'shopify', ''].map((s) => s.toLowerCase())
);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstSegment(text: string): string {
  const t = text.trim();
  const split = t.split(/\s*[|\u2013\u2014-]\s*/);
  return (split[0] || t).trim();
}

function scoreVendor(vendor: string | null): { brand: string; score: number; src: string } | null {
  const v = vendor?.trim();
  if (!v || GENERIC_VENDORS.has(v.toLowerCase())) return null;
  return { brand: v, score: 0.82, src: 'vendor' };
}

function scoreTitlePrefix(title: string): { brand: string; score: number; src: string } | null {
  const seg = firstSegment(title);
  if (seg.length < 2 || seg.length > 48) return null;
  if (/^\d+[,.]?\d*\s*(ml|g|kg|cm|m|oz|lb)\b/i.test(seg)) return null;
  if (/^[A-Z0-9\s]{12,}$/.test(seg) && !/[a-z]/.test(seg)) return null;
  return { brand: seg, score: 0.68, src: 'title_prefix' };
}

function scoreLexiconMatch(haystack: string, lexicon: string[]): { brand: string; score: number; src: string } | null {
  const lower = haystack.toLowerCase();
  for (const term of lexicon) {
    const t = term.trim();
    if (t.length < 2) continue;
    const idx = lower.indexOf(t.toLowerCase());
    if (idx !== -1) {
      return { brand: t, score: 0.62, src: 'lexicon' };
    }
  }
  return null;
}

function scoreTagBrand(tags: string[]): { brand: string; score: number; src: string } | null {
  const prefixes = ['brand:', 'brand ', 'manufacturer:'];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const p of prefixes) {
      if (lower.startsWith(p)) {
        const rest = tag.slice(p.length).trim();
        if (rest.length > 1) return { brand: rest, score: 0.78, src: 'tag' };
      }
    }
  }
  return null;
}

/**
 * Deterministic brand guess for audit CSV (not LLM).
 */
export function inferProductBrand(input: ProductBrandAuditInput): BrandInferenceResult {
  const desc =
    stripHtml(
      [input.overrideDescriptionHtml, input.descriptionHtml].filter(Boolean).join(' ') || ''
    ) || '';
  const metaBlob = [input.metaTitle, input.metaDescription].filter(Boolean).join(' ') || '';
  const displayTitle = input.titleOverride?.trim() || input.title;
  const candidates: Array<{ brand: string; score: number; src: string }> = [];

  const v = scoreVendor(input.vendor);
  if (v) candidates.push(v);

  const tp = scoreTitlePrefix(displayTitle);
  if (tp) candidates.push(tp);

  const metaSeg = input.metaTitle ? firstSegment(input.metaTitle) : '';
  if (metaSeg && metaSeg.length > 1 && metaSeg.length < 60) {
    candidates.push({ brand: metaSeg, score: 0.64, src: 'meta_title_prefix' });
  }

  const tagB = scoreTagBrand(input.tags);
  if (tagB) candidates.push(tagB);

  const lexHay = `${displayTitle} ${metaBlob} ${desc}`;
  const lex = scoreLexiconMatch(lexHay, input.lexicon);
  if (lex) candidates.push(lex);

  if (candidates.length === 0) {
    return {
      inferredBrand: '',
      confidence: 0,
      evidenceSources: 'none',
      evidenceText: input.handle,
      needsReview: true,
    };
  }

  candidates.sort((a, b) => b.score - a.score || b.brand.length - a.brand.length);
  const best = candidates[0];
  const needsReview = best.score < 0.75;

  return {
    inferredBrand: best.brand,
    confidence: Math.round(best.score * 100) / 100,
    evidenceSources: best.src,
    evidenceText: best.brand.slice(0, 120),
    needsReview,
  };
}
