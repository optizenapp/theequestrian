import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getGmcIntegration, saveGmcIntegration } from '@/lib/db/gmc';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const integration = await getGmcIntegration();
  return NextResponse.json({ merchantId: integration?.merchant_id ?? null });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const merchantId = typeof body.merchantId === 'string' ? body.merchantId.trim() : '';
  if (!merchantId) {
    return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
  }

  await saveGmcIntegration({ merchantId });
  return NextResponse.json({ merchantId });
}
