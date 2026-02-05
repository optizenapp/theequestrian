import { NextResponse } from 'next/server';
import { getReviewEmailSettings, upsertReviewEmailSettings } from '@/lib/reviews/email-settings';
import { defaultReviewEmailBlocks } from '@/lib/reviews/email-types';

export async function POST() {
  try {
    const currentSettings = await getReviewEmailSettings();
    const updated = await upsertReviewEmailSettings({
      ...currentSettings,
      blocks: defaultReviewEmailBlocks,
    });
    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Failed to reset blocks:', error);
    return NextResponse.json({ error: 'Failed to reset blocks' }, { status: 500 });
  }
}
