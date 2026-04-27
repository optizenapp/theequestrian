import { NextRequest, NextResponse } from 'next/server';
import { releaseDueScheduledCampaigns } from '@/lib/email-platform/scheduled-release';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const windowHours =
      typeof body?.windowHours === 'number' && Number.isFinite(body.windowHours)
        ? Math.floor(body.windowHours)
        : 48;
    const released = await releaseDueScheduledCampaigns({ windowHours });
    return NextResponse.json({ ok: true, released: released.length, campaigns: released });
  } catch (error) {
    console.error('[auto-campaigns run-release]', error);
    return NextResponse.json(
      { error: 'Release failed', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
