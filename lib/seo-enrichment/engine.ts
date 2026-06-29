import OpenAI from 'openai';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import {
  fetchCollectionForEnrichment,
  fetchProductForEnrichment,
} from '@/lib/seo-enrichment/db';
import { evaluateCollectiveAugmentCompliance, evaluateKorayCompliance, evaluateMetadataOnlyCompliance } from '@/lib/seo-enrichment/koray-compliance';
import { normaliseVendorDescription } from '@/lib/seo-enrichment/description-normalisation';
import { buildKorayRuleBlock, selectKorayRules } from '@/lib/seo-enrichment/koray-retrieval';
import { buildKoraySystemPromptWithSelection } from '@/lib/seo-enrichment/koray';
import { log } from '@/lib/seo-enrichment/logger';
import { buildCollectiveEnrichmentPayload, validateProductCollectiveAugmentPayload, validateCollectionPayload, validateProductMetadataPayload, validateProductPayload } from '@/lib/seo-enrichment/validation';
import { findRelevantPages, getLinkableSitemap } from '@/lib/seo-enrichment/sitemap-cache';
import { getProductByHandle } from '@/lib/shopify/products';
import type { EnrichmentResult, ProductCollectiveEnrichmentPayload, QueueItem } from '@/lib/seo-enrichment/types';

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in model response');
    return JSON.parse(match[0]);
  }
}

function estimateCost(inputTokens: number, outputTokens: number): number {
  return Number(
    (
      (inputTokens / 1000) * seoEnrichmentConfig.inputCostPer1k +
      (outputTokens / 1000) * seoEnrichmentConfig.outputCostPer1k
    ).toFixed(6)
  );
}

export class EnrichmentEngine {
  private readonly openai: OpenAI | null;

  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  async enrichQueueItem(
    item: QueueItem,
    serpAnalysis: Record<string, unknown>
  ): Promise<EnrichmentResult | null> {
    if (item.page_type === 'product') {
      return this.enrichProduct(item, serpAnalysis);
    }
    return this.enrichCollection(item, serpAnalysis);
  }

  private async generateJsonResponse(input: {
    system: string;
    userPayload: Record<string, unknown>;
  }): Promise<{ parsed: unknown; promptTokens: number; completionTokens: number }> {
    if (!this.openai) {
      return { parsed: {}, promptTokens: 0, completionTokens: 0 };
    }
    const completion = await this.openai.chat.completions.create({
      model: seoEnrichmentConfig.openaiModel,
      temperature: 0.2,
      max_tokens: seoEnrichmentConfig.openaiMaxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: JSON.stringify(input.userPayload) },
      ],
    });
    const text = completion.choices[0]?.message?.content || '{}';
    return {
      parsed: parseJson(text),
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
    };
  }

  private async enrichProduct(item: QueueItem, serpAnalysis: Record<string, unknown>): Promise<EnrichmentResult | null> {
    if (seoEnrichmentConfig.metadataOnly) {
      return this.enrichProductMetadataOnly(item, serpAnalysis);
    }
    const row = await fetchProductForEnrichment(item.page_identifier);
    if (!row) return null;
    const selection = selectKorayRules('product', item.gsc_data);
    const selectedRuleBlock = buildKorayRuleBlock(selection);

    // Get linkable sitemap for internal linking suggestions
    const sitemap = await getLinkableSitemap();
    const relevantPages = findRelevantPages(
      item.canonical_path,
      row.title || '',
      row.product_type || '',
      Array.isArray(row.tags) ? row.tags : [],
      sitemap,
      8
    );

    const beforeContent = {
      meta_title: row.meta_title || '',
      meta_description: row.meta_description || '',
      title_override: row.title_override || '',
      description_html: row.description_html || '',
      top_description_html: row.top_description_html || '',
      bottom_description_html: row.bottom_description_html || '',
      bullet_points: row.bullet_points || [],
    };

    if (seoEnrichmentConfig.mode === 'dry-run' || !this.openai) {
      const fallback = validateProductPayload({
        meta_title: String(beforeContent.meta_title || `${row.title} | The Equestrian`).slice(0, 68),
        meta_description: String(beforeContent.meta_description || `Shop ${row.title} at The Equestrian.`).slice(0, 158),
        title_override: String(beforeContent.title_override || row.title || ''),
        description_html: String(beforeContent.description_html || row.description || ''),
        top_description_html: String(beforeContent.top_description_html || ''),
        bottom_description_html: String(beforeContent.bottom_description_html || ''),
        bullet_points: Array.isArray(beforeContent.bullet_points) ? beforeContent.bullet_points : [],
        internal_link_suggestions: [],
        reasoning: 'Dry-run fallback payload from existing values.',
      });
      const compliance = evaluateKorayCompliance('product', fallback);
      return {
        pageType: 'product',
        pageIdentifier: item.page_identifier,
        canonicalPath: item.canonical_path,
        beforeContent,
        payload: fallback,
        usage: { model: 'dry-run-fallback', inputTokens: 0, outputTokens: 0, costUsd: 0 },
        serpAnalysis,
        koray: {
          frameworkVersion: selection.frameworkVersion,
          ruleIdsUsed: selection.rules.map((r) => r.id),
          intent: selection.intent,
          compliance,
        },
      };
    }

    const internalLinkExample = relevantPages.length > 0
      ? `Example: "internal_link_suggestions": [{"target_path": "${relevantPages[0]?.path || '/example'}", "anchor_text": "related product", "context": "why this link is relevant", "link_type": "contextual"}]`
      : '';

    const internalLinkInstructions = relevantPages.length > 0
      ? `internal_link_suggestions: REQUIRED field - DO NOT OMIT. Array of 3-5 objects with {target_path: string, anchor_text: string, context: string, link_type: string}. Select from the ${relevantPages.length} linkable_pages provided. ${internalLinkExample}`
      : 'internal_link_suggestions: Return empty array [].';

    const internalLinkEmbedding = relevantPages.length > 0
      ? `CRITICAL: You MUST embed 3-5 contextual internal links directly in the HTML content (description_html, top_description_html, or bottom_description_html). Use <a href="/path">anchor text</a> format. Select from the ${relevantPages.length} linkable_pages provided. Links should be naturally integrated into sentences, not listed separately. Example: "This product pairs well with our <a href="/horse/stable/hoof-care/hoof-oil">premium hoof oil</a> for complete care."`
      : '';

    const baseSystem = buildKoraySystemPromptWithSelection(
      'You are an ecommerce SEO editor for product pages.',
      selectedRuleBlock,
      [
        'CRITICAL: Your JSON response MUST include ALL these keys: meta_title, meta_description, title_override, description_html, top_description_html, bottom_description_html, bullet_points, internal_link_suggestions, reasoning.',
        'Meta title max 68 chars and meta description max 158 chars.',
        'bullet_points: array of plain strings in E-A-V format (e.g. "Material: Premium leather", "Size: 45cm"). Max 10 items, each under 180 chars.',
        internalLinkInstructions,
        internalLinkEmbedding,
        'description_html, top_description_html, bottom_description_html: rich HTML with <h2>/<h3> headings (NOT <h1>) and extractive answers. MUST include contextual internal links embedded naturally in the content. Start directly with content, no redundant product name headings.',
        'Avoid fluff and generic claims; keep statements verifiable.',
      ]
    );
    const baseUserPayload = {
      page_type: 'product',
      page_identifier: item.page_identifier,
      canonical_path: item.canonical_path,
      performance: { gsc: item.gsc_data, ga4: item.ga4_data },
      serp_analysis: serpAnalysis,
      product: {
        title: row.title,
        vendor: row.vendor,
        product_type: row.product_type,
        tags: row.tags,
        description: row.description,
      },
      current_content: beforeContent,
      linkable_pages: relevantPages.map((p) => ({
        path: p.path,
        title: p.title,
        type: p.type,
        category: p.category,
      })),
      constraints: {
        meta_title_max: 68,
        meta_description_max: 158,
        bullet_points_max: 10,
        heading_style: 'question-led where context allows',
        extractive_answer_preference: true,
      },
    };

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const firstPass = await this.generateJsonResponse({ system: baseSystem, userPayload: baseUserPayload });
    totalPromptTokens += firstPass.promptTokens;
    totalCompletionTokens += firstPass.completionTokens;
    let payload = validateProductPayload(firstPass.parsed);
    let compliance = evaluateKorayCompliance('product', payload);

    if (
      compliance.score < seoEnrichmentConfig.korayComplianceThreshold &&
      seoEnrichmentConfig.maxRegenerationAttempts > 0
    ) {
      const secondPass = await this.generateJsonResponse({
        system: baseSystem,
        userPayload: {
          ...baseUserPayload,
          previous_output: payload,
          compliance_feedback: compliance,
          instruction:
            'Regenerate to fix failed compliance checks while preserving factual accuracy and intent alignment.',
        },
      });
      totalPromptTokens += secondPass.promptTokens;
      totalCompletionTokens += secondPass.completionTokens;
      payload = validateProductPayload(secondPass.parsed);
      compliance = evaluateKorayCompliance('product', payload);
    }

    return {
      pageType: 'product',
      pageIdentifier: item.page_identifier,
      canonicalPath: item.canonical_path,
      beforeContent,
      payload,
      usage: {
        model: seoEnrichmentConfig.openaiModel,
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
        costUsd: estimateCost(totalPromptTokens, totalCompletionTokens),
      },
      serpAnalysis,
      koray: {
        frameworkVersion: selection.frameworkVersion,
        ruleIdsUsed: selection.rules.map((r) => r.id),
        intent: selection.intent,
        compliance,
      },
    };
  }

  /** Collective metadata enrichment: title, meta, bullets; optional augment + description normalisation */
  private async enrichProductMetadataOnly(
    item: QueueItem,
    serpAnalysis: Record<string, unknown>
  ): Promise<EnrichmentResult | null> {
    const row = await fetchProductForEnrichment(item.page_identifier);
    if (!row) return null;

    const selection = selectKorayRules('product', item.gsc_data);
    const selectedRuleBlock = buildKorayRuleBlock(selection);
    const vendorDescription = String(row.description || '').slice(0, 4000);
    const shopifyProduct = await getProductByHandle(item.page_identifier);
    const vendorDescriptionHtml = String(
      shopifyProduct?.descriptionHtml || row.description_html || row.description || ''
    ).slice(0, 8000);
    const useAugment = seoEnrichmentConfig.collectiveAugment;
    const useNormalise = seoEnrichmentConfig.normaliseDescription;

    const beforeContent = {
      meta_title: row.meta_title || '',
      meta_description: row.meta_description || '',
      title_override: row.title_override || '',
      bullet_points: row.bullet_points || [],
      top_description_html: row.top_description_html || '',
      bottom_description_html: row.bottom_description_html || '',
      description_html: row.description_html || '',
    };

    const buildResult = (
      collective: ProductCollectiveEnrichmentPayload,
      usage: EnrichmentResult['usage'],
      compliance: EnrichmentResult['koray']['compliance']
    ): EnrichmentResult => ({
      pageType: 'product',
      pageIdentifier: item.page_identifier,
      canonicalPath: item.canonical_path,
      beforeContent,
      payload: {
        meta_title: collective.meta_title,
        meta_description: collective.meta_description,
        title_override: collective.title_override,
        description_html: collective.description_html,
        top_description_html: collective.top_description_html,
        bottom_description_html: collective.bottom_description_html,
        bullet_points: collective.bullet_points,
        internal_link_suggestions: [],
        reasoning: collective.reasoning,
      },
      usage,
      serpAnalysis,
      koray: {
        frameworkVersion: selection.frameworkVersion,
        ruleIdsUsed: selection.rules.map((r) => r.id),
        intent: selection.intent,
        compliance,
      },
      collective,
    });

    if (seoEnrichmentConfig.mode === 'dry-run' || !this.openai) {
      const metadata = validateProductMetadataPayload({
        meta_title: String(beforeContent.meta_title || `${row.title} | The Equestrian`).slice(0, 68),
        meta_description: String(
          beforeContent.meta_description || `Shop ${row.title} at The Equestrian.`
        ).slice(0, 158),
        title_override: String(beforeContent.title_override || row.title || ''),
        bullet_points: Array.isArray(beforeContent.bullet_points) && beforeContent.bullet_points.length >= 3
          ? beforeContent.bullet_points
          : [
              `Brand: ${row.vendor || 'Quality equestrian brand'}`,
              `Type: ${row.product_type || 'Equestrian product'}`,
              `Available at The Equestrian with fast AU shipping`,
            ],
        reasoning: 'Dry-run Collective metadata fallback from existing values.',
      });
      const normalised = useNormalise ? normaliseVendorDescription(vendorDescriptionHtml) : null;
      const collective = buildCollectiveEnrichmentPayload({
        metadata,
        top_description_html: useAugment ? String(beforeContent.top_description_html || '') : '',
        bottom_description_html: useAugment ? String(beforeContent.bottom_description_html || '') : '',
        description_html: normalised?.changed ? normalised.html : '',
        use_headless_description: Boolean(normalised?.changed),
        use_headless_top_description: useAugment && Boolean(beforeContent.top_description_html),
        use_headless_bottom_description: useAugment && Boolean(beforeContent.bottom_description_html),
        normalisation_steps: normalised?.steps || [],
      });
      const compliance = useAugment
        ? evaluateCollectiveAugmentCompliance(collective, vendorDescription)
        : evaluateMetadataOnlyCompliance(metadata, vendorDescription);
      return buildResult(collective, { model: 'dry-run-fallback', inputTokens: 0, outputTokens: 0, costUsd: 0 }, compliance);
    }

    const metadataSystem = buildKoraySystemPromptWithSelection(
      'You are an ecommerce SEO editor for product pages on an Australian equestrian marketplace (Shopify Collective supplier copy).',
      selectedRuleBlock,
      [
        'CRITICAL: Return JSON with ONLY these keys: meta_title, meta_description, title_override, bullet_points, reasoning.',
        'Do NOT generate description_html or any HTML body content — the vendor product description is shown separately on the page.',
        'Use vendor_description ONLY as factual context. Extract materials, sizes, certifications, and features — never invent specs.',
        'title_override (H1): name the central entity + key attribute. Entity-complete, no brand stuffing, no fluff. e.g. "Roeck-Grip Unlined Riding Gloves".',
        'meta_title (≤68 chars): win the SERP click — add qualifying context (use-case, material, audience). Must NOT duplicate title_override verbatim.',
        'meta_description (≤158 chars): compelling click-through copy with a differentiator. Australian English.',
        'bullet_points: 5–8 plain strings in Entity-Attribute-Value format ("Material: Goatskin leather"). Only state facts present in vendor_description. No markdown. No fluff like "premium quality".',
        'Bullets should re-represent prose facts in structured form — same facts, different structure. Prioritise spec-style attributes over benefit claims.',
        'Use Australian spelling.',
      ]
    );

    const metadataUserPayload = {
      page_type: 'product',
      enrichment_mode: 'collective_metadata',
      page_identifier: item.page_identifier,
      canonical_path: item.canonical_path,
      performance: { gsc: item.gsc_data, ga4: item.ga4_data },
      serp_analysis: serpAnalysis,
      product: {
        title: row.title,
        vendor: row.vendor,
        product_type: row.product_type,
        tags: row.tags,
        vendor_description: vendorDescription,
      },
      current_content: beforeContent,
      constraints: {
        meta_title_max: 68,
        meta_description_max: 158,
        bullet_points_min: 5,
        bullet_points_max: 8,
        h1_must_differ_from_meta_title: true,
      },
    };

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const firstPass = await this.generateJsonResponse({ system: metadataSystem, userPayload: metadataUserPayload });
    totalPromptTokens += firstPass.promptTokens;
    totalCompletionTokens += firstPass.completionTokens;
    let metadataPayload = validateProductMetadataPayload(firstPass.parsed);
    let compliance = evaluateMetadataOnlyCompliance(metadataPayload, vendorDescription);

    if (
      compliance.score < seoEnrichmentConfig.korayComplianceThreshold &&
      seoEnrichmentConfig.maxRegenerationAttempts > 0
    ) {
      const secondPass = await this.generateJsonResponse({
        system: metadataSystem,
        userPayload: {
          ...metadataUserPayload,
          previous_output: metadataPayload,
          compliance_feedback: compliance,
          instruction: 'Regenerate metadata and bullets only. Fix compliance. H1 and meta_title must differ. Do not output HTML descriptions.',
        },
      });
      totalPromptTokens += secondPass.promptTokens;
      totalCompletionTokens += secondPass.completionTokens;
      metadataPayload = validateProductMetadataPayload(secondPass.parsed);
      compliance = evaluateMetadataOnlyCompliance(metadataPayload, vendorDescription);
    }

    let topHtml = '';
    let bottomHtml = '';

    if (useAugment) {
      const augmentSystem = buildKoraySystemPromptWithSelection(
        'You are an ecommerce SEO editor adding grounded augment content around unchanged supplier copy.',
        selectedRuleBlock,
        [
          'CRITICAL: Return JSON with ONLY: top_description_html, bottom_description_html, reasoning.',
          'Generate net-new questions, framing, and structure. Every fact, value, and claim MUST come from vendor_description.',
          'Do NOT introduce specs, materials, dimensions, certifications, compatibility, or claims not present in the source.',
          'Do NOT rewrite or paraphrase supplier sentences.',
          'top_description_html: optional short framing intro (0–2 sentences in <p> tags). Omit if not needed.',
          'bottom_description_html: main augment block with 2–4 extractive-answer Q&A pairs using <h3>question</h3><p>short direct answer</p>. Use <h3> only — never <h2> or <h1>.',
          'Optionally add a use-case/context paragraph after Q&A. Australian English.',
        ]
      );

      const augmentPass = await this.generateJsonResponse({
        system: augmentSystem,
        userPayload: {
          page_type: 'product',
          enrichment_mode: 'collective_augment',
          product: {
            title: row.title,
            vendor: row.vendor,
            product_type: row.product_type,
            vendor_description: vendorDescription,
          },
          generated_metadata: metadataPayload,
        },
      });
      totalPromptTokens += augmentPass.promptTokens;
      totalCompletionTokens += augmentPass.completionTokens;
      const augmentPayload = validateProductCollectiveAugmentPayload(augmentPass.parsed);
      topHtml = augmentPayload.top_description_html;
      bottomHtml = augmentPayload.bottom_description_html;
      if (augmentPayload.reasoning) {
        metadataPayload.reasoning = [metadataPayload.reasoning, augmentPayload.reasoning].filter(Boolean).join(' ');
      }
    }

    const normalised = useNormalise ? normaliseVendorDescription(vendorDescriptionHtml) : null;
    const collective = buildCollectiveEnrichmentPayload({
      metadata: metadataPayload,
      top_description_html: topHtml,
      bottom_description_html: bottomHtml,
      description_html: normalised?.changed ? normalised.html : '',
      use_headless_description: Boolean(normalised?.changed),
      use_headless_top_description: useAugment && Boolean(topHtml.trim()),
      use_headless_bottom_description: useAugment && Boolean(bottomHtml.trim()),
      normalisation_steps: normalised?.steps || [],
    });

    if (useAugment) {
      compliance = evaluateCollectiveAugmentCompliance(collective, vendorDescription);
      if (
        !compliance.passed &&
        seoEnrichmentConfig.maxRegenerationAttempts > 0
      ) {
        log('warn', 'Collective augment failed compliance; metadata-only portion may still apply in shadow', {
          handle: item.page_identifier,
          issues: compliance.issues,
        });
      }
    }

    return buildResult(
      collective,
      {
        model: seoEnrichmentConfig.openaiModel,
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
        costUsd: estimateCost(totalPromptTokens, totalCompletionTokens),
      },
      compliance
    );
  }

  private async enrichCollection(item: QueueItem, serpAnalysis: Record<string, unknown>): Promise<EnrichmentResult | null> {
    const row = await fetchCollectionForEnrichment(item.page_identifier);
    if (!row) return null;
    const selection = selectKorayRules('collection', item.gsc_data);
    const selectedRuleBlock = buildKorayRuleBlock(selection);

    // Get linkable sitemap for internal linking suggestions
    const sitemap = await getLinkableSitemap();
    const relevantPages = findRelevantPages(
      item.canonical_path,
      row.h1_title || item.page_identifier,
      '',
      [],
      sitemap,
      10
    );

    const beforeContent = {
      h1_title: row.h1_title || '',
      meta_title: row.meta_title || '',
      meta_description: row.meta_description || '',
      short_description: row.short_description || '',
      long_description: row.long_description || '',
      faq_items: row.faq_items || [],
      related_categories: row.related_categories || [],
    };

    if (seoEnrichmentConfig.mode === 'dry-run' || !this.openai) {
      const fallback = validateCollectionPayload({
        ...beforeContent,
        short_description: String(beforeContent.short_description || `Shop ${row.h1_title} at The Equestrian.`),
        long_description: String(beforeContent.long_description || '<p>Content not generated in dry-run mode.</p>'),
        internal_link_suggestions: [],
        reasoning: 'Dry-run fallback payload from existing values.',
      });
      const compliance = evaluateKorayCompliance('collection', fallback);
      return {
        pageType: 'collection',
        pageIdentifier: item.page_identifier,
        canonicalPath: item.canonical_path,
        beforeContent,
        payload: fallback,
        usage: { model: 'dry-run-fallback', inputTokens: 0, outputTokens: 0, costUsd: 0 },
        serpAnalysis,
        koray: {
          frameworkVersion: selection.frameworkVersion,
          ruleIdsUsed: selection.rules.map((r) => r.id),
          intent: selection.intent,
          compliance,
        },
      };
    }

    const internalLinkInstructions = relevantPages.length > 0
      ? `internal_link_suggestions: REQUIRED field. Array of 5-8 objects with {target_path: string, anchor_text: string, context: string, link_type: string}. Select from the ${relevantPages.length} linkable_pages provided in the user payload. Use link_type: "hub_spoke" for child category pages, "contextual" for related products, "related" for sibling categories.`
      : 'internal_link_suggestions: Return empty array [] if no relevant pages available.';

    const internalLinkEmbedding = relevantPages.length > 0
      ? `CRITICAL: You MUST embed 5-8 contextual internal links directly in the HTML content (short_description and long_description). Use <a href="/path">anchor text</a> format. Select from the ${relevantPages.length} linkable_pages provided. Links should be naturally integrated into sentences. Use hub-spoke linking to child categories and products. Example: "Browse our <a href="/horse/boots/ice-boots">ice boots collection</a> for recovery solutions."`
      : '';

    const baseSystem = buildKoraySystemPromptWithSelection(
      'You are an ecommerce SEO strategist for collection and category hub pages.',
      selectedRuleBlock,
      [
        'CRITICAL: Your JSON response MUST include these exact keys: h1_title, meta_title, meta_description, short_description, long_description, faq_items, related_categories, internal_link_suggestions, reasoning.',
        'Meta title max 68 chars and meta description max 158 chars.',
        'faq_items: array of objects with {question: string, answer: string}. Max 8 items.',
        'related_categories: array of objects with {url: string, title: string, description?: string}. Max 8 items. URL must start with "/".',
        internalLinkInstructions,
        internalLinkEmbedding,
        'short_description: 1-2 sentence intro text WITHOUT headings (no <h1>, <h2>, <h3>). Plain paragraph with optional <strong> emphasis. Keep it concise (150-200 chars). MUST include 1 contextual internal link.',
        'long_description: rich HTML with <h2>/<h3> headings for topical hub structure. MUST include 3-5 contextual internal links embedded naturally in the content.',
        'Treat collection pages as topical hubs and support hub-spoke internal linking to build topical authority.',
        'Use FAQ and section flow that mirrors search sub-intents.',
      ]
    );
    const baseUserPayload = {
      page_type: 'collection',
      page_identifier: item.page_identifier,
      canonical_path: item.canonical_path,
      performance: { gsc: item.gsc_data, ga4: item.ga4_data },
      serp_analysis: serpAnalysis,
      collection: {
        url_path: row.url_path,
        parent_url: row.parent_url,
        category_level: row.category_level,
        status: row.status,
      },
      current_content: beforeContent,
      linkable_pages: relevantPages.map((p) => ({
        path: p.path,
        title: p.title,
        type: p.type,
        category: p.category,
      })),
      constraints: {
        meta_title_max: 68,
        meta_description_max: 158,
        faq_items_max: 8,
        heading_style: 'question-led h2/h3 for discoverability',
        extractive_answer_preference: true,
      },
    };

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const firstPass = await this.generateJsonResponse({ system: baseSystem, userPayload: baseUserPayload });
    totalPromptTokens += firstPass.promptTokens;
    totalCompletionTokens += firstPass.completionTokens;
    let payload = validateCollectionPayload(firstPass.parsed);
    let compliance = evaluateKorayCompliance('collection', payload);

    if (
      compliance.score < seoEnrichmentConfig.korayComplianceThreshold &&
      seoEnrichmentConfig.maxRegenerationAttempts > 0
    ) {
      const secondPass = await this.generateJsonResponse({
        system: baseSystem,
        userPayload: {
          ...baseUserPayload,
          previous_output: payload,
          compliance_feedback: compliance,
          instruction:
            'Regenerate to fix failed compliance checks while preserving factual accuracy and intent alignment.',
        },
      });
      totalPromptTokens += secondPass.promptTokens;
      totalCompletionTokens += secondPass.completionTokens;
      payload = validateCollectionPayload(secondPass.parsed);
      compliance = evaluateKorayCompliance('collection', payload);
    }

    return {
      pageType: 'collection',
      pageIdentifier: item.page_identifier,
      canonicalPath: item.canonical_path,
      beforeContent,
      payload,
      usage: {
        model: seoEnrichmentConfig.openaiModel,
        inputTokens: totalPromptTokens,
        outputTokens: totalCompletionTokens,
        costUsd: estimateCost(totalPromptTokens, totalCompletionTokens),
      },
      serpAnalysis,
      koray: {
        frameworkVersion: selection.frameworkVersion,
        ruleIdsUsed: selection.rules.map((r) => r.id),
        intent: selection.intent,
        compliance,
      },
    };
  }

  reportMissingKeyWarning() {
    if (!process.env.OPENAI_API_KEY) {
      log('warn', 'OPENAI_API_KEY missing; enrichment engine will use dry-run fallback output');
    }
  }
}

