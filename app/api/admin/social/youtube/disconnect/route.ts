import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { deleteSocialCredential } from '@/lib/social/credentials';

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await deleteSocialCredential('youtube');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect YouTube';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
