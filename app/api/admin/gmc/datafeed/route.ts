import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { ensureGmcDatafeed } from '@/lib/gmc/content';

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ensureGmcDatafeed();
  return NextResponse.json(result);
}
