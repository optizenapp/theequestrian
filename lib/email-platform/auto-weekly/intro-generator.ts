import OpenAI from 'openai';
import { DEFAULT_INTRO_PROMPT } from './constants';

export type IntroGeneratorContext = {
  sendDate?: string;
  productContext?: string;
  /** @deprecated use productContext */
  productTitles?: string[];
  /** @deprecated use productContext */
  productHandles?: string[];
};

export { DEFAULT_INTRO_PROMPT };

const HEY_THERE = 'Hey there,';

function ensureStartsWithHeyThere(text: string): string {
  const t = text.trim();
  if (!t) return `${HEY_THERE} here are some picks we think you'll love this week.`;
  const lower = t.toLowerCase();
  if (lower.startsWith('hey there') && (t.length === 9 || /^hey there[\s,]/i.test(t))) {
    return t;
  }
  return `${HEY_THERE} ${t}`;
}

/**
 * Generate intro copy for the auto weekly email using the configured prompt and optional context.
 * Replaces {{productContext}} and {{sendDate}} in the prompt. Ensures output starts with "Hey there,".
 */
export async function generateAutoWeeklyIntro(
  context: IntroGeneratorContext = {},
  promptOverride?: string | null
): Promise<string> {
  const productContext = context.productContext ?? (context.productTitles?.length
    ? `Featured products: ${context.productTitles.join(', ')}`
    : '');
  const sendDate = context.sendDate ?? '';

  let promptTemplate =
    (promptOverride && promptOverride.trim().length > 0 ? promptOverride.trim() : null) ||
    process.env.AUTO_WEEKLY_INTRO_PROMPT ||
    DEFAULT_INTRO_PROMPT;

  promptTemplate = promptTemplate
    .replace(/\{\{productContext\}\}/g, productContext)
    .replace(/\{\{sendDate\}\}/g, sendDate);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return ensureStartsWithHeyThere("here are some picks we think you'll love this week.");
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: promptTemplate }],
    temperature: 0.7,
    max_tokens: 300,
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const fallback = "here are some picks we think you'll love this week.";
  return ensureStartsWithHeyThere(text || fallback);
}
