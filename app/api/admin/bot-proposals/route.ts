import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { listProposals } from '@/lib/bot-proposals/db';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(['pending', 'applied', 'approved', 'rejected', 'failed', 'reverted', 'all']);

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const status = request.nextUrl.searchParams.get('status') ?? 'pending';
  const bot = request.nextUrl.searchParams.get('bot') ?? 'seo';
  if (!STATUSES.has(status) || !/^[a-z_]{1,20}$/.test(bot)) {
    return NextResponse.json({ error: 'Invalid filter' }, { status: 400 });
  }
  try {
    return NextResponse.json({ proposals: await listProposals(status, bot) });
  } catch (error) {
    console.error('[bot-proposals] list failed:', error);
    return NextResponse.json({ error: 'Failed to load proposals' }, { status: 500 });
  }
}
