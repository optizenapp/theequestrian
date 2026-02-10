/**
 * AI Product Classifier
 * Supports chat-completions (gpt-4o) and responses API (gpt-5.2-codex)
 */

import OpenAI from 'openai';

interface ProductFeatures {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  tags: string[];
  collections: string[];
  currentType?: string;
  description?: string;
  descriptionHtml?: string;
  productUrl?: string;
  canonicalCollection?: string;
  seoTitle?: string;
  seoDescription?: string;
  variantTitles?: string[];
  variantOptions?: string[];
  imageUrls?: string[];
  imageAltTexts?: string[];
  overrideBullets?: string[];
  overrideDescriptionHtml?: string;
  overrideTopDescriptionHtml?: string;
  overrideBottomDescriptionHtml?: string;
}

export interface ClassificationResult {
  suggestedType: string;
  confidence: number; // 0-100
  reasoning: string;
  validationStatus: 'auto' | 'claude-validated' | 'needs-review';
  alternativeTypes?: string[];
  brandHandles?: string[];
  categoryTitle?: string;
  categorySlug?: string;
  proposedCanonicalUrl?: string;
  openaiType?: string;
  openaiConfidence?: number;
  claudeType?: string;
  claudeConfidence?: number;
  modelUsed?: ClassificationModel;
  visionEscalated?: boolean;
}

export type ClassificationModel = 'gpt-4o' | 'gpt-5.2-codex';
export interface BrandSeed {
  handle: string;
  title: string;
}

interface ProductClassifierOptions {
  model?: ClassificationModel;
  confidenceReviewThreshold?: number;
  brands?: BrandSeed[];
}

/**
 * Product Classifier using a single configured model
 */
export class ProductClassifier {
  private openai: OpenAI;
  private validProductTypes: string[];
  private model: ClassificationModel;
  private confidenceReviewThreshold: number;
  private validBrandHandles: Set<string>;
  private brands: BrandSeed[];

  constructor(validProductTypes: string[], options: ProductClassifierOptions = {}) {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey: openaiKey });
    this.validProductTypes = validProductTypes;
    this.model = options.model || 'gpt-4o';
    this.confidenceReviewThreshold = options.confidenceReviewThreshold ?? 70;
    this.brands = options.brands || [];
    this.validBrandHandles = new Set(this.brands.map((b) => b.handle));
  }

  /**
   * Classify a single product using the configured model
   */
  async classifyProduct(product: ProductFeatures): Promise<ClassificationResult> {
    console.log(`  🤖 Classifying (${this.model}): ${product.title}`);

    // Build context for AI
    const context = this.buildContext(product);

    try {
      const rawResult = this.model === 'gpt-5.2-codex'
        ? await this.classifyWithCodexResponses(context)
        : await this.classifyWithOpenAIChat(context);
      let normalized = this.normalizeAndValidateResult(rawResult, product.currentType || '');
      let visionEscalated = false;

      if (this.shouldEscalateToVision(normalized, product)) {
        const visionContext = this.buildVisionContext(product, normalized);
        const visionRaw = this.model === 'gpt-5.2-codex'
          ? await this.classifyWithCodexVision(visionContext, product.imageUrls || [])
          : await this.classifyWithOpenAIVision(visionContext, product.imageUrls || []);
        const visionNormalized = this.normalizeAndValidateResult(visionRaw, product.currentType || '');

        if (visionNormalized.confidence >= normalized.confidence) {
          normalized = {
            ...visionNormalized,
            reasoning: `Vision pass used. ${visionNormalized.reasoning}`,
          };
        }
        visionEscalated = true;
      }

      return {
        ...normalized,
        validationStatus: normalized.confidence >= this.confidenceReviewThreshold ? 'auto' : 'needs-review',
        modelUsed: this.model,
        visionEscalated,
      };
    } catch (error) {
      console.error(`    ❌ Error classifying product:`, error);
      return {
        suggestedType: product.currentType || 'NEEDS MANUAL REVIEW',
        confidence: 0,
        reasoning: `Error during classification: ${error}`,
        validationStatus: 'needs-review',
        modelUsed: this.model,
        visionEscalated: false,
      };
    }
  }

  /**
   * Classify multiple products in batch
   */
  async classifyBatch(products: ProductFeatures[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();
    
    for (const product of products) {
      const result = await this.classifyProduct(product);
      results.set(product.id, result);
      
      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Build context string for AI prompt
   */
  private buildContext(product: ProductFeatures): string {
    const descriptionText = this.toPlainText(product.descriptionHtml || product.description || '');
    const overrideDescriptionText = this.toPlainText(product.overrideDescriptionHtml || '');
    const overrideTopText = this.toPlainText(product.overrideTopDescriptionHtml || '');
    const overrideBottomText = this.toPlainText(product.overrideBottomDescriptionHtml || '');

    const signals = [
      `Title: ${product.title}`,
      `Vendor: ${product.vendor}`,
      `Tags: ${product.tags.slice(0, 10).join(', ')}`,
      `Collections: ${product.collections.slice(0, 5).join(', ')}`,
      `Product URL: ${product.productUrl || `https://theequestrian.com/products/${product.handle}`}`,
      `Canonical Collection Hint: ${product.canonicalCollection || 'none'}`,
      `Description: ${descriptionText.slice(0, 1500) || 'none'}`,
      `SEO Title: ${product.seoTitle || 'none'}`,
      `SEO Description: ${product.seoDescription || 'none'}`,
      `Variant Titles: ${(product.variantTitles || []).slice(0, 10).join(', ') || 'none'}`,
      `Variant Options: ${(product.variantOptions || []).slice(0, 20).join(', ') || 'none'}`,
      `Headless Bullets: ${(product.overrideBullets || []).slice(0, 12).join(' | ') || 'none'}`,
      `Headless Description: ${overrideDescriptionText.slice(0, 1000) || 'none'}`,
      `Headless Top Description: ${overrideTopText.slice(0, 600) || 'none'}`,
      `Headless Bottom Description: ${overrideBottomText.slice(0, 600) || 'none'}`,
      `Image Alts: ${(product.imageAltTexts || []).slice(0, 5).join(' | ') || 'none'}`,
    ];

    if (product.currentType) {
      signals.push(`Current Type: ${product.currentType}`);
    }

    return signals.join('\n');
  }

  private buildSystemPrompt(): string {
    const types = this.validProductTypes
      .map((type, idx) => `${idx + 1}. ${type}`)
      .join('\n');
    const brands = this.brands.length > 0
      ? this.brands.map((brand, idx) => `${idx + 1}. ${brand.handle} (${brand.title})`).join('\n')
      : 'No brand pages configured.';

    return `You classify equestrian and pet products into one existing product type.

Use ONLY these exact allowed product types:
${types}

Allowed brand pages (optional association targets):
${brands}

Rules:
1. Choose exactly one "type" from the allowed list. Never invent or alter names.
2. Pick the most specific type supported by title, tags, vendor, and collections.
3. If uncertain, still choose the best allowed type but reduce confidence.
4. "alternatives" must contain only allowed types and must not include the primary "type".
5. You may include up to 3 matching brand page handles in "brand_handles" when there is clear evidence.
6. "brand_handles" values must be exact handles from the allowed brand list.
7. Keep "reasoning" brief and evidence-based (title/tags/collections/vendor/description).

Return JSON only with this schema:
{"type":"<allowed type>","confidence":0-100,"reasoning":"...","alternatives":["<allowed type>","<allowed type>"],"brand_handles":["<allowed brand handle>"]}`;
  }

  private buildVisionContext(
    product: ProductFeatures,
    prior: Omit<ClassificationResult, 'validationStatus'>
  ): string {
    return `${this.buildContext(product)}

Prior text-only result:
Type: ${prior.suggestedType}
Confidence: ${prior.confidence}
Reasoning: ${prior.reasoning}

Use the product images to confirm or correct this classification and return JSON only.`;
  }

  /**
   * Classify using OpenAI Chat Completions (gpt-4o)
   */
  private async classifyWithOpenAIChat(context: string): Promise<Omit<ClassificationResult, 'validationStatus'>> {
    const systemPrompt = this.buildSystemPrompt();
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = this.parseModelJson(response);

    return {
      suggestedType: parsed.type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternatives || [],
      brandHandles: parsed.brand_handles || [],
    };
  }

  /**
   * Classify using Responses API (gpt-5.2-codex)
   */
  private async classifyWithCodexResponses(context: string): Promise<Omit<ClassificationResult, 'validationStatus'>> {
    const systemPrompt = this.buildSystemPrompt();
    const response = await this.openai.responses.create({
      model: 'gpt-5.2-codex',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      reasoning: { effort: 'medium' },
      text: { verbosity: 'medium' },
    });
    const text = response.output_text;
    if (!text) {
      throw new Error('No output_text returned from Responses API');
    }
    const parsed = this.parseModelJson(text);

    return {
      suggestedType: parsed.type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternatives || [],
      brandHandles: parsed.brand_handles || [],
    };
  }

  private async classifyWithOpenAIVision(
    context: string,
    imageUrls: string[]
  ): Promise<Omit<ClassificationResult, 'validationStatus'>> {
    const systemPrompt = this.buildSystemPrompt();
    const content: Array<
      { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
    > = [{ type: 'text', text: context }];
    for (const url of imageUrls.slice(0, 3)) {
      content.push({ type: 'image_url', image_url: { url } });
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI vision pass');
    }
    const parsed = this.parseModelJson(response);
    return {
      suggestedType: parsed.type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternatives || [],
      brandHandles: parsed.brand_handles || [],
    };
  }

  private async classifyWithCodexVision(
    context: string,
    imageUrls: string[]
  ): Promise<Omit<ClassificationResult, 'validationStatus'>> {
    const systemPrompt = this.buildSystemPrompt();
    const content: Array<
      { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'low' }
    > = [
      { type: 'input_text', text: context },
    ];
    for (const url of imageUrls.slice(0, 3)) {
      content.push({ type: 'input_image', image_url: url, detail: 'low' });
    }

    const response = await this.openai.responses.create({
      model: 'gpt-5.2-codex',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      reasoning: { effort: 'medium' },
      text: { verbosity: 'medium' },
    });
    if (!response.output_text) {
      throw new Error('No output_text returned from codex vision pass');
    }
    const parsed = this.parseModelJson(response.output_text);
    return {
      suggestedType: parsed.type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternatives || [],
      brandHandles: parsed.brand_handles || [],
    };
  }

  private parseModelJson(rawText: string): {
    type: string;
    confidence: number;
    reasoning: string;
    alternatives?: string[];
    brand_handles?: string[];
    brandHandles?: string[];
  } {
    try {
      return JSON.parse(rawText) as {
        type: string;
        confidence: number;
        reasoning: string;
        alternatives?: string[];
        brand_handles?: string[];
      };
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Could not parse model JSON response: ${rawText.slice(0, 500)}`);
      }
      return JSON.parse(jsonMatch[0]) as {
        type: string;
        confidence: number;
        reasoning: string;
        alternatives?: string[];
        brand_handles?: string[];
      };
    }
  }

  private normalizeAndValidateResult(
    raw: Omit<ClassificationResult, 'validationStatus'>,
    fallbackType: string
  ): Omit<ClassificationResult, 'validationStatus'> {
    const validMap = new Map(this.validProductTypes.map((type) => [type.toLowerCase(), type]));
    const primary = (raw.suggestedType || '').trim().toLowerCase();
    const mappedPrimary = validMap.get(primary);

    if (mappedPrimary) {
      return {
        suggestedType: mappedPrimary,
        confidence: this.clampConfidence(raw.confidence),
        reasoning: raw.reasoning || 'Model-selected classification',
        alternativeTypes: this.normalizeAlternatives(raw.alternativeTypes || [], mappedPrimary, validMap),
        brandHandles: this.normalizeBrandHandles(raw.brandHandles || []),
      };
    }

    const fallbackAlt = (raw.alternativeTypes || [])
      .map((type) => type.trim().toLowerCase())
      .map((type) => validMap.get(type))
      .find((type): type is string => Boolean(type));

    if (fallbackAlt) {
      return {
        suggestedType: fallbackAlt,
        confidence: Math.min(this.clampConfidence(raw.confidence), 65),
        reasoning: `Primary type was invalid; fallback to first valid alternative. ${raw.reasoning || ''}`.trim(),
        alternativeTypes: this.normalizeAlternatives(raw.alternativeTypes || [], fallbackAlt, validMap),
        brandHandles: this.normalizeBrandHandles(raw.brandHandles || []),
      };
    }

    return {
      suggestedType: fallbackType,
      confidence: 0,
      reasoning: `Model did not return a valid allowed type. ${raw.reasoning || ''}`.trim(),
      alternativeTypes: [],
      brandHandles: this.normalizeBrandHandles(raw.brandHandles || []),
    };
  }

  private normalizeAlternatives(
    alternatives: string[],
    primary: string,
    validMap: Map<string, string>
  ): string[] {
    const deduped = new Set<string>();
    for (const candidate of alternatives) {
      const normalized = validMap.get((candidate || '').trim().toLowerCase());
      if (!normalized || normalized === primary) continue;
      deduped.add(normalized);
      if (deduped.size >= 3) break;
    }
    return Array.from(deduped);
  }

  private clampConfidence(confidence: number): number {
    if (!Number.isFinite(confidence)) return 0;
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private normalizeBrandHandles(candidates: string[]): string[] {
    const deduped = new Set<string>();
    for (const raw of candidates) {
      const handle = (raw || '').trim().toLowerCase();
      if (!handle || !this.validBrandHandles.has(handle)) continue;
      deduped.add(handle);
      if (deduped.size >= 3) break;
    }
    return Array.from(deduped);
  }

  private shouldEscalateToVision(
    result: Omit<ClassificationResult, 'validationStatus'>,
    product: ProductFeatures
  ): boolean {
    return Boolean((product.imageUrls || []).length > 0 && result.confidence < this.confidenceReviewThreshold);
  }

  private toPlainText(value: string): string {
    return value
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get statistics about classification results
   */
  static getStats(results: Map<string, ClassificationResult>): {
    total: number;
    autoAccepted: number;
    claudeValidated: number;
    needsReview: number;
    avgConfidence: number;
    bothAgree: number;
  } {
    const values = Array.from(results.values());
    const bothAgree = 0;
    
    return {
      total: values.length,
      autoAccepted: values.filter(r => r.validationStatus === 'auto').length,
      claudeValidated: values.filter(r => r.validationStatus === 'claude-validated').length,
      needsReview: values.filter(r => r.validationStatus === 'needs-review').length,
      avgConfidence: values.reduce((sum, r) => sum + r.confidence, 0) / values.length,
      bothAgree,
    };
  }
}
