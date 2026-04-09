import { NextResponse } from 'next/server';
import {
  parseSuggestionInput,
  runAiRedirectSuggestions,
} from '@/lib/not-found/ai-redirect-suggestions';
import type { RedirectSuggestionModel } from '@/lib/ai/redirect-suggester';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pastedText = typeof body?.pastedText === 'string' ? body.pastedText : '';
    const csvText = typeof body?.csvText === 'string' ? body.csvText : '';
    const baseUrl =
      typeof body?.baseUrl === 'string' && body.baseUrl.trim()
        ? body.baseUrl.trim().replace(/\/$/, '')
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
    const rawModel = typeof body?.model === 'string' ? body.model : 'gpt-4o';
    const model: RedirectSuggestionModel = rawModel === 'gpt-5.2-codex' ? 'gpt-5.2-codex' : 'gpt-4o';
    const limit = Number.isFinite(Number(body?.limit)) ? Math.max(1, Math.min(500, Number(body.limit))) : 200;
    const mode =
      body?.mode === 'category-and-products' ? 'category-and-products' : 'category-only';

    if (!pastedText.trim() && !csvText.trim()) {
      return NextResponse.json(
        { error: 'Please provide pasted URLs/paths or upload CSV content.' },
        { status: 400 }
      );
    }

    const inputRows = parseSuggestionInput({ pastedText, csvText, baseUrl });
    if (inputRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs/paths were found in the provided input.' },
        { status: 400 }
      );
    }

    const suggestions = await runAiRedirectSuggestions({
      inputRows,
      baseUrl,
      model,
      limit,
      includeProducts: mode === 'category-and-products',
    });

    return NextResponse.json({
      totalInput: inputRows.length,
      processed: suggestions.length,
      model,
      mode,
      baseUrl,
      suggestions,
    });
  } catch (error) {
    console.error('Run 404 suggestion tool error:', error);
    return NextResponse.json({ error: 'Failed to run redirect suggestion tool.' }, { status: 500 });
  }
}
