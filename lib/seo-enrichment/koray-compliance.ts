import type {
  CollectionEnrichmentPayload,
  EnrichmentPageType,
  KorayComplianceCheck,
  KorayComplianceResult,
  ProductCollectiveEnrichmentPayload,
  ProductEnrichmentPayload,
  ProductMetadataEnrichmentPayload,
} from '@/lib/seo-enrichment/types';
import { evaluateFactFidelity } from '@/lib/seo-enrichment/fact-fidelity';

const FLUFF_PATTERNS = [
  /premium quality/gi,
  /expertly crafted/gi,
  /trusted by professionals/gi,
  /world class/gi,
  /best in class/gi,
];

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countMatches(input: string, pattern: RegExp): number {
  return (input.match(pattern) || []).length;
}

function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function buildCheck(id: string, label: string, score: number, threshold: number, detail: string): KorayComplianceCheck {
  const clipped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id,
    label,
    score: clipped,
    passed: clipped >= threshold,
    detail,
  };
}

function evaluateMacroContext(title: string, description: string): KorayComplianceCheck {
  const titleTokens = new Set(title.toLowerCase().split(/\W+/).filter((v) => v.length > 2));
  const descTokens = new Set(description.toLowerCase().split(/\W+/).filter((v) => v.length > 2));
  const overlap = [...titleTokens].filter((token) => descTokens.has(token)).length;
  const ratio = titleTokens.size ? (overlap / titleTokens.size) * 100 : 0;
  return buildCheck('macro_context', 'Single macro context', ratio, 45, `Token overlap ratio ${ratio.toFixed(1)}%`);
}

function evaluateExtractiveAnswers(html: string): KorayComplianceCheck {
  const headings = [...html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi)].map((m) => m[1]);
  if (!headings.length) {
    return buildCheck('extractive_answers', 'Extractive answers after headings', 50, 40, 'No h2/h3 headings found.');
  }
  const sentenceLengths = [...html.matchAll(/<\/h[23]>\s*<p[^>]*>(.*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]).split(/\s+/).length)
    .filter((n) => n > 0);
  const avgLen = average(sentenceLengths);
  const score = avgLen >= 18 && avgLen <= 60 ? 85 : avgLen > 0 ? 60 : 35;
  return buildCheck(
    'extractive_answers',
    'Extractive answers after headings',
    score,
    60,
    `Headings=${headings.length}, avg first paragraph words=${avgLen.toFixed(1)}`
  );
}

function evaluateEav(bullets: string[]): KorayComplianceCheck {
  if (!bullets.length) {
    return buildCheck('eav', 'Entity-Attribute-Value coverage', 20, 60, 'No bullet points present.');
  }
  const attrLike = bullets.filter((b) => b.includes(':')).length;
  const numericLike = bullets.filter((b) => /\d/.test(b)).length;
  const score = ((attrLike / bullets.length) * 60) + ((numericLike / bullets.length) * 40);
  return buildCheck(
    'eav',
    'Entity-Attribute-Value coverage',
    score,
    60,
    `Attribute bullets=${attrLike}/${bullets.length}, numeric bullets=${numericLike}/${bullets.length}`
  );
}

function evaluateInternalLinks(paths: string[]): KorayComplianceCheck {
  if (!paths.length) {
    return buildCheck('internal_links', 'Internal linking relevance', 40, 50, 'No internal links suggested.');
  }
  const valid = paths.filter((p) => p.startsWith('/') && !p.startsWith('//')).length;
  const score = (valid / paths.length) * 100;
  return buildCheck('internal_links', 'Internal linking relevance', score, 70, `Valid internal paths=${valid}/${paths.length}`);
}

function evaluateTitleDistinctness(h1: string, metaTitle: string): KorayComplianceCheck {
  const h1Norm = h1.toLowerCase().trim();
  const metaNorm = metaTitle.toLowerCase().trim();
  const identical = h1Norm === metaNorm;
  const score = identical ? 35 : h1Norm.length > 0 && metaNorm.includes(h1Norm.split(/\s+/)[0] || '') ? 85 : 70;
  return buildCheck(
    'title_distinctness',
    'H1 distinct from meta title',
    score,
    60,
    identical ? 'H1 and meta_title are identical' : 'H1 and meta_title serve different roles'
  );
}

function evaluateHeadingHygiene(augmentHtml: string): KorayComplianceCheck {
  const hasH2 = /<h2\b/i.test(augmentHtml);
  const score = hasH2 ? 40 : augmentHtml.trim() ? 85 : 70;
  return buildCheck(
    'heading_hygiene',
    'Augment blocks use h3 only (no h2)',
    score,
    60,
    hasH2 ? 'Found h2 in augment HTML — use h3 only' : 'No h2 in augment blocks'
  );
}
function evaluateFluff(allText: string): KorayComplianceCheck {
  const hits = FLUFF_PATTERNS.reduce((sum, p) => sum + countMatches(allText, p), 0);
  const score = Math.max(0, 100 - hits * 20);
  return buildCheck('fluff', 'Low fluff and certainty', score, 65, `Fluff phrase hits=${hits}`);
}

export function evaluateKorayCompliance(
  pageType: EnrichmentPageType,
  payload: ProductEnrichmentPayload | CollectionEnrichmentPayload
): KorayComplianceResult {
  const checks: KorayComplianceCheck[] = [];
  if (pageType === 'product') {
    const productPayload = payload as ProductEnrichmentPayload;
    const topText = `${productPayload.title_override} ${productPayload.meta_title} ${productPayload.meta_description} ${productPayload.description_html}`;

    checks.push(
      evaluateMacroContext(
        productPayload.title_override,
        productPayload.description_html
      )
    );
    checks.push(evaluateExtractiveAnswers(productPayload.bottom_description_html));
    checks.push(evaluateEav(productPayload.bullet_points));
    checks.push(
      evaluateInternalLinks(
        productPayload.internal_link_suggestions.map((l) => l.target_path)
      )
    );
    checks.push(evaluateFluff(stripHtml(topText)));
  } else {
    const collectionPayload = payload as CollectionEnrichmentPayload;
    const topText = `${collectionPayload.h1_title} ${collectionPayload.meta_title} ${collectionPayload.meta_description} ${collectionPayload.long_description}`;

    checks.push(
      evaluateMacroContext(
        collectionPayload.h1_title,
        collectionPayload.long_description
      )
    );
    checks.push(evaluateExtractiveAnswers(collectionPayload.long_description));
    checks.push(
      evaluateEav(
        collectionPayload.faq_items.map((f) => `${f.question}: ${f.answer}`)
      )
    );
    checks.push(
      evaluateInternalLinks(
        collectionPayload.internal_link_suggestions.map((l) => l.target_path)
      )
    );
    checks.push(evaluateFluff(stripHtml(topText)));
  }

  const score = Math.round(average(checks.map((c) => c.score)));
  const issues = checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`);
  return {
    score,
    passed: score >= 72 && issues.length <= 2,
    issues,
    checks,
  };
}

/** Lighter compliance gate for metadata-only enrichment (no HTML body generated). */
export function evaluateMetadataOnlyCompliance(
  payload: ProductMetadataEnrichmentPayload,
  vendorDescription: string
): KorayComplianceResult {
  const checks: KorayComplianceCheck[] = [];
  const contextText = vendorDescription || payload.meta_description;

  checks.push(evaluateMacroContext(payload.title_override, contextText));
  checks.push(evaluateEav(payload.bullet_points));
  checks.push(evaluateTitleDistinctness(payload.title_override, payload.meta_title));
  checks.push(
    evaluateFluff(
      `${payload.title_override} ${payload.meta_title} ${payload.meta_description} ${payload.bullet_points.join(' ')}`
    )
  );

  const score = Math.round(average(checks.map((c) => c.score)));
  const issues = checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`);
  return {
    score,
    passed: score >= 60 && issues.length <= 1,
    issues,
    checks,
  };
}

/** Compliance for Collective augment mode — structure + hard fact-fidelity gate. */
export function evaluateCollectiveAugmentCompliance(
  payload: ProductCollectiveEnrichmentPayload,
  vendorDescription: string
): KorayComplianceResult {
  const augmentHtml = `${payload.top_description_html}\n${payload.bottom_description_html}`;
  const checks: KorayComplianceCheck[] = [];

  checks.push(evaluateMetadataOnlyCompliance(payload, vendorDescription).checks[0]);
  checks.push(evaluateEav(payload.bullet_points));
  checks.push(evaluateTitleDistinctness(payload.title_override, payload.meta_title));
  checks.push(evaluateExtractiveAnswers(payload.bottom_description_html || augmentHtml));
  checks.push(evaluateHeadingHygiene(augmentHtml));

  const fidelity = evaluateFactFidelity(augmentHtml, vendorDescription);
  checks.push(
    buildCheck(
      'fact_fidelity',
      'Fact fidelity (augment grounded in vendor source)',
      fidelity.passed ? 100 : 0,
      100,
      fidelity.passed
        ? `Checked ${fidelity.checkedPairs} attribute pairs — all grounded`
        : `Unsourced claims: ${fidelity.unsourcedClaims.slice(0, 3).join('; ')}`
    )
  );

  checks.push(
    evaluateFluff(
      `${payload.title_override} ${payload.meta_title} ${payload.bullet_points.join(' ')} ${stripHtml(augmentHtml)}`
    )
  );

  const hardFail = !fidelity.passed;
  const score = hardFail ? 0 : Math.round(average(checks.map((c) => c.score)));
  const issues = checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`);
  if (hardFail && fidelity.unsourcedClaims.length) {
    issues.unshift(`Fact fidelity hard fail: ${fidelity.unsourcedClaims.join('; ')}`);
  }

  return {
    score,
    passed: !hardFail && score >= 72 && issues.length <= 2,
    issues,
    checks,
  };
}
