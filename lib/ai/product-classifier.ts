/**
 * AI Product Classifier
 * Uses OpenAI and Anthropic to intelligently classify products into proper product types
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
}

interface ClassificationResult {
  suggestedType: string;
  confidence: number; // 0-100
  reasoning: string;
  validationStatus: 'auto' | 'claude-validated' | 'needs-review';
  alternativeTypes?: string[];
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Product Classifier using OpenAI and Anthropic
 */
export class ProductClassifier {
  private openai: OpenAI;
  private anthropicApiKey: string;
  private validProductTypes: string[];

  constructor(validProductTypes: string[]) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({ apiKey: openaiKey });
    this.anthropicApiKey = anthropicKey;
    this.validProductTypes = validProductTypes;
  }

  /**
   * Classify a single product using OpenAI and validate with Claude
   */
  async classifyProduct(product: ProductFeatures): Promise<ClassificationResult> {
    console.log(`  🤖 Classifying: ${product.title}`);

    // Build context for AI
    const context = this.buildContext(product);
    
    try {
      // Step 1: OpenAI Classification
      const openaiResult = await this.classifyWithOpenAI(context);
      
      // Step 2: Always validate with Claude for dual AI validation
      console.log(`    🔍 Validating with Claude (OpenAI: ${openaiResult.confidence}%)...`);
      const claudeResult = await this.validateWithClaude(context, openaiResult);
      return claudeResult;
    } catch (error) {
      console.error(`    ❌ Error classifying product:`, error);
      return {
        suggestedType: product.currentType || 'NEEDS MANUAL REVIEW',
        confidence: 0,
        reasoning: `Error during classification: ${error}`,
        validationStatus: 'needs-review',
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
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Build context string for AI prompt
   */
  private buildContext(product: ProductFeatures): string {
    const signals = [
      `Title: ${product.title}`,
      `Vendor: ${product.vendor}`,
      `Tags: ${product.tags.slice(0, 10).join(', ')}`,
      `Collections: ${product.collections.slice(0, 5).join(', ')}`,
    ];

    if (product.currentType) {
      signals.push(`Current Type: ${product.currentType}`);
    }

    return signals.join('\n');
  }

  /**
   * Classify using OpenAI GPT-4o
   */
  private async classifyWithOpenAI(context: string): Promise<Omit<ClassificationResult, 'validationStatus'>> {
    const systemPrompt = `You are an expert at classifying equestrian and pet products into specific product types.

VALID PRODUCT TYPES (choose ONLY from this list):
${this.validProductTypes.slice(0, 100).join(', ')}
${this.validProductTypes.length > 100 ? `... and ${this.validProductTypes.length - 100} more types` : ''}

RULES:
1. Choose the MOST SPECIFIC type that matches (e.g., "Horse Boots" not "Accessories")
2. For horses: Use types like "Horse Boots", "Saddle Cloths", "Bits", "Bridles", "Horse Rugs"
3. For riders: Use types like "Helmets", "Breeches", "Gloves", "Boots"
4. For dogs: Use types like "Dog Treats", "Dog Toys", "Dog Collars & Leads"
5. For cats: Use types like "Cat Food & Treats", "Cat Gyms & Toys"
6. Confidence score: 
   - 90-100: Very clear match (e.g., "helmet" in title → "Helmets")
   - 70-89: Good match based on multiple signals
   - Below 70: Uncertain, needs validation

Return ONLY valid JSON: {"type": "...", "confidence": 0-100, "reasoning": "...", "alternatives": ["...", "..."]}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    
    return {
      suggestedType: parsed.type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      alternativeTypes: parsed.alternatives || [],
    };
  }

  /**
   * Validate classification using Claude 3.5 Sonnet
   */
  private async validateWithClaude(
    context: string,
    openaiResult: Omit<ClassificationResult, 'validationStatus'>
  ): Promise<ClassificationResult> {
    const prompt = `You are validating a product classification made by another AI.

PRODUCT DETAILS:
${context}

PREVIOUS CLASSIFICATION:
Type: ${openaiResult.suggestedType}
Confidence: ${openaiResult.confidence}%
Reasoning: ${openaiResult.reasoning}

VALID PRODUCT TYPES:
${this.validProductTypes.slice(0, 100).join(', ')}

TASK:
1. Do you AGREE with the classification "${openaiResult.suggestedType}"?
2. If NO, what type would you suggest instead?
3. What confidence level (0-100) do you have?

Return ONLY valid JSON: {"agree": true/false, "suggestedType": "...", "confidence": 0-100, "reasoning": "..."}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return {
        ...openaiResult,
        validationStatus: 'needs-review',
      };
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Extract JSON from Claude's response (it might include extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse Claude response:', content);
      return {
        ...openaiResult,
        validationStatus: 'needs-review',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.agree && parsed.confidence >= 70) {
      // Both AIs agree - highest confidence
      const finalConfidence = Math.max(openaiResult.confidence, parsed.confidence);
      console.log(`    ✅ Both AIs agree (${finalConfidence}%): ${openaiResult.suggestedType}`);
      return {
        suggestedType: openaiResult.suggestedType,
        confidence: finalConfidence,
        reasoning: `Dual AI validation - OpenAI (${openaiResult.confidence}%) + Claude (${parsed.confidence}%) agree: ${parsed.reasoning}`,
        validationStatus: 'claude-validated',
      };
    } else {
      console.log(`    ⚠️  AIs disagree - OpenAI: ${openaiResult.suggestedType} (${openaiResult.confidence}%), Claude: ${parsed.suggestedType} (${parsed.confidence}%)`);
      
      if (parsed.confidence >= 85 && parsed.confidence > openaiResult.confidence) {
        // Claude is more confident in a different type
        return {
          suggestedType: parsed.suggestedType,
          confidence: parsed.confidence,
          reasoning: `Claude override (higher confidence): ${parsed.reasoning}. OpenAI suggested: ${openaiResult.suggestedType}`,
          validationStatus: 'claude-validated',
          alternativeTypes: [openaiResult.suggestedType],
        };
      } else if (openaiResult.confidence >= 85 && openaiResult.confidence > parsed.confidence) {
        // OpenAI is more confident
        return {
          suggestedType: openaiResult.suggestedType,
          confidence: openaiResult.confidence,
          reasoning: `OpenAI override (higher confidence): ${openaiResult.reasoning}. Claude suggested: ${parsed.suggestedType}`,
          validationStatus: 'claude-validated',
          alternativeTypes: [parsed.suggestedType],
        };
      } else {
        // Both AIs uncertain or disagree with similar confidence - needs review
        return {
          suggestedType: openaiResult.confidence >= parsed.confidence ? openaiResult.suggestedType : parsed.suggestedType,
          confidence: Math.max(openaiResult.confidence, parsed.confidence),
          reasoning: `AIs disagree - needs review. OpenAI (${openaiResult.confidence}%): ${openaiResult.reasoning}. Claude (${parsed.confidence}%): ${parsed.reasoning}`,
          validationStatus: 'needs-review',
          alternativeTypes: [openaiResult.suggestedType, parsed.suggestedType].filter((v, i, a) => a.indexOf(v) === i),
        };
      }
    }
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
    const bothAgree = values.filter(r => 
      r.validationStatus === 'claude-validated' && 
      r.reasoning.includes('agree')
    ).length;
    
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
