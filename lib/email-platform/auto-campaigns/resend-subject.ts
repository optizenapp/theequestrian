import OpenAI from 'openai';

const FALLBACK = 'Still interested? Your picks inside';

export async function generateResendSubjectLine(input: {
  originalSubject: string;
  productContext: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return FALLBACK;
  }
  const openai = new OpenAI({ apiKey: key });
  const prompt = `Write ONE alternative email subject line for a resend to people who did not open the first email.
Original subject was: "${input.originalSubject}"
Product context:
${input.productContext}

Rules: max 55 characters, warm tone, no ALL CAPS, no spam phrases, no URLs. Reply with ONLY the subject text.`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.65,
    max_tokens: 60,
  });
  const text = completion.choices[0]?.message?.content?.trim() || '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3) return FALLBACK;
  return cleaned.length > 55 ? cleaned.slice(0, 52).trim() + '…' : cleaned;
}
