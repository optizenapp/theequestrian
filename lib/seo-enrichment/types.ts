export type EnrichmentPageType = 'product' | 'collection';
export type EnrichmentMode = 'dry-run' | 'shadow' | 'apply';

export interface QueuePageCandidate {
  pageType: EnrichmentPageType;
  pageIdentifier: string;
  canonicalPath: string;
  lastEnrichedAt: string | null;
}

export interface GscQueryMetric {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
}

export interface GscMetrics {
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number;
  avgCtr: number;
  topQueries: GscQueryMetric[];
  highImpressionLowPosition: Array<{ query: string; impressions: number; position: number }>;
  highImpressionLowCtr: Array<{ query: string; impressions: number; position: number; ctr: number }>;
}

export interface Ga4Metrics {
  sessions: number;
  revenue: number;
  conversions: number;
  bounceRate: number;
  avgSessionDuration: number;
  addToCarts: number;
  transactions: number;
}

export interface QueuePageWithMetrics extends QueuePageCandidate {
  gscData: GscMetrics;
  ga4Data: Ga4Metrics;
  priorityScore: number;
  priorityReasons: Record<string, unknown>;
}

export interface QueueItem {
  id: number;
  page_type: EnrichmentPageType;
  page_identifier: string;
  canonical_path: string;
  priority_score: number;
  priority_reasons: Record<string, unknown>;
  gsc_data: GscMetrics;
  ga4_data: Ga4Metrics;
}

export interface ProductEnrichmentPayload {
  meta_title: string;
  meta_description: string;
  title_override: string;
  description_html: string;
  top_description_html: string;
  bottom_description_html: string;
  bullet_points: string[];
  internal_link_suggestions: InternalLinkSuggestion[];
  reasoning?: string;
}

export interface CollectionFaqItem {
  question: string;
  answer: string;
}

export interface CollectionRelatedCategory {
  url: string;
  title: string;
  description?: string;
}

export interface CollectionEnrichmentPayload {
  h1_title: string;
  meta_title: string;
  meta_description: string;
  short_description: string;
  long_description: string;
  faq_items: CollectionFaqItem[];
  related_categories: CollectionRelatedCategory[];
  internal_link_suggestions: InternalLinkSuggestion[];
  reasoning?: string;
}

export interface InternalLinkSuggestion {
  target_path: string;
  anchor_text: string;
  context?: string;
  link_type?: 'contextual' | 'navigational' | 'hub_spoke' | 'related' | 'breadcrumb';
}

export interface EnrichmentUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface KorayRule {
  id: string;
  title: string;
  guidance: string;
  tags: string[];
  appliesTo: Array<'product' | 'collection' | 'serp'>;
  sourcePages: number[];
}

export interface KoraySelection {
  frameworkVersion: string;
  intent: 'transactional' | 'informational' | 'commercial' | 'mixed';
  rules: KorayRule[];
}

export interface KorayComplianceCheck {
  id: string;
  label: string;
  score: number;
  passed: boolean;
  detail: string;
}

export interface KorayComplianceResult {
  score: number;
  passed: boolean;
  issues: string[];
  checks: KorayComplianceCheck[];
}

export interface EnrichmentResult {
  pageType: EnrichmentPageType;
  pageIdentifier: string;
  canonicalPath: string;
  beforeContent: Record<string, unknown>;
  payload: ProductEnrichmentPayload | CollectionEnrichmentPayload;
  usage: EnrichmentUsage;
  serpAnalysis: Record<string, unknown>;
  koray: {
    frameworkVersion: string;
    ruleIdsUsed: string[];
    intent: KoraySelection['intent'];
    compliance: KorayComplianceResult;
  };
}

