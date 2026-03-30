import OpenAI from 'openai';
import { DEFAULT_HEADING_PROMPT } from './constants';

export type HeadingGeneratorContext = {
  sendDate?: string;
  productContext?: string;
};

export { DEFAULT_HEADING_PROMPT };

const FALLBACK_HEADING = "This week's picks";

/**
 * Generate heading copy for the auto weekly email (e.g. for LLM Heading block).
 * Replaces {{productContext}} and {{sendDate}} in the prompt.
 */
export async function generateAutoWeeklyHeading(
  context: HeadingGeneratorContext = {},
  promptOverride?: string | null
): Promise<string> {
  const productContext = context.productContext ?? '';
  const sendDate = context.sendDate ?? '';

  let promptTemplate =
    (promptOverride && promptOverride.trim().length > 0 ? promptOverride.trim() : null) ||
    process.env.AUTO_WEEKLY_HEADING_PROMPT ||
    DEFAULT_HEADING_PROMPT;

  promptTemplate = promptTemplate
    .replace(/\{\{productContext\}\}/g, productContext)
    .replace(/\{\{sendDate\}\}/g, sendDate);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return FALLBACK_HEADING;
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: promptTemplate }],
    temperature: 0.5,
    max_tokens: 40,
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_HEADING;
}
