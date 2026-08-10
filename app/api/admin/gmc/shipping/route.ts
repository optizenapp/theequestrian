import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { syncGmcShippingSettings } from '@/lib/gmc/shipping';

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncGmcShippingSettings();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync shipping settings' },
      { status: 500 }
    );
  }
}
