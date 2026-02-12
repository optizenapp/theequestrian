import OpenAI from 'openai';

export type RedirectSuggestionModel = 'gpt-4o' | 'gpt-5.2-codex';

export interface RedirectCandidateTarget {
  path: string;
  reason: string;
  score: number;
}

export interface RedirectSuggestionInput {
  brokenPath: string;
  sourcePath?: string;
  brokenPageStatus?: number;
  brokenPageTitle?: string;
  brokenPageDescription?: string;
  brokenPageText?: string;
  sourcePageTitle?: string;
  sourcePageText?: string;
  candidateTargets: RedirectCandidateTarget[];
}

export interface RedirectSuggestionResult {
  suggestedTo: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  modelUsed: RedirectSuggestionModel;
}

type RedirectModelJson = {
  suggested_to?: string;
  confidence?: number;
  reasoning?: string;
  alternatives?: string[];
};

export class RedirectSuggester {
  private openai: OpenAI;
  private model: RedirectSuggestionModel;

  constructor(model: RedirectSuggestionModel = 'gpt-4o') {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.model = model;
  }

  async suggestRedirect(input: RedirectSuggestionInput): Promise<RedirectSuggestionResult> {
    const fallback = input.candidateTargets[0]?.path || '/';
    try {
      const prompt = this.buildPrompt(input);
      const raw = this.model === 'gpt-5.2-codex'
        ? await this.suggestWithCodex(prompt)
        : await this.suggestWithChat(prompt);
      const parsed = this.parseModelJson(raw);

      const suggestedTo = this.normalizePath(parsed.suggested_to || fallback);
      const alternatives = (parsed.alternatives || [])
        .map((entry) => this.normalizePath(entry))
        .filter((entry, index, arr) => Boolean(entry) && entry !== suggestedTo && arr.indexOf(entry) === index)
        .slice(0, 3);

      return {
        suggestedTo,
        confidence: this.clampConfidence(parsed.confidence),
        reasoning: (parsed.reasoning || 'AI-suggested redirect target').slice(0, 500),
        alternatives,
        modelUsed: this.model,
      };
    } catch (error) {
      return {
        suggestedTo: fallback,
        confidence: 0,
        reasoning: `AI suggestion failed: ${(error as Error).message}`,
        alternatives: [],
        modelUsed: this.model,
      };
    }
  }

  private buildPrompt(input: RedirectSuggestionInput): string {
    const candidates = input.candidateTargets
      .slice(0, 20)
      .map((candidate, index) => `${index + 1}. ${candidate.path} (score=${candidate.score.toFixed(2)}, reason=${candidate.reason})`)
      .join('\n');

    const brokenText = (input.brokenPageText || '').slice(0, 2500);
    const sourceText = (input.sourcePageText || '').slice(0, 1200);

    return `You suggest the best internal redirect target for a broken URL on an ecommerce website.

Return ONLY JSON with this exact schema:
{"suggested_to":"/path","confidence":0-100,"reasoning":"brief evidence-based reason","alternatives":["/path","/path"]}

Rules:
1. suggested_to MUST start with "/" and be an internal path (no full URL).
2. Prefer one of the candidate targets whenever possible.
3. Avoid obvious loops or no-op redirects. If none are appropriate, use "/".
4. Keep reasoning concise and based on URL semantics + page context.
5. alternatives must be internal paths and must not include suggested_to.

Broken URL path: ${input.brokenPath}
Source URL path: ${input.sourcePath || 'unknown'}
Broken page status: ${input.brokenPageStatus ?? 'unknown'}
Broken page title: ${input.brokenPageTitle || 'none'}
Broken page description: ${input.brokenPageDescription || 'none'}
Broken page content excerpt:
${brokenText || 'none'}

Source page title: ${input.sourcePageTitle || 'none'}
Source page content excerpt:
${sourceText || 'none'}

Candidate targets:
${candidates || '1. / (score=0.10, reason=fallback-home)'}
`;
  }

  private async suggestWithChat(prompt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a strict JSON redirect suggestion engine.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('No response from OpenAI chat');
    return text;
  }

  private async suggestWithCodex(prompt: string): Promise<string> {
    const response = await this.openai.responses.create({
      model: 'gpt-5.2-codex',
      input: [
        { role: 'system', content: 'You are a strict JSON redirect suggestion engine.' },
        { role: 'user', content: prompt },
      ],
      reasoning: { effort: 'medium' },
      text: { verbosity: 'medium' },
    });
    if (!response.output_text) throw new Error('No output_text from Responses API');
    return response.output_text;
  }

  private parseModelJson(rawText: string): RedirectModelJson {
    try {
      return JSON.parse(rawText) as RedirectModelJson;
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`Could not parse JSON: ${rawText.slice(0, 300)}`);
      }
      return JSON.parse(jsonMatch[0]) as RedirectModelJson;
    }
  }

  private normalizePath(pathValue: string): string {
    const trimmed = (pathValue || '').trim();
    if (!trimmed) return '/';
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return this.normalizePath(parsed.pathname);
      } catch {
        return '/';
      }
    }
    const withoutHash = trimmed.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
    if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
    return withoutQuery;
  }

  private clampConfidence(value: number | undefined): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value as number)));
  }
}
