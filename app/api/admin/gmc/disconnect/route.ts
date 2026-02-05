import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { clearGmcIntegration } from '@/lib/db/gmc';

export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearGmcIntegration();
  return NextResponse.json({ status: 'disconnected' });
}
