import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { seoEnrichmentConfig } from '@/lib/seo-enrichment/config';
import { getSerpCache, upsertSerpCache } from '@/lib/seo-enrichment/db';
import { buildKoraySystemPrompt } from '@/lib/seo-enrichment/koray';
import { buildKorayRuleBlock, selectKorayRules } from '@/lib/seo-enrichment/koray-retrieval';
import { log } from '@/lib/seo-enrichment/logger';
import type { GscMetrics } from '@/lib/seo-enrichment/types';

interface SerpResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
  extracted_content?: {
    meta_title: string;
    meta_description: string;
    headings: Array<{ level: number; text: string }>;
    content_preview: string;
    internal_link_count: number;
    internal_links_sample: Array<{ href: string; text: string }>;
    has_faq_schema: boolean;
    word_count: number;
  };
}

export class SerpAnalyzer {
  private readonly openai: OpenAI | null;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  async close() {
    // No resources to clean up (browser removed)
  }

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest + Math.random() * 200; // Add jitter
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  async analyzeQueries(queries: string[]): Promise<Record<string, unknown>> {
    if (!seoEnrichmentConfig.enableSerpAnalysis || queries.length === 0) {
      return {};
    }

    const output: Record<string, unknown> = {};
    for (const query of queries.slice(0, seoEnrichmentConfig.serpTopQueries)) {
      try {
        // Check cache first
        const cached = await getSerpCache(query);
        if (cached) {
          output[query] = cached.analysis;
          log('info', 'Using cached SERP analysis', { query });
          continue;
        }

        // 1. Crawl Google SERP
        const serpResults = await this.crawlSerp(query);
        if (serpResults.length === 0) {
          log('warn', 'No SERP results found, falling back to AI-only analysis', { query });
          const fallback = await this.fallbackAnalyzeQuery(query);
          output[query] = { serp_results: [], competitor_analysis: fallback };
          await upsertSerpCache(query, [], fallback);
          continue;
        }

        // 2. Fetch content from top results
        const enrichedResults = await this.fetchResultContent(serpResults);

        // 3. Classify with AI
        const analysis = await this.classifyWithAI(query, enrichedResults);

        output[query] = {
          serp_results: enrichedResults,
          competitor_analysis: analysis,
        };

        // Cache it
        await upsertSerpCache(query, enrichedResults, analysis);
        log('info', 'SERP analysis complete', { query, resultCount: enrichedResults.length });
      } catch (error) {
        log('error', 'SERP analysis failed', { query, error: String(error) });
        // Fallback to AI simulation
        const fallback = await this.fallbackAnalyzeQuery(query);
        output[query] = fallback;
      }
    }
    return output;
  }

  private async crawlSerp(query: string): Promise<SerpResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      log('warn', 'SerpAPI API key missing', { query });
      return [];
    }

    await this.rateLimit(); // Throttle requests

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        location: 'Australia',
        gl: 'au',
        hl: 'en',
        num: '10',
      });

      const url = `https://serpapi.com/search.json?${params.toString()}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log('error', 'SerpAPI error', {
          query,
          status: response.status,
          error: errorText.slice(0, 200),
        });
        return [];
      }

      const data = await response.json();
      const organicResults = data.organic_results || [];

      const results: SerpResult[] = organicResults.map((item: any, index: number) => ({
        url: item.link || '',
        title: item.title || '',
        snippet: item.snippet || '',
        position: item.position || index + 1,
      }));

      log('info', 'SerpAPI results', { query, count: results.length });
      return results;
    } catch (error) {
      log('error', 'SerpAPI request failed', { query, error: String(error) });
      return [];
    }
  }

  private async fetchResultContent(results: SerpResult[]): Promise<SerpResult[]> {
    const enriched: SerpResult[] = [];
    const maxResults = Math.min(results.length, seoEnrichmentConfig.serpResultsToUse);

    for (const result of results.slice(0, maxResults)) {
      try {
        const response = await fetch(result.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const html = await response.text();
          result.extracted_content = this.extractPageContent(html);
        } else {
          log('warn', 'Failed to fetch result content', { url: result.url, status: response.status });
        }
      } catch (error) {
        log('warn', 'Error fetching result content', { url: result.url, error: String(error) });
      }
      enriched.push(result);
    }

    return enriched;
  }

  private extractPageContent(html: string): SerpResult['extracted_content'] {
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, footer, header, aside').remove();

    // Extract headings
    const headings: Array<{ level: number; text: string }> = [];
    for (let level = 1; level <= 6; level++) {
      $(`h${level}`).each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          headings.push({ level, text });
        }
      });
    }

    // Extract meta
    const meta_title = $('title').text().trim() || '';
    const meta_description = $('meta[name="description"]').attr('content') || '';

    // Extract main content
    let content_preview = '';
    const mainSelectors = ['main', 'article', '[role="main"]', '#content', '.content'];
    for (const selector of mainSelectors) {
      const mainEl = $(selector);
      if (mainEl.length) {
        content_preview = mainEl.text().trim();
        break;
      }
    }
    if (!content_preview) {
      content_preview = $('body').text().trim();
    }
    content_preview = content_preview.substring(0, 2000);

    // Extract internal links
    const internal_links_sample: Array<{ href: string; text: string }> = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/')) {
        internal_links_sample.push({
          href,
          text: $(el).text().trim().substring(0, 100),
        });
      }
    });

    // Check for FAQ schema
    const has_faq_schema = $('script[type="application/ld+json"]').toArray().some((el) => {
      const content = $(el).html() || '';
      return /FAQPage/i.test(content);
    });

    return {
      meta_title: meta_title.substring(0, 200),
      meta_description: meta_description.substring(0, 300),
      headings: headings.slice(0, 30),
      content_preview,
      internal_link_count: internal_links_sample.length,
      internal_links_sample: internal_links_sample.slice(0, 10),
      has_faq_schema,
      word_count: content_preview.split(/\s+/).length,
    };
  }

  private async classifyWithAI(query: string, results: SerpResult[]): Promise<Record<string, unknown>> {
    if (!this.openai) {
      return { mode: 'no-openai', query };
    }

    try {
      const queryAsGsc: GscMetrics = {
        totalImpressions: 0,
        totalClicks: 0,
        avgPosition: 0,
        avgCtr: 0,
        topQueries: [{ query, impressions: 0, clicks: 0, position: 0, ctr: 0 }],
        highImpressionLowPosition: [],
        highImpressionLowCtr: [],
      };
      const selection = selectKorayRules('serp', queryAsGsc, 7);
      const selectedRuleBlock = buildKorayRuleBlock(selection);

      const prompt = `Analyze these Google SERP results for query: "${query}"

Top ${results.length} results:
${results
  .map(
    (r, idx) => `
${idx + 1}. ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}
   ${
     r.extracted_content
       ? `
   Meta Title: ${r.extracted_content.meta_title}
   Headings (first 5): ${r.extracted_content.headings
     .slice(0, 5)
     .map((h) => `H${h.level}: ${h.text}`)
     .join(', ')}
   Word Count: ${r.extracted_content.word_count}
   Has FAQ Schema: ${r.extracted_content.has_faq_schema}
   Content Preview: ${r.extracted_content.content_preview.substring(0, 300)}...
   `
       : ''
   }
`
  )
  .join('\n')}

Using Koray's Topical Authority principles, identify:
1. Search intent (transactional, informational, commercial, mixed)
2. Document template winners (product pages, guides, comparisons, etc.)
3. Common content patterns across top results
4. Content gaps and differentiation opportunities
5. E-A-V coverage requirements (entities, attributes, values)
6. Recommended heading structure
7. Internal linking opportunities

Return JSON with keys: intent, documentTemplate, winningPatterns, contentGaps, eavCoverage, headingIdeas, internalLinkTargets, recommendedApproach.`;

      const completion = await this.openai.chat.completions.create({
        model: seoEnrichmentConfig.openaiModel,
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildKoraySystemPrompt('You are a SERP analysis expert.', [
              selectedRuleBlock,
              'Analyze competitor content through the lens of Koray Tuğberk Gübür\'s topical authority framework.',
              'Focus on macro context, E-A-V patterns, extractive answers, and hub-spoke linking opportunities.',
            ]),
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      log('error', 'AI classification failed', { query, error: String(error) });
      return { mode: 'error', query, error: String(error) };
    }
  }

  private async fallbackAnalyzeQuery(query: string): Promise<Record<string, unknown>> {
    if (!this.openai) {
      return {
        query,
        mode: 'fallback-no-openai-key',
        recommendations: [],
      };
    }
    try {
      const queryAsGsc: GscMetrics = {
        totalImpressions: 0,
        totalClicks: 0,
        avgPosition: 0,
        avgCtr: 0,
        topQueries: [{ query, impressions: 0, clicks: 0, position: 0, ctr: 0 }],
        highImpressionLowPosition: [],
        highImpressionLowCtr: [],
      };
      const selection = selectKorayRules('serp', queryAsGsc, 7);
      const selectedRuleBlock = buildKorayRuleBlock(selection);

      const completion = await this.openai.chat.completions.create({
        model: seoEnrichmentConfig.openaiModel,
        temperature: 0.1,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildKoraySystemPrompt(
              'You are an SEO SERP analyst.',
              [
                selectedRuleBlock,
                'Return strict JSON with keys: query, intent, documentTemplate, winningPatterns, contentGaps, headingIdeas, internalLinkTargets, recommendedApproach.',
                'recommendedApproach must include mustCoverEntities, mustCoverAttributes, differentiationStrategy.',
              ]
            ),
          },
          {
            role: 'user',
            content: `Analyze likely SERP intent and competitive content opportunities for query: "${query}".
            Use Koray-style topical authority principles, extractive-answer structure, and E-A-V coverage.`,
          },
        ],
      });
      const text = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(text);
    } catch (error) {
      log('warn', 'SERP fallback analysis failed', { query, error: String(error) });
      return { query, mode: 'fallback-error', recommendations: [] };
    }
  }
}

