import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { deleteSocialCredential, getSocialCredential } from '@/lib/social/credentials';

type InstagramMetadata = {
  linkedPageId?: string | null;
};

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const instagram = await getSocialCredential('instagram');
    const metadata = (instagram?.metadata ?? {}) as InstagramMetadata;
    if (metadata?.linkedPageId) {
      await deleteSocialCredential('instagram');
    }
    await deleteSocialCredential('facebook');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect Facebook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
