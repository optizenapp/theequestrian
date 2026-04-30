import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { getSocialCredential } from '@/lib/social/credentials';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const credential = await getSocialCredential('youtube');
    if (!credential) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      accountLabel: credential.accountLabel,
      channelId: credential.externalAccountId,
      expiresAt: credential.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load YouTube status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
