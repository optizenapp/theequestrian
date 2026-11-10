import { NextRequest, NextResponse } from 'next/server';
import { runRewardsCatchUp } from '@/lib/rewards/catch-up';

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
    const result = await runRewardsCatchUp();
    console.log('[cron:rewards-reconcile] Complete', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron:rewards-reconcile] Failed', error);
    return NextResponse.json({ ok: false, error: 'Rewards catch-up failed' }, { status: 500 });
  }
}
