import { NextRequest, NextResponse } from 'next/server';
import { runRewardsCatchUp } from '@/lib/rewards/catch-up';
import { runCreditCatchUp } from '@/lib/rewards/credit-catch-up';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) {
    console.error('[cron:rewards-reconcile] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (token !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runRewardsCatchUp(50, 180_000);
    const credit = await runCreditCatchUp();
    console.log('[cron:rewards-reconcile] Complete', { ...result, credit });
    return NextResponse.json({ ok: true, ...result, credit });
  } catch (error) {
    console.error('[cron:rewards-reconcile] Failed', error);
    return NextResponse.json({ ok: false, error: 'Rewards catch-up failed' }, { status: 500 });
  }
}
