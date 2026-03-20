import OpenAI from 'openai';
import { DEFAULT_SUBJECT_PROMPT } from './constants';

export type SubjectLineGeneratorContext = {
  sendDate?: string;
  productContext?: string;
};

export { DEFAULT_SUBJECT_PROMPT };

const FALLBACK_SUBJECT = 'Your weekly picks from The Equestrian';

/**
 * Generate subject line copy for the auto weekly email using the configured prompt and context.
 * Replaces {{productContext}} and {{sendDate}} in the prompt.
 */
export async function generateAutoWeeklySubjectLine(
  context: SubjectLineGeneratorContext = {},
  promptOverride?: string | null
): Promise<string> {
  const productContext = context.productContext ?? '';
  const sendDate = context.sendDate ?? '';

  let promptTemplate =
    (promptOverride && promptOverride.trim().length > 0 ? promptOverride.trim() : null) ||
    process.env.AUTO_WEEKLY_SUBJECT_PROMPT ||
    DEFAULT_SUBJECT_PROMPT;

  promptTemplate = promptTemplate
    .replace(/\{\{productContext\}\}/g, productContext)
    .replace(/\{\{sendDate\}\}/g, sendDate);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return FALLBACK_SUBJECT;
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: promptTemplate }],
    temperature: 0.6,
    max_tokens: 80,
  });

  const text = completion.choices[0]?.message?.content?.trim() || '';
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_SUBJECT;
}
