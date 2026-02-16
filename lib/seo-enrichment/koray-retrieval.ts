import framework from '@/lib/seo-enrichment/koray-framework.json';
import type { EnrichmentPageType, GscMetrics, KorayRule, KoraySelection } from '@/lib/seo-enrichment/types';

type KorayFrameworkData = {
  frameworkVersion: string;
  source: string;
  rules: KorayRule[];
};

const data = framework as KorayFrameworkData;

function inferIntent(gsc: GscMetrics): KoraySelection['intent'] {
  const queries = (gsc.topQueries || []).map((q) => q.query.toLowerCase());
  if (queries.length === 0) return 'mixed';
  const hasInformational = queries.some((q) =>
    ['how ', 'what ', 'why ', 'when ', 'guide', 'tips', 'difference'].some((k) => q.includes(k))
  );
  const hasTransactional = queries.some((q) =>
    ['buy', 'price', 'sale', 'shop', 'best ', 'discount', 'review'].some((k) => q.includes(k))
  );
  const hasCommercial = queries.some((q) => ['best', 'vs', 'compare', 'top'].some((k) => q.includes(k)));

  if (hasTransactional && !hasInformational) return 'transactional';
  if (hasInformational && !hasTransactional) return 'informational';
  if (hasCommercial) return 'commercial';
  return 'mixed';
}

function scoreRule(
  rule: KorayRule,
  pageType: EnrichmentPageType | 'serp',
  intent: KoraySelection['intent'],
  hasQuickWins: boolean
): number {
  let score = 0;
  if (rule.appliesTo.includes(pageType)) score += 6;
  if (rule.tags.includes('retrieval_cost')) score += 2;
  if (pageType === 'collection' && (rule.tags.includes('hub_spoke') || rule.tags.includes('topical_map'))) score += 4;
  if (pageType === 'product' && (rule.tags.includes('eav') || rule.tags.includes('numeric_values'))) score += 4;
  if (intent === 'informational' && rule.tags.includes('extractive_answers')) score += 3;
  if (intent === 'transactional' && rule.tags.includes('specificity')) score += 3;
  if (hasQuickWins && rule.tags.includes('headings')) score += 2;
  return score;
}

export function selectKorayRules(
  pageType: EnrichmentPageType | 'serp',
  gsc: GscMetrics,
  maxRules = 8
): KoraySelection {
  const intent = inferIntent(gsc);
  const hasQuickWins = (gsc.highImpressionLowPosition || []).length > 0 || (gsc.highImpressionLowCtr || []).length > 0;
  const ranked = data.rules
    .map((rule) => ({ rule, score: scoreRule(rule, pageType, intent, hasQuickWins) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRules)
    .map((entry) => entry.rule);

  // Ensure foundational rules always exist.
  const mustInclude = ['K001', 'K005', 'K013'];
  for (const id of mustInclude) {
    const rule = data.rules.find((r) => r.id === id && r.appliesTo.includes(pageType));
    if (rule && !ranked.some((r) => r.id === id)) {
      ranked.push(rule);
    }
  }

  return {
    frameworkVersion: data.frameworkVersion,
    intent,
    rules: ranked.slice(0, maxRules),
  };
}

export function buildKorayRuleBlock(selection: KoraySelection): string {
  const lines = selection.rules.map((rule) => `- ${rule.id}: ${rule.title} -> ${rule.guidance}`);
  return `KorayFrameworkVersion: ${selection.frameworkVersion}
DetectedIntent: ${selection.intent}
SelectedKorayRules:
${lines.join('\n')}`;
}

