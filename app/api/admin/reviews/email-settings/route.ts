import { NextRequest, NextResponse } from 'next/server';
import {
  defaultReviewEmailSettings,
  getReviewEmailSettings,
  upsertReviewEmailSettings,
  type ReviewEmailSettings,
} from '@/lib/reviews/email-settings';

function coerceSettings(payload: Partial<ReviewEmailSettings>): ReviewEmailSettings {
  const delayDays = Number.isFinite(payload.delayDays)
    ? Math.max(0, Math.min(365, Number(payload.delayDays)))
    : defaultReviewEmailSettings.delayDays;
  return {
    enabled: payload.enabled ?? defaultReviewEmailSettings.enabled,
    delayDays,
    subjectTemplate: payload.subjectTemplate || defaultReviewEmailSettings.subjectTemplate,
    htmlTemplate: payload.htmlTemplate || defaultReviewEmailSettings.htmlTemplate,
    fromName: payload.fromName || defaultReviewEmailSettings.fromName,
    fromEmail: payload.fromEmail || defaultReviewEmailSettings.fromEmail,
    brandPrimary: payload.brandPrimary || defaultReviewEmailSettings.brandPrimary,
    brandDark: payload.brandDark || defaultReviewEmailSettings.brandDark,
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
