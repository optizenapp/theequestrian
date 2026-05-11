import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAdminRequest } from '@/lib/admin/auth';
import { getSocialPromptTemplate } from '@/lib/social/prompt-repository';
import { buildFallbackSocialCopy, loadSocialUrlContext } from '@/lib/social/url-context';

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '');
}

async function generateCopy(sourceUrl: string, platform: string, promptTemplateId?: string): Promise<{ text: string; images: string[]; sourceUrl: string }> {
  const context = await loadSocialUrlContext(sourceUrl);
  const fallback = buildFallbackSocialCopy(context, platform);
  if (!process.env.OPENAI_API_KEY) return { text: fallback, images: context.images, sourceUrl: context.sourceUrl };
  const promptTemplate = promptTemplateId ? await getSocialPromptTemplate(promptTemplateId) : null;
  if (promptTemplateId && !promptTemplate) throw new Error('Selected prompt template was not found');
  const values = {
    platform,
    sourceUrl: context.sourceUrl,
    sourceTitle: context.title,
    sourceDescription: context.description,
    sourceContent: context.text.slice(0, 3000),
  };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.SOCIAL_COPY_MODEL || 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: promptTemplate ? fillTemplate(promptTemplate.systemPrompt, values) : [
            'Write one platform-ready social post for The Equestrian in Australian English.',
            'Use only the supplied page facts. Do not invent prices, discounts, stock, reviews, or product claims.',
            'Do not include the URL in the copy; the app stores it separately.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: promptTemplate
            ? fillTemplate(promptTemplate.userPrompt, values)
            : `Platform: ${platform}\nTitle: ${context.title}\nDescription: ${context.description}\nPage text: ${context.text.slice(0, 3000)}`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() || fallback;
    return { text, images: context.images, sourceUrl: context.sourceUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown OpenAI error';
    console.warn(`[social-generate] falling back to deterministic copy: ${message}`);
    return { text: fallback, images: context.images, sourceUrl: context.sourceUrl };
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as { sourceUrl?: string; platform?: string; promptTemplateId?: string };
    if (!body.sourceUrl?.trim()) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    const platform = body.platform === 'instagram' || body.platform === 'youtube' ? body.platform : 'facebook';
    return NextResponse.json({ result: await generateCopy(body.sourceUrl, platform, body.promptTemplateId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate social copy';
    const status =
      message.includes('Selected prompt template was not found') ||
      message.includes('Only http and https URLs are supported') ||
      message.includes('Private, local, and metadata URLs are not allowed') ||
      message.includes('Source URL did not return HTML')
        ? 400
        : message.startsWith('URL fetch failed:')
          ? 502
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
