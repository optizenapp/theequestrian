import { NextResponse } from 'next/server';
import { processAutoCampaignResends } from '@/lib/email-platform/auto-campaigns/resend-non-openers';

export async function POST() {
  try {
    const result = await processAutoCampaignResends();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[auto-campaigns run-resend]', error);
    return NextResponse.json(
      { error: 'Resend worker failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
