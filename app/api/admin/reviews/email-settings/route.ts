import { NextRequest, NextResponse } from 'next/server';
import {
  defaultReviewEmailSettings,
  getReviewEmailSettings,
  upsertReviewEmailSettings,
  type ReviewEmailSettings,
} from '@/lib/reviews/email-settings';
import { defaultReviewEmailBlocks, type ReviewEmailBlock } from '@/lib/reviews/email-types';

function normalizeBlocks(blocks: unknown): ReviewEmailBlock[] {
  if (!Array.isArray(blocks)) return defaultReviewEmailBlocks;
  const validTypes = new Set([
    'heading',
    'text',
    'cta',
    'productCards',
    'divider',
    'footer',
  ]);
  const sanitized = blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return null;
      const record = block as Record<string, unknown>;
      const type = record.type;
      if (typeof type !== 'string' || !validTypes.has(type)) return null;
      const id = typeof record.id === 'string' ? record.id : '';
      if (!id) return null;
      switch (type) {
        case 'heading': {
          const level =
            typeof record.level === 'number' &&
            [1, 2, 3].includes(record.level)
              ? (record.level as 1 | 2 | 3)
              : 2;
          const text = typeof record.text === 'string' ? record.text : '';
          const align =
            record.align === 'center' || record.align === 'right'
              ? record.align
              : 'left';
          return { id, type, level, text, align } satisfies ReviewEmailBlock;
        }
        case 'text': {
          const text = typeof record.text === 'string' ? record.text : '';
          const align =
            record.align === 'center' || record.align === 'right'
              ? record.align
              : 'left';
          return { id, type, text, align } satisfies ReviewEmailBlock;
        }
        case 'cta': {
          const label = typeof record.label === 'string' ? record.label : '';
          const url = typeof record.url === 'string' ? record.url : '';
          return { id, type, label, url } satisfies ReviewEmailBlock;
        }
        case 'productCards': {
          const mode = record.mode === 'all' ? 'all' : 'single';
          return { id, type, mode } satisfies ReviewEmailBlock;
        }
        case 'divider': {
          return { id, type } satisfies ReviewEmailBlock;
        }
        case 'footer': {
          const text = typeof record.text === 'string' ? record.text : '';
          return { id, type, text } satisfies ReviewEmailBlock;
        }
        default:
          return null;
      }
    })
    .filter(Boolean) as ReviewEmailBlock[];
  return sanitized.length > 0 ? sanitized : defaultReviewEmailBlocks;
}

function coerceSettings(payload: Partial<ReviewEmailSettings>): ReviewEmailSettings {
  const delayDays = Number.isFinite(payload.delayDays)
    ? Math.max(0, Math.min(365, Number(payload.delayDays)))
    : defaultReviewEmailSettings.delayDays;
  const blocks = normalizeBlocks(payload.blocks);
  return {
    enabled: payload.enabled ?? defaultReviewEmailSettings.enabled,
    delayDays,
    subjectTemplate: payload.subjectTemplate || defaultReviewEmailSettings.subjectTemplate,
    blocks,
    fromName: payload.fromName || defaultReviewEmailSettings.fromName,
    fromEmail: payload.fromEmail || defaultReviewEmailSettings.fromEmail,
    brandPrimary: payload.brandPrimary || defaultReviewEmailSettings.brandPrimary,
    brandDark: payload.brandDark || defaultReviewEmailSettings.brandDark,
    headerBackground: payload.headerBackground || defaultReviewEmailSettings.headerBackground,
    linkColor: payload.linkColor || defaultReviewEmailSettings.linkColor,
    logoUrl: payload.logoUrl || null,
  };
}

export async function GET() {
  try {
    const settings = await getReviewEmailSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch review email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review email settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<ReviewEmailSettings>;
    const nextSettings = coerceSettings(payload);
    const saved = await upsertReviewEmailSettings(nextSettings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error('Failed to update review email settings:', error);
    return NextResponse.json(
      { error: 'Failed to update review email settings' },
      { status: 500 }
    );
  }
}
